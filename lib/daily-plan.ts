import { createHash } from "node:crypto";

import { isWeekendByDate, phaseByDate } from "@/lib/date";
import type { BaselineScore, DailyTask } from "@/lib/types";

interface BuildTaskInput {
  userId: string;
  taskDate: string;
  baseline: BaselineScore;
}

function buildStableTaskId(userId: string, taskDate: string, taskType: DailyTask["taskType"]) {
  const hex = createHash("sha1")
    .update(`${userId}:${taskDate}:${taskType}`)
    .digest("hex");
  const versionPart = `4${hex.slice(13, 16)}`;
  const variantNibble = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const variantPart = `${variantNibble}${hex.slice(17, 20)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${versionPart}-${variantPart}-${hex.slice(20, 32)}`;
}

function listeningMinutesByBaseline(listening: number) {
  if (listening < 120) {
    return 15;
  }
  if (listening < 150) {
    return 12;
  }
  return 10;
}

function writingMinutesByBaseline(score: number) {
  if (score < 105) {
    return 12;
  }
  return 10;
}

export function buildDailyTasks(input: BuildTaskInput): DailyTask[] {
  const { userId, taskDate, baseline } = input;
  const phaseCode = phaseByDate(taskDate);
  const weekend = isWeekendByDate(taskDate);
  const writingMinutes = writingMinutesByBaseline(baseline.writingTranslation);
  const listeningMinutes = listeningMinutesByBaseline(baseline.listening);

  const storyLine =
    phaseCode === "A"
      ? "片场 Day 1：先搭建学习底盘，追求稳住节奏。"
      : phaseCode === "B"
        ? "片场 Day 2：主线推进，听力与写译进入快进档。"
        : phaseCode === "C"
          ? "片场 Day 3：真题节奏化，进入考试镜头。"
          : "片场 Final：冲刺精修，控制状态与命中率。";

  const readingMinutes = weekend ? 8 : 6;
  const vocabTarget = weekend ? "12" : "10";
  const listeningTitle =
    baseline.listening < baseline.reading
      ? "听力弱项修复：场景短听 1 组"
      : "听力稳态维护：场景短听 1 组";

  return [
    {
      id: buildStableTaskId(userId, taskDate, "vocab"),
      userId,
      taskDate,
      taskType: "vocab",
      title: "真题词汇 8-12 个",
      description: `来自往年真题来源，今日目标 ${vocabTarget} 词；完成后标记“已掌握/需回流”。`,
      estimatedMinutes: weekend ? 12 : 10,
      completed: false,
      phaseCode
    },
    {
      id: buildStableTaskId(userId, taskDate, "listening"),
      userId,
      taskDate,
      taskType: "listening",
      title: listeningTitle,
      description: `${storyLine} 先做关键词预测，再听 2 轮并复盘错位点。`,
      estimatedMinutes: listeningMinutes,
      completed: false,
      phaseCode
    },
    {
      id: buildStableTaskId(userId, taskDate, "writing_translation"),
      userId,
      taskDate,
      taskType: "writing_translation",
      title: "写译微任务 1 个",
      description: "句改/段译/模板替换三选一，目标是结构清晰、语法稳定。",
      estimatedMinutes: writingMinutes,
      completed: false,
      phaseCode
    },
    {
      id: buildStableTaskId(userId, taskDate, "reading"),
      userId,
      taskDate,
      taskType: "reading",
      title: weekend ? "阅读保持 + 周测复盘" : "阅读保持 1 小段",
      description: weekend
        ? "周六做 1 组周测并复盘，周日做补漏，不新增高压任务。"
        : "保持阅读手感，防止优势项掉分。",
      estimatedMinutes: readingMinutes,
      completed: false,
      phaseCode
    }
  ];
}
