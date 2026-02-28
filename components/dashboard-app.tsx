"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import { Swords, Check, Skull, Flame, Trophy } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { VocabBattle } from "@/components/battle/vocab-battle";
import { ListeningBattle } from "@/components/battle/listening-battle";
import { WritingBattle } from "@/components/battle/writing-battle";
import { ReadingBattle } from "@/components/battle/reading-battle";
import { BossBattle } from "@/components/battle/boss-battle";

import { PwaRegister } from "@/components/pwa-register";
import { WeaknessRadar } from "@/components/weakness-radar";
import { appConfig } from "@/lib/config";
import { zhCN } from "@/lib/i18n/zh-CN";
import type {
  BuiltinImportResultItem,
  DailyTask,
  GameProfile,
  ReminderPreference,
  ResourceItem,
  TaskReward,
  TaskTodayResponse,
  VocabEntry,
  VocabProvenance
} from "@/lib/types";

interface AuthState {
  userId: string;
  email: string;
  accessToken: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface BuiltinImportResponse {
  items: BuiltinImportResultItem[];
  importedCount: number;
  skippedCount: number;
  totalCandidates: number;
}

interface TaskCompleteResponse {
  task: DailyTask;
  reward: TaskReward;
}

const fallbackBaseline = {
  total: 339,
  listening: 103,
  reading: 149,
  writingTranslation: 87
};

function calcDaysLeft() {
  const end = parseISO(appConfig.prep.endDate);
  const today = new Date();
  return Math.max(0, differenceInCalendarDays(end, today));
}

function authHeaders(auth: AuthState | null): Record<string, string> {
  if (!auth) {
    return {};
  }
  return {
    authorization: `Bearer ${auth.accessToken}`,
    "x-dev-user-id": auth.userId
  };
}

function toPushServerKey(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function levelProgress(profile: GameProfile | null) {
  if (!profile) {
    return 0;
  }
  const currentLevelStart = Math.max(0, (profile.level - 1) * 100);
  const nextLevelMark = profile.level * 100;
  const span = Math.max(1, nextLevelMark - currentLevelStart);
  return Math.min(100, Math.max(0, Math.round(((profile.exp - currentLevelStart) / span) * 100)));
}

function fmt(template: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce((text, [key, value]) => {
    return text.replace(`{${key}}`, String(value));
  }, template);
}

function resourceActionLabel(item: ResourceItem) {
  if (item.type === "builtin_pdf") {
    return zhCN.ui.downloadPdf;
  }
  if (item.type === "official_link") {
    return zhCN.ui.officialEntry;
  }
  return zhCN.ui.externalEntry;
}

async function parseApi<T>(response: Response) {
  const json = (await response.json()) as ApiResponse<T>;
  if (!json.ok || json.data === undefined) {
    throw new Error(json.error ?? zhCN.api.common.internalError);
  }
  return json.data;
}

function getLevelTitle(level: number) {
  if (level <= 5) return "六级菜鸟 🐣";
  if (level <= 15) return "长难句刺客 🥷";
  if (level <= 30) return "听力猎手 🎧";
  return "CET-6 屠龙勇士 🐉";
}

function getFlameColor(streakDays: number) {
  if (streakDays >= 14) return "purple";
  if (streakDays >= 7) return "blue";
  return "orange";
}

export function DashboardApp() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [taskData, setTaskData] = useState<TaskTodayResponse | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [selectedVocabId, setSelectedVocabId] = useState<string>("");
  const [provenance, setProvenance] = useState<VocabProvenance[]>([]);
  const [reminder, setReminder] = useState<ReminderPreference | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [message, setMessage] = useState("欢迎进入 CET-6 剧情副本训练营。");
  const [loadingData, setLoadingData] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState("");
  const [battleReward, setBattleReward] = useState<TaskReward | null>(null);
  const [showLootModal, setShowLootModal] = useState(false);
  const [importSummary, setImportSummary] = useState<BuiltinImportResponse | null>(null);
  const [activeBattleTask, setActiveBattleTask] = useState<DailyTask | null>(null);
  const [isBossBattleActive, setIsBossBattleActive] = useState(false);

  const daysLeft = useMemo(() => calcDaysLeft(), []);
  const taskDoneCount = taskData?.tasks.filter((task) => task.completed).length ?? 0;
  const taskTotalCount = taskData?.tasks.length ?? 0;
  const progress = levelProgress(gameProfile);

  useEffect(() => {
    const cache = localStorage.getItem("cet6_auth");
    if (!cache) {
      return;
    }
    try {
      const parsed = JSON.parse(cache) as AuthState;
      if (parsed?.accessToken) {
        setAuth(parsed);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  async function loadPublicResources() {
    try {
      const response = await fetch("/api/resources/list");
      const data = await parseApi<ResourceItem[]>(response);
      setResources(data);
    } catch (error) {
      setMessage(`资料中心读取失败：${String(error)}`);
    }
  }

  async function loadAuthedData(currentAuth: AuthState) {
    setLoadingData(true);
    try {
      const headers = authHeaders(currentAuth);
      const [tasksRes, vocabRes, reminderRes, gameRes, resourceRes] = await Promise.all([
        fetch("/api/tasks/today", { headers }),
        fetch("/api/vocab/today", { headers }),
        fetch("/api/reminder/preferences", { headers }),
        fetch("/api/game/profile", { headers }),
        fetch("/api/resources/list")
      ]);

      const [tasks, vocabData, reminderData, gameData, resourceData] = await Promise.all([
        parseApi<TaskTodayResponse>(tasksRes),
        parseApi<VocabEntry[]>(vocabRes),
        parseApi<ReminderPreference>(reminderRes),
        parseApi<GameProfile>(gameRes),
        parseApi<ResourceItem[]>(resourceRes)
      ]);

      setTaskData(tasks);
      setVocab(vocabData);
      setReminder(reminderData);
      setGameProfile(gameData);
      setResources(resourceData);
      setMessage(zhCN.ui.loadReady);
    } catch (error) {
      setMessage(`数据加载失败：${String(error)}`);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadPublicResources().catch(console.error);
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }
    loadAuthedData(auth).catch(console.error);
  }, [auth]);

  async function sendOtp() {
    setActionBusy(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      await parseApi<{ sent?: boolean; mockMode?: boolean; message?: string }>(response);
      setMessage(`验证码已发送。${zhCN.ui.loginHint}`);
    } catch (error) {
      setMessage(`发送验证码失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function verifyOtp() {
    setActionBusy(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          token: otp
        })
      });
      const data = await parseApi<{
        user: { id: string; email: string };
        accessToken: string;
      }>(response);

      const nextAuth: AuthState = {
        userId: data.user.id,
        email: data.user.email,
        accessToken: data.accessToken
      };
      localStorage.setItem("cet6_auth", JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setMessage(zhCN.ui.loginSuccess);
    } catch (error) {
      setMessage(`验证码校验失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  function handleStartBattle(task: DailyTask) {
    setActiveBattleTask(task);
  }

  function handleStartBossBattle() {
    setIsBossBattleActive(true);
  }

  async function handleCompleteTask(taskId: string) {
    if (!auth) {
      return;
    }
    setActiveBattleTask(null);
    setActionBusy(true);
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth)
        },
        body: JSON.stringify({ taskId })
      });
      const data = await parseApi<TaskCompleteResponse>(response);
      setBattleReward(data.reward);
      setMessage(`${zhCN.ui.taskDone} ${data.reward.note}`);
      setShowLootModal(true);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f2c46d', '#63d3ff', '#7fefbd', '#ff9c8c']
      });

      const [nextTasksRes, nextGameRes] = await Promise.all([
        fetch("/api/tasks/today", { headers: authHeaders(auth) }),
        fetch("/api/game/profile", { headers: authHeaders(auth) })
      ]);
      const [nextTasks, nextGame] = await Promise.all([
        parseApi<TaskTodayResponse>(nextTasksRes),
        parseApi<GameProfile>(nextGameRes)
      ]);
      setTaskData(nextTasks);
      setGameProfile(nextGame);
    } catch (error) {
      setMessage(`任务完成失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function loadProvenance(vocabId: string) {
    if (!auth) {
      return;
    }
    try {
      setSelectedVocabId(vocabId);
      const response = await fetch(`/api/vocab/${vocabId}/provenance`, {
        headers: authHeaders(auth)
      });
      const data = await parseApi<VocabProvenance[]>(response);
      setProvenance(data);
    } catch (error) {
      setMessage(`词汇出处读取失败：${String(error)}`);
    }
  }

  async function handleSaveReminder() {
    if (!auth || !reminder) {
      return;
    }
    setActionBusy(true);
    try {
      const response = await fetch("/api/reminder/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth)
        },
        body: JSON.stringify({
          emailEnabled: reminder.emailEnabled,
          pushEnabled: reminder.pushEnabled,
          reminderTimes: reminder.reminderTimes,
          timezone: reminder.timezone
        })
      });
      const data = await parseApi<ReminderPreference>(response);
      setReminder(data);
      setMessage(zhCN.ui.saveSuccess);
    } catch (error) {
      setMessage(`提醒保存失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function subscribePush() {
    if (!auth) {
      return;
    }
    setActionBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("当前浏览器不支持推送。");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("通知权限未授权。");
      }
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidPublicKey) {
        throw new Error("缺少 NEXT_PUBLIC_VAPID_PUBLIC_KEY。");
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toPushServerKey(vapidPublicKey)
      });

      const response = await fetch("/api/reminder/push-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth)
        },
        body: JSON.stringify(subscription)
      });
      await parseApi<{ saved: boolean }>(response);
      setMessage(zhCN.ui.pushReady);
    } catch (error) {
      setMessage(`开启推送失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function uploadAndExtract() {
    if (!auth) {
      return;
    }
    if (!selectedFile) {
      setMessage(zhCN.ui.selectFileFirst);
      return;
    }
    setActionBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await fetch("/api/source/upload", {
        method: "POST",
        headers: authHeaders(auth),
        body: formData
      });
      const uploadData = await parseApi<{ uploadId: string; fileName: string }>(uploadRes);

      const extractRes = await fetch("/api/source/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth)
        },
        body: JSON.stringify({ uploadId: uploadData.uploadId })
      });
      const extractData = await parseApi<{ candidateCount: number }>(extractRes);

      setUploadResult(
        fmt(zhCN.ui.uploadResult, {
          fileName: uploadData.fileName,
          count: extractData.candidateCount
        })
      );
      setMessage(zhCN.ui.uploadDone);
    } catch (error) {
      setUploadResult(`处理失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function importBuiltinResources() {
    if (!auth) {
      return;
    }
    setActionBusy(true);
    try {
      const response = await fetch("/api/resources/import-builtin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth)
        },
        body: JSON.stringify({})
      });
      const data = await parseApi<BuiltinImportResponse>(response);
      setImportSummary(data);
      setMessage(zhCN.ui.importDone);
    } catch (error) {
      setMessage(`内置导入失败：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function downloadTodayPdf() {
    if (!auth) {
      return;
    }
    setActionBusy(true);
    try {
      const response = await fetch("/api/reminder/daily-pdf", {
        method: "GET",
        headers: authHeaders(auth)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || zhCN.ui.pdfFailed);
      }
      const blob = await response.blob();
      const today = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CET6-每日备考-${today}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(zhCN.ui.pdfReady);
    } catch (error) {
      setMessage(`${zhCN.ui.pdfFailed}：${String(error)}`);
    } finally {
      setActionBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("cet6_auth");
    setAuth(null);
    setTaskData(null);
    setVocab([]);
    setProvenance([]);
    setReminder(null);
    setGameProfile(null);
    setBattleReward(null);
    setImportSummary(null);
    setMessage("已退出登录。");
  }

  return (
    <main className="scene-root">
      <PwaRegister />
      <div className="scene-grid-layer" />
      <div className="scene-glow scene-glow-a" />
      <div className="scene-glow scene-glow-b" />

      <section className="scene-wrap">
        <header className="hero-board">
          <div className="hero-left">
            <p className="hero-kicker">{zhCN.ui.headerKicker}</p>
            <h1>六级私人备战片场</h1>
            <p className="hero-meta">
              {zhCN.ui.periodLabel}：{appConfig.prep.startDate} - {appConfig.prep.endDate} | {zhCN.ui.targetLabel}
              ：{appConfig.prep.targetScore}+
            </p>
          </div>
          <div className="hero-right">
            <div className="hero-chip">
              <span>剩余天数</span>
              <strong>{daysLeft}</strong>
            </div>
            <div className="hero-chip">
              <span>今日进度</span>
              <strong>
                {taskDoneCount}/{taskTotalCount || 4}
              </strong>
            </div>
          </div>
        </header>

        {!auth ? (
          <section className="guest-grid">
            <article className="panel auth-panel">
              <h2>{zhCN.ui.loginTitle}</h2>
              <p className="panel-sub">{zhCN.ui.loginDesc}</p>
              <div className="form-line">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={zhCN.ui.emailPlaceholder}
                  type="email"
                />
                <button onClick={sendOtp} disabled={actionBusy || !email} type="button">
                  {zhCN.ui.sendOtp}
                </button>
              </div>
              <div className="form-line">
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder={zhCN.ui.otpPlaceholder}
                  type="text"
                />
                <button onClick={verifyOtp} disabled={actionBusy || !otp} type="button">
                  {zhCN.ui.loginSync}
                </button>
              </div>
              <p className="panel-sub">{zhCN.ui.loginHint}</p>
            </article>

            <article className="panel resource-panel">
              <div className="panel-title-row">
                <h2>{zhCN.ui.resourceTitle}</h2>
              </div>
              <p className="panel-sub">官方入口 + 6 个外部资料站 + 2 份内置 PDF，覆盖 3.1-12.11 备考全程。</p>
              <div className="resource-list">
                {resources.map((item) => (
                  <div className="resource-item" key={item.id}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className="resource-source">{item.sourceLabel}</span>
                    </div>
                    <a
                      className="ghost-btn"
                      href={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {resourceActionLabel(item)}
                    </a>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : (
          <section className="deck-grid">
            <article className="panel overview-panel">
              <div className="panel-title-row">
                <h2>成绩与弱项雷达</h2>
                <button className="ghost-btn" onClick={logout} type="button">
                  退出登录
                </button>
              </div>
              <div className="score-row">
                <span>当前总分</span>
                <strong>{fallbackBaseline.total}</strong>
              </div>
              <div className="score-sub-row">
                <span>听力 {fallbackBaseline.listening}</span>
                <span>阅读 {fallbackBaseline.reading}</span>
                <span>写译 {fallbackBaseline.writingTranslation}</span>
              </div>
              <div className="countdown-card">距离考试还有 {daysLeft} 天，稳步推进即可。</div>
              <WeaknessRadar
                listening={fallbackBaseline.listening}
                reading={fallbackBaseline.reading}
                writingTranslation={fallbackBaseline.writingTranslation}
              />
            </article>

            <article className="panel game-panel">
              <div className="panel-title-row">
                <h2>{zhCN.ui.gameTitle}</h2>
                <span className="level-title-badge">
                  <Trophy size={14} />
                  {getLevelTitle(gameProfile?.level ?? 1)}
                </span>
              </div>
              <p className="panel-sub">每日 4 小怪，周六 1 Boss。总时长保持 35-45 分钟。</p>
              <div className="game-stats-grid">
                <div className="stat-chip">
                  <span>{zhCN.game.levelLabel}</span>
                  <strong>{gameProfile?.level ?? 1}</strong>
                </div>
                <div className="stat-chip">
                  <span>{zhCN.game.expLabel}</span>
                  <strong><CountUp end={gameProfile?.exp ?? 0} duration={1.5} /></strong>
                </div>
                <div className="stat-chip">
                  <span>{zhCN.game.coinLabel}</span>
                  <strong><CountUp end={gameProfile?.coins ?? 0} duration={1.5} /></strong>
                </div>
                <div className="stat-chip">
                  <span className="streak-flame-container">
                    {zhCN.game.streakLabel}
                    {(gameProfile?.streakDays ?? 0) >= 3 && (
                      <Flame className={`streak-flame ${getFlameColor(gameProfile?.streakDays ?? 0)}`} size={16} fill="currentColor" />
                    )}
                  </span>
                  <strong>{gameProfile?.streakDays ?? 0}</strong>
                </div>
              </div>
              <div className="exp-track">
                <div className="exp-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="panel-sub">本日收益：经验 {gameProfile?.todayExp ?? 0} / 金币 {gameProfile?.todayCoins ?? 0}</p>
            </article>

            <article className="panel task-panel">
              <h2>{zhCN.ui.todayTaskTitle}</h2>
              <p className="panel-sub">
                {taskData
                  ? `${taskData.date} · 阶段 ${taskData.phaseCode} · 预计 ${taskData.totalEstimatedMinutes} 分钟`
                  : zhCN.ui.loading}
              </p>

              {taskData && (
                <div className="journey-wrap">
                  <div className="journey-line">
                    <div className="journey-line-fill" style={{ width: `${(taskDoneCount / Math.max(1, taskTotalCount)) * 100}%` }} />
                  </div>
                  <div className="journey-map">
                    {taskData.tasks.map((task) => (
                      <div key={`node-${task.id}`} className={`journey-node ${task.completed ? "cleared" : ""}`} title={task.title}>
                        {task.completed ? <Check size={20} /> : <Swords size={18} />}
                      </div>
                    ))}
                    <div className={`journey-node boss ${gameProfile?.bossState.isBossDay ? "active" : ""}`}>
                      <Skull size={22} />
                    </div>
                  </div>
                </div>
              )}

              <div className="task-list">
                {taskData ? taskData.tasks.map((task) => (
                  <div className={`task-item ${task.completed ? "done" : ""}`} key={task.id}>
                    {task.completed && <div className="cleared-stamp">CLEARED</div>}
                    <div>
                      <div className="task-headline">
                        <h3>{task.title}</h3>
                        <span className="monster-badge">{zhCN.game.monsters[task.taskType]}</span>
                      </div>
                      <p>{task.description}</p>
                    </div>
                    <button
                      disabled={actionBusy || task.completed}
                      className={task.completed ? "ghost-btn" : "accent-btn"}
                      onClick={() => handleStartBattle(task)}
                      type="button"
                    >
                      {task.completed ? "已击败" : "开战并打卡"}
                    </button>
                  </div>
                )) : (
                  <>
                    <div className="shimmer shimmer-block" />
                    <div className="shimmer shimmer-block" />
                    <div className="shimmer shimmer-block" />
                    <div className="shimmer shimmer-block" />
                  </>
                )}
              </div>
            </article>

            <article className={`panel boss-panel ${gameProfile?.bossState.isBossDay && !gameProfile?.bossState.defeated ? "boss-card-active boss-shake" : ""}`}>
              <h2>{zhCN.ui.bossTitle}</h2>
              {gameProfile?.bossState.isBossDay ? (
                <>
                  <p className="panel-sub">{gameProfile.bossState.bossName}</p>
                  <div className="boss-hp-track">
                    <div
                      className="boss-hp-fill"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (gameProfile.bossState.hp / Math.max(1, gameProfile.bossState.maxHp)) * 100
                          )
                        )}%`
                      }}
                    />
                  </div>
                  <p className="panel-sub">
                    HP {gameProfile.bossState.hp}/{gameProfile.bossState.maxHp}
                    {gameProfile.bossState.defeated ? " · 已击败" : " · 继续清空今日任务"}
                  </p>
                  <ul className="checklist">
                    {gameProfile.bossState.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {!gameProfile.bossState.defeated && (
                    <button 
                      className="accent-btn mt-4" 
                      onClick={handleStartBossBattle}
                      disabled={taskDoneCount < taskTotalCount || taskTotalCount === 0}
                      type="button"
                    >
                      {taskDoneCount < taskTotalCount ? "先清空小怪再战 Boss" : "开启终极复盘 (Boss战)"}
                    </button>
                  )}
                </>
              ) : (
                <p className="panel-sub">周六自动开启 Boss 复盘战，本日先把 4 个小怪清掉。</p>
              )}
            </article>

            <article className="panel vocab-panel">
              <h2>{zhCN.ui.todayVocabTitle}</h2>
              <p className="panel-sub">词条只来自真题来源，支持年份/套卷/题型追溯。</p>
              <div className="vocab-grid">
                {vocab.map((item) => (
                  <button
                    className={`vocab-pill ${selectedVocabId === item.id ? "active" : ""}`}
                    key={item.id}
                    onClick={() => loadProvenance(item.id)}
                    type="button"
                  >
                    {item.lemma}
                  </button>
                ))}
              </div>
              <div className="provenance-box">
                {provenance.length === 0 ? (
                  <p>{zhCN.ui.noProvenance}</p>
                ) : (
                  provenance.map((item) => (
                    <div className="provenance-item" key={item.id}>
                      <strong>
                        {item.examYear}年{item.examMonth}月 · {item.paperCode} · {item.questionType}
                      </strong>
                      <p>{item.sourceSnippet}</p>
                      <div className="provenance-links">
                        <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                          查看来源链接
                        </a>
                        {item.sourceFile ? <span>文件：{item.sourceFile}</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel resource-panel">
              <div className="panel-title-row">
                <h2>{zhCN.ui.resourceTitle}</h2>
                <button
                  className="accent-btn"
                  disabled={actionBusy}
                  onClick={importBuiltinResources}
                  type="button"
                >
                  {zhCN.ui.importBuiltinButton}
                </button>
              </div>
              <p className="panel-sub">已接入官方入口与外部资料站，配合内置 PDF 与一键导入，贯穿 3.1-12.11 备考期。</p>
              <div className="resource-list">
                {resources.map((item) => (
                  <div className="resource-item" key={item.id}>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className="resource-source">{item.sourceLabel}</span>
                    </div>
                    <a
                      className="ghost-btn"
                      href={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {resourceActionLabel(item)}
                    </a>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel reminder-panel">
              <h2>{zhCN.ui.reminderTitle}</h2>
              <p className="panel-sub">默认每天 12:00 与 21:40 双通道提醒（邮件 + 浏览器推送）。</p>
              {reminder ? (
                <>
                  <div className="switch-row">
                    <label>
                      <input
                        checked={reminder.emailEnabled}
                        onChange={(event) =>
                          setReminder({
                            ...reminder,
                            emailEnabled: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                      邮件提醒
                    </label>
                    <label>
                      <input
                        checked={reminder.pushEnabled}
                        onChange={(event) =>
                          setReminder({
                            ...reminder,
                            pushEnabled: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                      浏览器推送
                    </label>
                  </div>
                  <div className="switch-row">
                    <button className="accent-btn" onClick={handleSaveReminder} type="button">
                      {zhCN.ui.saveReminder}
                    </button>
                    <button className="ghost-btn" onClick={subscribePush} type="button">
                      {zhCN.ui.enablePush}
                    </button>
                  </div>
                </>
              ) : (
                <p className="panel-sub">{zhCN.ui.loading}</p>
              )}
            </article>

            <article className="panel upload-panel">
              <h2>{zhCN.ui.uploadTitle}</h2>
              <p className="panel-sub">支持 TXT/PDF，自动抽词并进入待审核池，不直接写入 verified 主库。</p>
              <div className="form-line">
                <input
                  accept=".txt,.pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <button
                  className="accent-btn"
                  disabled={actionBusy || !selectedFile}
                  onClick={uploadAndExtract}
                  type="button"
                >
                  {zhCN.ui.uploadButton}
                </button>
              </div>
              {uploadResult ? <p className="upload-result">{uploadResult}</p> : null}
            </article>

            <article className="panel report-panel">
              <h2>{zhCN.ui.battleTitle}</h2>
              <p className="panel-sub">{message}</p>
              <div className="switch-row">
                <button
                  className="ghost-btn"
                  onClick={downloadTodayPdf}
                  disabled={actionBusy}
                  type="button"
                >
                  {zhCN.ui.downloadTodayPdf}
                </button>
              </div>

              {battleReward ? (
                <div className="battle-reward">
                  <span>+{battleReward.exp} 经验</span>
                  <span>+{battleReward.coins} 金币</span>
                  <span>Lv.{battleReward.level}</span>
                  <span>连胜 {battleReward.streakDays} 天</span>
                  {battleReward.levelUp ? <strong>升级成功</strong> : null}
                </div>
              ) : (
                <p className="panel-sub">{zhCN.ui.noRewardYet}</p>
              )}

              {importSummary ? (
                <div className="import-summary">
                  <p>
                    导入完成：新增 {importSummary.importedCount} 份，跳过 {importSummary.skippedCount} 份，候选词{" "}
                    {importSummary.totalCandidates} 个。
                  </p>
                  <div className="import-list">
                    {importSummary.items.map((item) => (
                      <div className="import-item" key={`${item.resourceId}-${item.uploadId ?? "none"}`}>
                        <strong>{item.fileName}</strong>
                        <span>
                          {item.status === "imported"
                            ? `已导入，候选词 ${item.candidateCount}`
                            : `已跳过：${item.reason ?? "重复导入"}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        )}

        <footer className="status-bar">
          <span>状态：{loadingData || actionBusy ? zhCN.ui.statusBusy : zhCN.ui.statusReady}</span>
          <span>用户：{auth?.email ?? zhCN.ui.notLoggedIn}</span>
        </footer>
      </section>

      {showLootModal && battleReward && (
        <div className="loot-backdrop" onClick={() => setShowLootModal(false)}>
          <div className="loot-modal" onClick={(e) => e.stopPropagation()}>
            <h2>VICTORY</h2>
            <p style={{ color: "var(--text-sub)", fontSize: "1.05rem" }}>
              {battleReward.levelUp ? "任务已清空，恭喜升级！" : "干得漂亮！战利品已入账"}
            </p>
            <div className="loot-reward-grid">
              <div className="loot-reward-item exp">
                <span>获得经验</span>
                <strong>+<CountUp end={battleReward.exp} duration={1.2} /></strong>
              </div>
              <div className="loot-reward-item coin">
                <span>获得金币</span>
                <strong>+<CountUp end={battleReward.coins} duration={1.2} /></strong>
              </div>
            </div>
            {battleReward.streakDays > 1 && (
              <p style={{ marginBottom: "1.2rem", color: "var(--cyan)", fontWeight: 600 }}>
                <Flame size={16} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "4px" }}/>
                连续打卡 {battleReward.streakDays} 天！收益已加成 {battleReward.bonusRate}x
              </p>
            )}
            <button className="accent-btn loot-btn" onClick={() => setShowLootModal(false)}>
              收入囊中并继续
            </button>
          </div>
        </div>
      )}

      {/* ===== Battle Modals ===== */}
      <AnimatePresence>
        {activeBattleTask && activeBattleTask.taskType === "vocab" && (
          <VocabBattle
            task={activeBattleTask}
            vocabList={vocab}
            onComplete={handleCompleteTask}
            onCancel={() => setActiveBattleTask(null)}
          />
        )}
        {activeBattleTask && activeBattleTask.taskType === "listening" && (
          <ListeningBattle
            task={activeBattleTask}
            onComplete={handleCompleteTask}
            onCancel={() => setActiveBattleTask(null)}
          />
        )}
        {activeBattleTask && activeBattleTask.taskType === "writing_translation" && (
          <WritingBattle
            task={activeBattleTask}
            onComplete={handleCompleteTask}
            onCancel={() => setActiveBattleTask(null)}
          />
        )}
        {activeBattleTask && activeBattleTask.taskType === "reading" && (
          <ReadingBattle
            task={activeBattleTask}
            onComplete={handleCompleteTask}
            onCancel={() => setActiveBattleTask(null)}
          />
        )}
        {isBossBattleActive && gameProfile && (
          <BossBattle
            bossName={gameProfile.bossState.bossName}
            maxHp={gameProfile.bossState.maxHp}
            currentHp={gameProfile.bossState.hp}
            onComplete={() => {
              setIsBossBattleActive(false);
              confetti({
                particleCount: 300,
                spread: 120,
                origin: { y: 0.5 },
                colors: ["#f2c46d", "#ff5e5e", "#63d3ff", "#7fefbd"]
              });
              if (auth) {
                loadAuthedData(auth).catch(console.error);
              }
            }}
            onCancel={() => setIsBossBattleActive(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
