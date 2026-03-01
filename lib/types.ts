export type TaskType = "vocab" | "listening" | "writing_translation" | "reading";

export interface BaselineScore {
  total: number;
  listening: number;
  reading: number;
  writingTranslation: number;
}

export interface DailyTask {
  id: string;
  userId: string;
  taskDate: string;
  taskType: TaskType;
  title: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  phaseCode: "A" | "B" | "C" | "D";
  createdAt?: string;
  completedAt?: string | null;
}

export interface TaskReward {
  exp: number;
  coins: number;
  levelUp: boolean;
  level: number;
  streakDays: number;
  bonusRate: number;
  note: string;
}

export interface VocabProvenance {
  id: string;
  vocabEntryId: string;
  examYear: number;
  examMonth: 6 | 12;
  paperCode: string;
  questionType: string;
  sourceUrl: string;
  sourceSnippet: string;
  sourceFile?: string | null;
  createdAt?: string;
}

export interface VocabEntry {
  id: string;
  lemma: string;
  phonetic: string | null;
  pos: string | null;
  meaningZh: string;
  frequencyInPapers: number;
  isVerified: boolean;
  verificationStatus: "public_source" | "user_uploaded" | "pending_review";
  createdAt?: string;
  provenance?: VocabProvenance[];
}

export interface ReminderPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  reminderTimes: string[];
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BossState {
  isBossDay: boolean;
  bossName: string;
  hp: number;
  maxHp: number;
  defeated: boolean;
  checklist: string[];
  rewardExp: number;
}

export interface GameProfile {
  userId: string;
  level: number;
  exp: number;
  coins: number;
  streakDays: number;
  todayExp: number;
  todayCoins: number;
  lastActiveDate: string | null;
  bossState: BossState;
}

export type ResourceItemType = "official_link" | "external_link" | "builtin_pdf";

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: ResourceItemType;
  href: string;
  sourceLabel: string;
  fileName?: string;
}

export interface UploadRecord {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  status: "uploaded" | "parsed" | "failed";
  contentText: string;
  sourceFile?: string | null;
  fileHash?: string | null;
}

export interface BuiltinImportResultItem {
  resourceId: string;
  fileName: string;
  uploadId: string | null;
  candidateCount: number;
  status: "imported" | "skipped";
  reason?: string;
}

export interface TaskTodayResponse {
  date: string;
  phaseCode: "A" | "B" | "C" | "D";
  totalEstimatedMinutes: number;
  streakDays: number;
  tasks: DailyTask[];
}

export interface DailyPlanProfile {
  baseline: BaselineScore;
  targetScore: number;
  prepStartDate: string;
  prepEndDate: string;
}

// ========== 题库系统 ==========

export interface QuestionBankItem {
  id: string;
  taskType: TaskType;
  content: Record<string, unknown>;
  difficulty: number;
}

export interface ListeningContent {
  en: string;
  zh: string;
}

export interface ReadingContent {
  passage: { en: string; zh: string };
  questions: { text: string; isTrue: boolean }[];
}

export interface WritingContent {
  zh: string;
  options: { id: string; text: string; isCorrect: boolean; reason: string }[];
}

export interface BattleContent {
  question: QuestionBankItem;
}
