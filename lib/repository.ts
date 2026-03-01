import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { OFFICIAL_CET_URL, builtinResourceConfig, externalResourceConfig, isSupabaseReady } from "@/lib/config";
import { buildDailyTasks } from "@/lib/daily-plan";
import { getBeijingDateString, phaseByDate } from "@/lib/date";
import { zhCN } from "@/lib/i18n/zh-CN";
import { mockStore } from "@/lib/mock-store";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  BaselineScore,
  BuiltinImportResultItem,
  DailyTask,
  GameProfile,
  ReminderPreference,
  ResourceItem,
  TaskReward,
  TaskTodayResponse,
  UploadRecord,
  VocabProvenance
} from "@/lib/types";
import { extractCandidatesFromText, extractTextFromFile } from "@/lib/vocab-extractor";

const defaultBaseline: BaselineScore = {
  total: 339,
  listening: 103,
  reading: 149,
  writingTranslation: 87
};

function mapTaskRow(row: Record<string, unknown>): DailyTask {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    taskDate: String(row.task_date),
    taskType: row.task_type as DailyTask["taskType"],
    title: String(row.title),
    description: String(row.description),
    estimatedMinutes: Number(row.estimated_minutes),
    completed: Boolean(row.completed),
    phaseCode: row.phase_code as DailyTask["phaseCode"],
    createdAt: String(row.created_at ?? ""),
    completedAt: (row.completed_at as string | null) ?? null
  };
}

function todayStr(input?: string) {
  return input ?? getBeijingDateString();
}

function previousDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isBossDay(date: string) {
  return new Date(`${date}T00:00:00`).getDay() === 6;
}

function computeBonusRate(streakDays: number) {
  return Math.min(streakDays * 0.1, 0.3);
}

function gainLevel(level: number, exp: number) {
  let nextLevel = level;
  let levelUp = false;
  while (exp >= nextLevel * 100) {
    nextLevel += 1;
    levelUp = true;
  }
  return {
    level: nextLevel,
    levelUp
  };
}

function toTaskReward(input: {
  exp: number;
  coins: number;
  levelUp: boolean;
  level: number;
  streakDays: number;
  bonusRate: number;
  note: string;
}): TaskReward {
  return {
    exp: input.exp,
    coins: input.coins,
    levelUp: input.levelUp,
    level: input.level,
    streakDays: input.streakDays,
    bonusRate: input.bonusRate,
    note: input.note
  };
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function shouldUseMockFallback(error: unknown) {
  const message = String(error ?? "");
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("fetch failed")
  );
}

async function readBuiltinPdf(fileName: string) {
  const primaryPath = path.join(process.cwd(), "public", "resources", fileName);
  try {
    return await fs.readFile(primaryPath);
  } catch {
    return await fs.readFile(path.join(process.cwd(), fileName));
  }
}

export async function ensureUserMeta(userId: string) {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      target_score: 500,
      prep_start_date: "2026-03-01",
      prep_end_date: "2026-12-11"
    },
    {
      onConflict: "id"
    }
  );
  if (error) {
    throw new Error(`写入 users 失败: ${error.message}`);
  }
}

export async function getBaselineScore(userId: string): Promise<BaselineScore> {
  if (!isSupabaseReady()) {
    return mockStore.getBaselineScore(userId);
  }
  try {
    await ensureUserMeta(userId);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("scores_baseline")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`查询 baseline 失败: ${error.message}`);
    }
    if (!data) {
      const initial = {
        user_id: userId,
        total_score: defaultBaseline.total,
        listening_score: defaultBaseline.listening,
        reading_score: defaultBaseline.reading,
        writing_translation_score: defaultBaseline.writingTranslation
      };
      const { error: insertError } = await supabase.from("scores_baseline").insert(initial);
      if (insertError) {
        throw new Error(`创建 baseline 失败: ${insertError.message}`);
      }
      return defaultBaseline;
    }
    return {
      total: Number(data.total_score),
      listening: Number(data.listening_score),
      reading: Number(data.reading_score),
      writingTranslation: Number(data.writing_translation_score)
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getBaselineScore(userId);
    }
    throw error;
  }
}

async function getOrCreateGameProfileCore(userId: string) {
  if (!isSupabaseReady()) {
    const profile = mockStore.getGameProfile(userId);
    return {
      userId,
      level: profile.level,
      exp: profile.exp,
      coins: profile.coins,
      streakDays: profile.streakDays,
      lastActiveDate: profile.lastActiveDate
    };
  }
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`读取 game_profiles 失败: ${error.message}`);
  }
  if (data) {
    return {
      userId,
      level: Number(data.level),
      exp: Number(data.exp),
      coins: Number(data.coins),
      streakDays: Number(data.streak_days),
      lastActiveDate: (data.last_active_date as string | null) ?? null
    };
  }

  const initial = {
    id: randomUUID(),
    user_id: userId,
    level: 1,
    exp: 0,
    coins: 0,
    streak_days: 0,
    last_active_date: null
  };
  const { error: insertError } = await supabase.from("game_profiles").insert(initial);
  if (insertError) {
    throw new Error(`创建 game_profiles 失败: ${insertError.message}`);
  }
  return {
    userId,
    level: 1,
    exp: 0,
    coins: 0,
    streakDays: 0,
    lastActiveDate: null
  };
}

async function saveGameProfileCore(userId: string, profile: {
  level: number;
  exp: number;
  coins: number;
  streakDays: number;
  lastActiveDate: string | null;
}) {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("game_profiles")
    .update({
      level: profile.level,
      exp: profile.exp,
      coins: profile.coins,
      streak_days: profile.streakDays,
      last_active_date: profile.lastActiveDate,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);
  if (error) {
    throw new Error(`更新 game_profiles 失败: ${error.message}`);
  }
}

async function getOrCreateDailyLog(userId: string, date: string) {
  if (!isSupabaseReady()) {
    const profile = mockStore.getGameProfile(userId, date);
    return {
      id: `${userId}:${date}`,
      userId,
      date,
      expGained: profile.todayExp,
      coinsGained: profile.todayCoins,
      tasksCompleted: (mockStore.getTodayTasks(userId, date).tasks.filter((task) => task.completed)).length,
      bossDefeated: profile.bossState.defeated
    };
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("game_daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();
  if (error) {
    throw new Error(`读取 game_daily_logs 失败: ${error.message}`);
  }
  if (data) {
    return {
      id: String(data.id),
      userId,
      date,
      expGained: Number(data.exp_gained),
      coinsGained: Number(data.coins_gained),
      tasksCompleted: Number(data.tasks_completed),
      bossDefeated: Boolean(data.boss_defeated)
    };
  }

  const insertRow = {
    id: randomUUID(),
    user_id: userId,
    log_date: date,
    exp_gained: 0,
    coins_gained: 0,
    tasks_completed: 0,
    boss_defeated: false
  };
  const { error: insertError } = await supabase.from("game_daily_logs").insert(insertRow);
  if (insertError) {
    throw new Error(`创建 game_daily_logs 失败: ${insertError.message}`);
  }
  return {
    id: insertRow.id,
    userId,
    date,
    expGained: 0,
    coinsGained: 0,
    tasksCompleted: 0,
    bossDefeated: false
  };
}

async function saveDailyLog(log: {
  id: string;
  expGained: number;
  coinsGained: number;
  tasksCompleted: number;
  bossDefeated: boolean;
}) {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("game_daily_logs")
    .update({
      exp_gained: log.expGained,
      coins_gained: log.coinsGained,
      tasks_completed: log.tasksCompleted,
      boss_defeated: log.bossDefeated,
      updated_at: new Date().toISOString()
    })
    .eq("id", log.id);
  if (error) {
    throw new Error(`更新 game_daily_logs 失败: ${error.message}`);
  }
}

export async function getOrCreateTodayTasks(userId: string, date = getBeijingDateString()): Promise<TaskTodayResponse> {
  if (!isSupabaseReady()) {
    return mockStore.getTodayTasks(userId, date);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const baseline = await getBaselineScore(userId);

    const { data: existing, error: queryError } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("task_date", date)
      .order("created_at", { ascending: true });

    if (queryError) {
      throw new Error(`读取今日任务失败: ${queryError.message}`);
    }

    let tasks = (existing ?? []).map(mapTaskRow);
    if (tasks.length === 0) {
      const generated = buildDailyTasks({
        userId,
        taskDate: date,
        baseline
      });
      const insertRows = generated.map((task) => ({
        id: task.id,
        user_id: userId,
        task_date: date,
        task_type: task.taskType,
        title: task.title,
        description: task.description,
        estimated_minutes: task.estimatedMinutes,
        completed: false,
        phase_code: task.phaseCode
      }));
      const { data: inserted, error: insertError } = await supabase
        .from("daily_tasks")
        .insert(insertRows)
        .select("*");
      if (insertError) {
        throw new Error(`写入今日任务失败: ${insertError.message}`);
      }
      tasks = (inserted ?? []).map(mapTaskRow);
    }

    const profile = await getOrCreateGameProfileCore(userId);
    return {
      date,
      phaseCode: tasks[0]?.phaseCode ?? phaseByDate(date),
      totalEstimatedMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      streakDays: profile.streakDays,
      tasks
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getTodayTasks(userId, date);
    }
    throw error;
  }
}

export async function completeTask(userId: string, taskId: string, date = getBeijingDateString()): Promise<{ task: DailyTask; reward: TaskReward } | null> {
  if (!isSupabaseReady()) {
    return mockStore.completeTask(userId, taskId, date);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data: taskData, error: queryError } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (queryError) {
      throw new Error(`读取任务失败: ${queryError.message}`);
    }
    if (!taskData) {
      return null;
    }

    const taskDate = String(taskData.task_date);
    const alreadyCompleted = Boolean(taskData.completed);
    const task = mapTaskRow(taskData as Record<string, unknown>);
    const profile = await getOrCreateGameProfileCore(userId);

    if (alreadyCompleted) {
      return {
        task,
        reward: toTaskReward({
          exp: 0,
          coins: 0,
          levelUp: false,
          level: profile.level,
          streakDays: profile.streakDays,
          bonusRate: computeBonusRate(profile.streakDays),
          note: zhCN.game.alreadyDone
        })
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from("daily_tasks")
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (updateError) {
      throw new Error(`更新任务状态失败: ${updateError.message}`);
    }
    const updatedTask = mapTaskRow(updated as Record<string, unknown>);

    const bonusRate = computeBonusRate(profile.streakDays);
    const exp = Math.round(25 * (1 + bonusRate));
    const coins = 10;

    profile.exp += exp;
    profile.coins += coins;

    const dailyLog = await getOrCreateDailyLog(userId, taskDate);
    dailyLog.expGained += exp;
    dailyLog.coinsGained += coins;
    dailyLog.tasksCompleted += 1;

    let note: string = zhCN.game.rewardNote;

    const { data: taskRows, error: rowsError } = await supabase
      .from("daily_tasks")
      .select("completed")
      .eq("user_id", userId)
      .eq("task_date", taskDate);
    if (rowsError) {
      throw new Error(`读取任务完成情况失败: ${rowsError.message}`);
    }
    const allCompleted = (taskRows ?? []).length > 0 && (taskRows ?? []).every((row) => Boolean(row.completed));

    if (allCompleted) {
      if (profile.lastActiveDate === previousDate(taskDate)) {
        profile.streakDays += 1;
      } else if (profile.lastActiveDate !== taskDate) {
        profile.streakDays = 1;
      }
      profile.lastActiveDate = taskDate;

      if (isBossDay(taskDate) && !dailyLog.bossDefeated) {
        profile.exp += 80;
        dailyLog.expGained += 80;
        dailyLog.bossDefeated = true;
        note = zhCN.game.bossVictoryNote;
      }
    }

    const levelCalc = gainLevel(profile.level, profile.exp);
    profile.level = levelCalc.level;

    await saveGameProfileCore(userId, profile);
    await saveDailyLog(dailyLog);

    return {
      task: updatedTask,
      reward: toTaskReward({
        exp,
        coins,
        levelUp: levelCalc.levelUp,
        level: profile.level,
        streakDays: profile.streakDays,
        bonusRate,
        note
      })
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.completeTask(userId, taskId, date);
    }
    throw error;
  }
}

export async function getGameProfile(userId: string, date = getBeijingDateString()): Promise<GameProfile> {
  if (!isSupabaseReady()) {
    return mockStore.getGameProfile(userId, date);
  }
  try {
    const profile = await getOrCreateGameProfileCore(userId);
    const dailyLog = await getOrCreateDailyLog(userId, date);
    const taskData = await getOrCreateTodayTasks(userId, date);
    const remaining = taskData.tasks.filter((task) => !task.completed).length;

    return {
      userId,
      level: profile.level,
      exp: profile.exp,
      coins: profile.coins,
      streakDays: profile.streakDays,
      todayExp: dailyLog.expGained,
      todayCoins: dailyLog.coinsGained,
      lastActiveDate: profile.lastActiveDate,
      bossState: {
        isBossDay: isBossDay(date),
        bossName: zhCN.game.bossName,
        hp: isBossDay(date) ? Math.max(0, remaining * 25) : 100,
        maxHp: 100,
        defeated: isBossDay(date) ? dailyLog.bossDefeated : false,
        checklist: [...zhCN.game.bossChecklist],
        rewardExp: 80
      }
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getGameProfile(userId, date);
    }
    throw error;
  }
}

export async function getVocabToday(limit = 12) {
  if (!isSupabaseReady()) {
    return mockStore.getVocabToday().slice(0, limit);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("vocab_entries")
      .select("*, vocab_provenance(*)")
      .eq("is_verified", true)
      .order("frequency_in_papers", { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(`查询词汇失败: ${error.message}`);
    }
    return data ?? [];
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getVocabToday().slice(0, limit);
    }
    throw error;
  }
}

export async function getVocabProvenance(vocabId: string): Promise<VocabProvenance[]> {
  if (!isSupabaseReady()) {
    return mockStore.getVocabProvenance(vocabId);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("vocab_provenance")
      .select("*")
      .eq("vocab_entry_id", vocabId)
      .order("exam_year", { ascending: false });
    if (error) {
      throw new Error(`查询出处失败: ${error.message}`);
    }
    return (data ?? []).map((row) => ({
      id: String(row.id),
      vocabEntryId: String(row.vocab_entry_id),
      examYear: Number(row.exam_year),
      examMonth: Number(row.exam_month) as 6 | 12,
      paperCode: String(row.paper_code),
      questionType: String(row.question_type),
      sourceUrl: String(row.source_url),
      sourceSnippet: String(row.source_snippet),
      sourceFile: (row.source_file as string | null) ?? null,
      createdAt: String(row.created_at ?? "")
    }));
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getVocabProvenance(vocabId);
    }
    throw error;
  }
}

export async function getOrCreateReminderPreference(userId: string): Promise<ReminderPreference> {
  if (!isSupabaseReady()) {
    return mockStore.getReminderPreference(userId);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("reminder_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`读取提醒偏好失败: ${error.message}`);
    }
    if (data) {
      return {
        id: String(data.id),
        userId: String(data.user_id),
        emailEnabled: Boolean(data.email_enabled),
        pushEnabled: Boolean(data.push_enabled),
        reminderTimes: (data.reminder_times as string[]) ?? ["12:00", "21:40"],
        timezone: String(data.timezone ?? "Asia/Shanghai"),
        createdAt: String(data.created_at ?? ""),
        updatedAt: String(data.updated_at ?? "")
      };
    }
    const createdId = randomUUID();
    const insertRow = {
      id: createdId,
      user_id: userId,
      email_enabled: true,
      push_enabled: true,
      reminder_times: ["12:00", "21:40"],
      timezone: "Asia/Shanghai"
    };
    const { error: insertError } = await supabase.from("reminder_preferences").insert(insertRow);
    if (insertError) {
      throw new Error(`创建提醒偏好失败: ${insertError.message}`);
    }
    return {
      id: createdId,
      userId,
      emailEnabled: true,
      pushEnabled: true,
      reminderTimes: ["12:00", "21:40"],
      timezone: "Asia/Shanghai"
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getReminderPreference(userId);
    }
    throw error;
  }
}

export async function updateReminderPreference(
  userId: string,
  patch: Pick<ReminderPreference, "emailEnabled" | "pushEnabled" | "reminderTimes" | "timezone">
) {
  if (!isSupabaseReady()) {
    return mockStore.setReminderPreference(userId, patch);
  }
  try {
    const supabase = getSupabaseServiceClient();
    const existing = await getOrCreateReminderPreference(userId);
    const { data, error } = await supabase
      .from("reminder_preferences")
      .update({
        email_enabled: patch.emailEnabled,
        push_enabled: patch.pushEnabled,
        reminder_times: patch.reminderTimes,
        timezone: patch.timezone,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      throw new Error(`更新提醒偏好失败: ${error.message}`);
    }
    return {
      id: String(data.id),
      userId: String(data.user_id),
      emailEnabled: Boolean(data.email_enabled),
      pushEnabled: Boolean(data.push_enabled),
      reminderTimes: (data.reminder_times as string[]) ?? [],
      timezone: String(data.timezone),
      createdAt: String(data.created_at ?? ""),
      updatedAt: String(data.updated_at ?? "")
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.setReminderPreference(userId, patch);
    }
    throw error;
  }
}

export async function savePushSubscription(userId: string, subscription: Record<string, unknown>) {
  if (!isSupabaseReady()) {
    return mockStore.savePushSubscription(userId, subscription);
  }
  const supabase = getSupabaseServiceClient();
  const endpoint = String(subscription.endpoint ?? "");
  if (!endpoint) {
    throw new Error("Push endpoint 为空。");
  }
  const keys = (subscription.keys as Record<string, string> | undefined) ?? {};
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      id: randomUUID(),
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh ?? "",
      auth: keys.auth ?? "",
      raw_subscription: subscription
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    throw new Error(`保存推送订阅失败: ${error.message}`);
  }
  return true;
}

export async function getPushSubscriptions(userId: string) {
  if (!isSupabaseReady()) {
    return mockStore.getPushSubscriptions(userId);
  }
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("raw_subscription")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`查询推送订阅失败: ${error.message}`);
  }
  return (data ?? []).map((item) => item.raw_subscription as Record<string, unknown>);
}

async function ensureBuiltinResourcesInDb() {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const rows = builtinResourceConfig.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    file_name: item.fileName,
    public_path: item.href,
    source_url: null,
    is_active: true
  }));
  const { error } = await supabase.from("builtin_resources").upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`同步 builtin_resources 失败: ${error.message}`);
  }
}

export async function listResources(): Promise<ResourceItem[]> {
  const official: ResourceItem = {
    id: "official-cet-neea",
    title: zhCN.ui.officialSite,
    description: "官方考试资讯与报名信息入口。",
    type: "official_link",
    href: OFFICIAL_CET_URL,
    sourceLabel: "官方站点"
  };
  const externals: ResourceItem[] = externalResourceConfig.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    href: item.href,
    sourceLabel: item.sourceLabel
  }));
  const builtinFallback: ResourceItem[] = builtinResourceConfig.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: "builtin_pdf",
    href: item.href,
    sourceLabel: item.sourceLabel,
    fileName: item.fileName
  }));

  if (!isSupabaseReady()) {
    return [official, ...externals, ...builtinFallback];
  }

  try {
    await ensureBuiltinResourcesInDb();
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("builtin_resources")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error(`读取 builtin_resources 失败: ${error.message}`);
    }

    const builtins: ResourceItem[] = (data ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description ?? ""),
      type: "builtin_pdf",
      href: String(row.public_path),
      sourceLabel: "你提供的资料",
      fileName: String(row.file_name)
    }));

    return [official, ...externals, ...builtins];
  } catch {
    return [official, ...externals, ...builtinFallback];
  }
}

export async function saveUpload(payload: {
  userId: string;
  fileName: string;
  filePath: string;
  contentText: string;
  sourceFile?: string | null;
  fileHash?: string | null;
}): Promise<UploadRecord> {
  if (!isSupabaseReady()) {
    return mockStore.saveUpload(payload);
  }
  const supabase = getSupabaseServiceClient();
  const id = randomUUID();
  const row = {
    id,
    user_id: payload.userId,
    file_name: payload.fileName,
    file_path: payload.filePath,
    uploaded_at: new Date().toISOString(),
    parse_status: "uploaded",
    content_text: payload.contentText,
    source_file: payload.sourceFile ?? null,
    file_hash: payload.fileHash ?? null
  };
  const { error } = await supabase.from("source_uploads").insert(row);
  if (error) {
    throw new Error(`保存上传记录失败: ${error.message}`);
  }
  return {
    id,
    userId: payload.userId,
    fileName: payload.fileName,
    filePath: payload.filePath,
    uploadedAt: row.uploaded_at,
    status: "uploaded",
    contentText: payload.contentText,
    sourceFile: payload.sourceFile ?? null,
    fileHash: payload.fileHash ?? null
  };
}

export async function findUploadBySourceHash(userId: string, sourceFile: string, fileHash: string) {
  if (!isSupabaseReady()) {
    return mockStore.findUploadBySourceHash(userId, sourceFile, fileHash);
  }
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("source_uploads")
    .select("*")
    .eq("user_id", userId)
    .eq("source_file", sourceFile)
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (error) {
    throw new Error(`查询上传去重记录失败: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    id: String(data.id),
    userId: String(data.user_id),
    fileName: String(data.file_name),
    filePath: String(data.file_path),
    uploadedAt: String(data.uploaded_at),
    status: String(data.parse_status) as UploadRecord["status"],
    contentText: String(data.content_text ?? ""),
    sourceFile: (data.source_file as string | null) ?? null,
    fileHash: (data.file_hash as string | null) ?? null
  };
}

export async function getUploadById(uploadId: string) {
  if (!isSupabaseReady()) {
    return mockStore.getUploadById(uploadId);
  }
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("source_uploads")
    .select("*")
    .eq("id", uploadId)
    .maybeSingle();
  if (error) {
    throw new Error(`查询上传记录失败: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    id: String(data.id),
    userId: String(data.user_id),
    fileName: String(data.file_name),
    filePath: String(data.file_path),
    uploadedAt: String(data.uploaded_at),
    status: String(data.parse_status),
    contentText: String(data.content_text ?? ""),
    sourceFile: (data.source_file as string | null) ?? null,
    fileHash: (data.file_hash as string | null) ?? null
  };
}

export async function markUploadParsed(uploadId: string) {
  if (!isSupabaseReady()) {
    mockStore.markUploadParsed(uploadId);
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("source_uploads")
    .update({ parse_status: "parsed", parsed_at: new Date().toISOString() })
    .eq("id", uploadId);
  if (error) {
    throw new Error(`更新上传状态失败: ${error.message}`);
  }
}

export async function saveCandidates(
  uploadId: string,
  userId: string,
  candidates: Array<{ lemma: string; frequency: number; contextSnippet: string }>
) {
  if (!isSupabaseReady()) {
    return mockStore.saveCandidates(uploadId, userId, candidates);
  }
  const supabase = getSupabaseServiceClient();
  const rows = candidates.map((item) => ({
    id: randomUUID(),
    upload_id: uploadId,
    user_id: userId,
    lemma: item.lemma,
    frequency: item.frequency,
    context_snippet: item.contextSnippet,
    review_status: "pending"
  }));
  const { error } = await supabase.from("source_extracted_candidates").insert(rows);
  if (error) {
    throw new Error(`保存候选词失败: ${error.message}`);
  }
  const { data, error: readError } = await supabase
    .from("source_extracted_candidates")
    .select("*")
    .eq("upload_id", uploadId)
    .order("frequency", { ascending: false });
  if (readError) {
    throw new Error(`读取候选词失败: ${readError.message}`);
  }
  return data ?? [];
}

async function countCandidates(uploadId: string) {
  if (!isSupabaseReady()) {
    return mockStore.getCandidates(uploadId).length;
  }
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("source_extracted_candidates")
    .select("*", { count: "exact", head: true })
    .eq("upload_id", uploadId);
  if (error) {
    throw new Error(`统计候选词失败: ${error.message}`);
  }
  return count ?? 0;
}

export async function importBuiltinResources(userId: string, resourceIds?: string[]) {
  const resources = builtinResourceConfig.filter((item) =>
    Array.isArray(resourceIds) && resourceIds.length > 0 ? resourceIds.includes(item.id) : true
  );
  const results: BuiltinImportResultItem[] = [];

  for (const resource of resources) {
    const buffer = await readBuiltinPdf(resource.fileName);
    const fileHash = hashBuffer(buffer);
    const dedupe = await findUploadBySourceHash(userId, resource.fileName, fileHash);

    if (dedupe) {
      results.push({
        resourceId: resource.id,
        fileName: resource.fileName,
        uploadId: dedupe.id,
        candidateCount: await countCandidates(dedupe.id),
        status: "skipped",
        reason: "已导入过同版本资料"
      });
      continue;
    }

    const text = await extractTextFromFile(resource.fileName, buffer);
    let filePath = `builtin://${resource.fileName}`;

    if (isSupabaseReady()) {
      const supabase = getSupabaseServiceClient();
      filePath = `${userId}/builtin/${Date.now()}-${resource.fileName}`;
      const { error } = await supabase.storage
        .from("paper-uploads")
        .upload(filePath, buffer, {
          contentType: "application/pdf",
          upsert: false
        });
      if (error) {
        throw new Error(`上传内置资料失败: ${error.message}`);
      }
    }

    const upload = await saveUpload({
      userId,
      fileName: resource.fileName,
      filePath,
      contentText: text,
      sourceFile: resource.fileName,
      fileHash
    });

    const candidates = extractCandidatesFromText(text);
    const saved = await saveCandidates(upload.id, userId, candidates);
    await markUploadParsed(upload.id);

    results.push({
      resourceId: resource.id,
      fileName: resource.fileName,
      uploadId: upload.id,
      candidateCount: saved.length,
      status: "imported"
    });
  }

  const importedCount = results.filter((item) => item.status === "imported").length;
  const skippedCount = results.filter((item) => item.status === "skipped").length;
  const totalCandidates = results.reduce((sum, item) => sum + item.candidateCount, 0);

  return {
    items: results,
    importedCount,
    skippedCount,
    totalCandidates
  };
}

export async function listReminderUsers() {
  if (!isSupabaseReady()) {
    return [
      {
        userId: "demo-user",
        email: "demo@example.com",
        targetScore: 500
      }
    ];
  }
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("users").select("id, email, target_score");
  if (error) {
    throw new Error(`读取提醒用户失败: ${error.message}`);
  }
  return (data ?? [])
    .filter((row) => typeof row.email === "string" && row.email.length > 0)
    .map((row) => ({
      userId: String(row.id),
      email: String(row.email),
      targetScore: Number(row.target_score ?? 500)
    }));
}

// ============================================================
// 题库系统 (Question Bank + Spaced Repetition)
// ============================================================

import seedQuestions from "@/data/seed-questions.json";
import type { QuestionBankItem } from "@/lib/types";

type SeedQuestion = {
  id: string;
  taskType: string;
  content: Record<string, unknown>;
};

async function ensureQuestionBankSeeded() {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { count, error } = await supabase
    .from("question_bank")
    .select("id", { count: "exact", head: true });
  if (error) {
    return;
  }
  if ((count ?? 0) > 0) {
    return;
  }
  const rows = (seedQuestions as SeedQuestion[]).map((q) => ({
    id: q.id,
    task_type: q.taskType,
    content: q.content,
    difficulty: 1,
    is_active: true
  }));
  await supabase.from("question_bank").upsert(rows, { onConflict: "id" });
}

export async function getQuestionForBattle(
  userId: string,
  taskType: string
): Promise<QuestionBankItem | null> {
  if (!isSupabaseReady()) {
    return mockStore.getQuestion(taskType);
  }
  try {
    await ensureQuestionBankSeeded();
    const supabase = getSupabaseServiceClient();

    // 获取用户近 3 天内已答题的 ID 列表
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentProgress } = await supabase
      .from("user_question_progress")
      .select("question_id")
      .eq("user_id", userId)
      .gte("last_answered_at", threeDaysAgo.toISOString());
    const excludeIds = (recentProgress ?? []).map((r) => String(r.question_id));

    // 先取题型下所有激活题，再在内存做去重过滤，避免 in(...) 拼接导致的兼容性问题
    const { data: allCandidates, error: qError } = await supabase
      .from("question_bank")
      .select("*")
      .eq("task_type", taskType)
      .eq("is_active", true);
    if (qError) {
      throw new Error(`题库查询失败: ${qError.message}`);
    }

    const excludedSet = new Set(excludeIds);
    const candidates = (allCandidates ?? []).filter(
      (row) => !excludedSet.has(String(row.id))
    );

    let selected: Record<string, unknown> | null = null;
    if (candidates && candidates.length > 0) {
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // 所有题都答过了，回退到同题型题库中随机旧题
      if (allCandidates && allCandidates.length > 0) {
        selected = allCandidates[Math.floor(Math.random() * allCandidates.length)];
      }
    }

    if (!selected) {
      return mockStore.getQuestion(taskType);
    }

    return {
      id: String(selected.id),
      taskType: selected.task_type as QuestionBankItem["taskType"],
      content: selected.content as Record<string, unknown>,
      difficulty: Number(selected.difficulty ?? 1)
    };
  } catch (error) {
    if (shouldUseMockFallback(error)) {
      return mockStore.getQuestion(taskType);
    }
    throw error;
  }
}

export async function recordQuestionProgress(
  userId: string,
  questionId: string,
  isCorrect: boolean
) {
  if (!isSupabaseReady()) {
    return;
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data: existing } = await supabase
      .from("user_question_progress")
      .select("id, answered_count, correct_count")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_question_progress")
        .update({
          answered_count: Number(existing.answered_count) + 1,
          correct_count: Number(existing.correct_count) + (isCorrect ? 1 : 0),
          last_answered_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_question_progress").insert({
        user_id: userId,
        question_id: questionId,
        answered_count: 1,
        correct_count: isCorrect ? 1 : 0,
        last_answered_at: new Date().toISOString()
      });
    }
  } catch {
    // 进度记录失败不阻断主流程
  }
}
