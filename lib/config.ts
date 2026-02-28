const requiredServerKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export const OFFICIAL_CET_URL = "https://cet.neea.edu.cn/";

export const builtinResourceConfig = [
  {
    id: "builtin-cet4-6",
    title: "CET4-6 词频资料（内置）",
    description: "站内可下载，也可一键导入抽词入待审核池。",
    type: "builtin_pdf" as const,
    fileName: "cet4-6.pdf",
    href: "/resources/cet4-6.pdf",
    sourceLabel: "你提供的资料"
  },
  {
    id: "builtin-cet6-shuffle-vocab",
    title: "大学英语六级词汇乱序版（内置）",
    description: "站内可下载，也可一键导入抽词入待审核池。",
    type: "builtin_pdf" as const,
    fileName: "大学英语六级词汇乱序版.pdf",
    href: "/resources/大学英语六级词汇乱序版.pdf",
    sourceLabel: "你提供的资料"
  }
];

export const externalResourceConfig = [
  {
    id: "ext-wehuster-cet6",
    title: "大学英语六级考试真题 | WeHUSTER",
    description: "真题在线练习与做题入口，适合阶段化刷题。",
    type: "external_link" as const,
    href: "https://www.wehuster.com/cet6?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  },
  {
    id: "ext-pastpapers-cet6",
    title: "大学英语六级真题 | 在线真题",
    description: "历年试卷在线演练，可用于周测与阶段复盘。",
    type: "external_link" as const,
    href: "https://pastpapers.cn/cet-6?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  },
  {
    id: "ext-burningvocabulary-cet6",
    title: "六级真题（PDF下载/查答案） | 英语真题在线",
    description: "真题下载与答案核对入口，便于错题回放。",
    type: "external_link" as const,
    href: "https://zhenti.burningvocabulary.cn/cet6?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  },
  {
    id: "ext-keluke-cet6",
    title: "大学英语六级历年考试真题 PDF 下载 | 科鲁克",
    description: "真题 PDF 资源补充，适合离线训练。",
    type: "external_link" as const,
    href: "https://www.keluke.com/yingyu/cet6/?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  },
  {
    id: "ext-xdf-cet46",
    title: "新东方四六级官网（考试时间/真题）",
    description: "官方资讯聚合与备考文章入口。",
    type: "external_link" as const,
    href: "https://cet4-6.xdf.cn/?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  },
  {
    id: "ext-ximalaya-cet6",
    title: "喜马拉雅外语频道（六级听力资源）",
    description: "听力素材补充，适合通勤碎片化训练。",
    type: "external_link" as const,
    href: "https://www.ximalaya.com/waiyu/40550410/?utm_source=chatgpt.com",
    sourceLabel: "外部资料站"
  }
];

function hasValue(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidSupabaseUrl(value?: string) {
  if (!hasValue(value)) return false;
  const normalized = value!.trim();
  if (normalized.includes("=")) return false;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" && /\.supabase\.co$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isValidSupabaseAnonKey(value?: string) {
  if (!hasValue(value)) return false;
  const normalized = value!.trim();
  if (normalized.includes("=")) return false;
  return /^sb_(publishable|anon)_/.test(normalized) || /^eyJ/.test(normalized);
}

function isValidSupabaseServiceKey(value?: string) {
  if (!hasValue(value)) return false;
  const normalized = value!.trim();
  if (normalized.includes("=")) return false;
  return /^sb_secret_/.test(normalized) || /^eyJ/.test(normalized);
}

export const appConfig = {
  prep: {
    startDate: "2026-03-01",
    endDate: "2026-12-11",
    targetScore: 500
  },
  reminder: {
    timezone: "Asia/Shanghai",
    times: ["12:00", "21:40"]
  }
} as const;

export function getMissingBaseEnv() {
  return requiredServerKeys.filter((key) => {
    const value = process.env[key];
    if (!hasValue(value)) return true;
    if (key === "NEXT_PUBLIC_SUPABASE_URL") return !isValidSupabaseUrl(value);
    if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") return !isValidSupabaseAnonKey(value);
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return !isValidSupabaseServiceKey(value);
    return false;
  });
}

export function isSupabaseReady() {
  return getMissingBaseEnv().length === 0;
}

export function getEnvOrThrow(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];
  if (!hasValue(value)) {
    throw new Error(`缺少环境变量: ${name}`);
  }
  return value!.trim();
}
