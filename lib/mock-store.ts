import { randomUUID } from "node:crypto";

import seedVocab from "@/data/seed-vocab.json";
import { OFFICIAL_CET_URL, appConfig, builtinResourceConfig, externalResourceConfig } from "@/lib/config";
import { buildDailyTasks } from "@/lib/daily-plan";
import { getBeijingDateString } from "@/lib/date";
import { zhCN } from "@/lib/i18n/zh-CN";
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
  VocabEntry,
  VocabProvenance
} from "@/lib/types";

interface SeedVocabRecord {
  lemma: string;
  meaningZh: string;
  pos: string | null;
  phonetic: string | null;
  frequencyInPapers: number;
  verificationStatus: "public_source" | "user_uploaded" | "pending_review";
  isVerified: boolean;
  provenance: {
    examYear: number;
    examMonth: 6 | 12;
    paperCode: string;
    questionType: string;
    sourceUrl: string;
    sourceSnippet: string;
  };
}

type CandidateRecord = {
  id: string;
  uploadId: string;
  userId: string;
  lemma: string;
  frequency: number;
  contextSnippet: string;
  reviewStatus: "pending" | "approved" | "rejected";
};

type GameProfileCore = {
  userId: string;
  level: number;
  exp: number;
  coins: number;
  streakDays: number;
  lastActiveDate: string | null;
};

type DailyLog = {
  date: string;
  userId: string;
  expGained: number;
  coinsGained: number;
  tasksCompleted: number;
  bossDefeated: boolean;
};

const baseScore: BaselineScore = {
  total: 339,
  listening: 103,
  reading: 149,
  writingTranslation: 87
};

const taskStore = new Map<string, DailyTask[]>();
const reminderStore = new Map<string, ReminderPreference>();
const pushStore = new Map<string, Array<Record<string, unknown>>>();
const uploadStore: UploadRecord[] = [];
const candidateStore: CandidateRecord[] = [];
const vocabStore: VocabEntry[] = [];
const provenanceStore: VocabProvenance[] = [];
const gameProfileStore = new Map<string, GameProfileCore>();
const gameDailyLogStore = new Map<string, DailyLog>();

let initialized = false;

function mapTaskKey(userId: string, date: string) {
  return `${userId}:${date}`;
}

function mapDailyLogKey(userId: string, date: string) {
  return `${userId}:${date}`;
}

function previousDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isBossDay(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 6;
}

function ensureInitialized() {
  if (initialized) {
    return;
  }
  for (const item of seedVocab as SeedVocabRecord[]) {
    const vocabId = randomUUID();
    const provenanceId = randomUUID();
    vocabStore.push({
      id: vocabId,
      lemma: item.lemma,
      meaningZh: item.meaningZh,
      pos: item.pos,
      phonetic: item.phonetic,
      frequencyInPapers: item.frequencyInPapers,
      isVerified: item.isVerified,
      verificationStatus: item.verificationStatus,
      createdAt: new Date().toISOString()
    });
    provenanceStore.push({
      id: provenanceId,
      vocabEntryId: vocabId,
      examYear: item.provenance.examYear,
      examMonth: item.provenance.examMonth,
      paperCode: item.provenance.paperCode,
      questionType: item.provenance.questionType,
      sourceUrl: item.provenance.sourceUrl,
      sourceSnippet: item.provenance.sourceSnippet,
      sourceFile: null,
      createdAt: new Date().toISOString()
    });
  }
  initialized = true;
}

function ensureGameProfile(userId: string) {
  const existing = gameProfileStore.get(userId);
  if (existing) {
    return existing;
  }
  const created: GameProfileCore = {
    userId,
    level: 1,
    exp: 0,
    coins: 0,
    streakDays: 0,
    lastActiveDate: null
  };
  gameProfileStore.set(userId, created);
  return created;
}

function ensureDailyLog(userId: string, date: string) {
  const key = mapDailyLogKey(userId, date);
  const existing = gameDailyLogStore.get(key);
  if (existing) {
    return existing;
  }
  const created: DailyLog = {
    date,
    userId,
    expGained: 0,
    coinsGained: 0,
    tasksCompleted: 0,
    bossDefeated: false
  };
  gameDailyLogStore.set(key, created);
  return created;
}

function allTasksCompleted(userId: string, date: string) {
  const tasks = taskStore.get(mapTaskKey(userId, date)) ?? [];
  return tasks.length > 0 && tasks.every((task) => task.completed);
}

function computeBonusRate(streakDays: number) {
  return Math.min(streakDays * 0.1, 0.3);
}

function gainLevel(profile: GameProfileCore) {
  let levelUp = false;
  while (profile.exp >= profile.level * 100) {
    profile.level += 1;
    levelUp = true;
  }
  return levelUp;
}

function mapBossState(userId: string, date: string) {
  const boss = isBossDay(date);
  const log = ensureDailyLog(userId, date);
  const tasks = taskStore.get(mapTaskKey(userId, date)) ?? [];
  const remaining = tasks.filter((task) => !task.completed).length;
  const maxHp = 100;
  const hp = boss ? Math.max(0, remaining * 25) : maxHp;
  return {
    isBossDay: boss,
    bossName: zhCN.game.bossName,
    hp,
    maxHp,
    defeated: boss ? log.bossDefeated : false,
    checklist: [...zhCN.game.bossChecklist],
    rewardExp: 80
  };
}

export const mockStore = {
  getBaselineScore: (_userId: string) => baseScore,
  getReminderPreference: (userId: string): ReminderPreference => {
    const existing = reminderStore.get(userId);
    if (existing) {
      return existing;
    }
    const created: ReminderPreference = {
      id: randomUUID(),
      userId,
      emailEnabled: true,
      pushEnabled: true,
      reminderTimes: [...appConfig.reminder.times],
      timezone: appConfig.reminder.timezone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    reminderStore.set(userId, created);
    return created;
  },
  setReminderPreference: (userId: string, patch: Partial<ReminderPreference>) => {
    const current = mockStore.getReminderPreference(userId);
    const merged = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    reminderStore.set(userId, merged);
    return merged;
  },
  getTodayTasks: (userId: string, date = getBeijingDateString()): TaskTodayResponse => {
    ensureInitialized();
    const key = mapTaskKey(userId, date);
    let tasks = taskStore.get(key);
    if (!tasks) {
      tasks = buildDailyTasks({
        userId,
        taskDate: date,
        baseline: baseScore
      });
      taskStore.set(key, tasks);
    }
    const streakDays = ensureGameProfile(userId).streakDays;
    return {
      date,
      phaseCode: tasks[0].phaseCode,
      totalEstimatedMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      streakDays,
      tasks
    };
  },
  completeTask: (userId: string, taskId: string, date = getBeijingDateString()): { task: DailyTask; reward: TaskReward } | null => {
    let targetDate = date;
    let key = mapTaskKey(userId, targetDate);
    let tasks = taskStore.get(key) ?? [];
    if (tasks.length === 0) {
      tasks = buildDailyTasks({
        userId,
        taskDate: targetDate,
        baseline: baseScore
      });
      taskStore.set(key, tasks);
    }
    let task = tasks.find((item) => item.id === taskId);

    // 某些调用在日期边界会发生偏差，兜底按 userId 全量查找任务 ID。
    if (!task) {
      for (const [storeKey, storeTasks] of taskStore.entries()) {
        if (!storeKey.startsWith(`${userId}:`)) {
          continue;
        }
        const hit = storeTasks.find((item) => item.id === taskId);
        if (hit) {
          task = hit;
          tasks = storeTasks;
          key = storeKey;
          targetDate = storeKey.split(":")[1] ?? date;
          break;
        }
      }
    }

    if (!task) {
      return null;
    }
    if (task.completed) {
      const profile = ensureGameProfile(userId);
      return {
        task,
        reward: {
          exp: 0,
          coins: 0,
          levelUp: false,
          level: profile.level,
          streakDays: profile.streakDays,
          bonusRate: computeBonusRate(profile.streakDays),
          note: zhCN.game.alreadyDone
        }
      };
    }

    task.completed = true;
    task.completedAt = new Date().toISOString();

    const profile = ensureGameProfile(userId);
    const dailyLog = ensureDailyLog(userId, targetDate);

    const baseExp = 25;
    const baseCoins = 10;
    const bonusRate = computeBonusRate(profile.streakDays);
    const exp = Math.round(baseExp * (1 + bonusRate));
    const coins = baseCoins;

    profile.exp += exp;
    profile.coins += coins;
    dailyLog.expGained += exp;
    dailyLog.coinsGained += coins;
    dailyLog.tasksCompleted += 1;

    let note: string = zhCN.game.rewardNote;
    let levelUp = gainLevel(profile);

    if (allTasksCompleted(userId, targetDate)) {
      const prev = previousDate(targetDate);
      if (profile.lastActiveDate === prev) {
        profile.streakDays += 1;
      } else if (profile.lastActiveDate !== targetDate) {
        profile.streakDays = 1;
      }
      profile.lastActiveDate = targetDate;

      if (isBossDay(targetDate) && !dailyLog.bossDefeated) {
        profile.exp += 80;
        dailyLog.expGained += 80;
        dailyLog.bossDefeated = true;
        const bossLevelUp = gainLevel(profile);
        levelUp = levelUp || bossLevelUp;
        note = zhCN.game.bossVictoryNote;
      }
    }

    return {
      task,
      reward: {
        exp,
        coins,
        levelUp,
        level: profile.level,
        streakDays: profile.streakDays,
        bonusRate,
        note
      }
    };
  },
  getGameProfile: (userId: string, date = getBeijingDateString()): GameProfile => {
    ensureInitialized();
    const profile = ensureGameProfile(userId);
    const dailyLog = ensureDailyLog(userId, date);
    return {
      userId,
      level: profile.level,
      exp: profile.exp,
      coins: profile.coins,
      streakDays: profile.streakDays,
      todayExp: dailyLog.expGained,
      todayCoins: dailyLog.coinsGained,
      lastActiveDate: profile.lastActiveDate,
      bossState: mapBossState(userId, date)
    };
  },
  getVocabToday: () => {
    ensureInitialized();
    return vocabStore
      .filter((item) => item.isVerified)
      .slice(0, 12)
      .map((item) => ({
        ...item,
        provenance: provenanceStore.filter((p) => p.vocabEntryId === item.id)
      }));
  },
  getVocabProvenance: (vocabId: string) => {
    ensureInitialized();
    return provenanceStore.filter((item) => item.vocabEntryId === vocabId);
  },
  savePushSubscription: (userId: string, subscription: Record<string, unknown>) => {
    const current = pushStore.get(userId) ?? [];
    current.push(subscription);
    pushStore.set(userId, current);
    return current.length;
  },
  getPushSubscriptions: (userId: string) => pushStore.get(userId) ?? [],
  listResources: (): ResourceItem[] => {
    const official: ResourceItem = {
      id: "official-cet-neea",
      title: zhCN.ui.officialSite,
      description: "官方考试资讯与报名信息入口。",
      type: "official_link",
      href: OFFICIAL_CET_URL,
      sourceLabel: "官方站点"
    };
    const builtins: ResourceItem[] = builtinResourceConfig.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      href: item.href,
      sourceLabel: item.sourceLabel,
      fileName: item.fileName
    }));
    const externals: ResourceItem[] = externalResourceConfig.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      href: item.href,
      sourceLabel: item.sourceLabel
    }));
    return [official, ...externals, ...builtins];
  },
  saveUpload: (payload: {
    userId: string;
    fileName: string;
    filePath: string;
    contentText: string;
    sourceFile?: string | null;
    fileHash?: string | null;
  }): UploadRecord => {
    const upload: UploadRecord = {
      id: randomUUID(),
      userId: payload.userId,
      fileName: payload.fileName,
      filePath: payload.filePath,
      uploadedAt: new Date().toISOString(),
      status: "uploaded",
      contentText: payload.contentText,
      sourceFile: payload.sourceFile ?? null,
      fileHash: payload.fileHash ?? null
    };
    uploadStore.push(upload);
    return upload;
  },
  findUploadBySourceHash: (userId: string, sourceFile: string, fileHash: string) => {
    return (
      uploadStore.find(
        (upload) =>
          upload.userId === userId &&
          upload.sourceFile === sourceFile &&
          upload.fileHash === fileHash
      ) ?? null
    );
  },
  markUploadParsed: (uploadId: string) => {
    const item = uploadStore.find((upload) => upload.id === uploadId);
    if (item) {
      item.status = "parsed";
    }
  },
  getUploadById: (uploadId: string) => {
    return uploadStore.find((upload) => upload.id === uploadId) ?? null;
  },
  saveCandidates: (
    uploadId: string,
    userId: string,
    candidates: Array<{ lemma: string; frequency: number; contextSnippet: string }>
  ) => {
    for (const candidate of candidates) {
      candidateStore.push({
        id: randomUUID(),
        uploadId,
        userId,
        lemma: candidate.lemma,
        frequency: candidate.frequency,
        contextSnippet: candidate.contextSnippet,
        reviewStatus: "pending"
      });
    }
    return candidateStore.filter((item) => item.uploadId === uploadId);
  },
  getCandidates: (uploadId: string) => {
    return candidateStore.filter((item) => item.uploadId === uploadId);
  },
  importBuiltinRecords: (
    resourceId: string,
    fileName: string,
    uploadId: string | null,
    candidateCount: number,
    status: "imported" | "skipped",
    reason?: string
  ): BuiltinImportResultItem => {
    return {
      resourceId,
      fileName,
      uploadId,
      candidateCount,
      status,
      reason
    };
  }
};
