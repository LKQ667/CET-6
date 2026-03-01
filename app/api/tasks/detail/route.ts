import { NextRequest } from "next/server";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getQuestionForBattle, recordQuestionProgress } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const taskType = request.nextUrl.searchParams.get("taskType");
    if (!taskType || !["vocab", "listening", "writing_translation", "reading"].includes(taskType)) {
      return errorJson("taskType 参数缺失或无效", 400);
    }
    const question = await getQuestionForBattle(auth.userId, taskType);
    if (!question) {
      return errorJson("暂无可用题目", 404);
    }
    return okJson({ question });
  } catch (error) {
    return errorJson("读取题目失败", 500, String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const body = (await request.json()) as { questionId?: string; isCorrect?: boolean };
    if (!body.questionId) {
      return errorJson("questionId 缺失", 400);
    }
    await recordQuestionProgress(auth.userId, body.questionId, body.isCorrect ?? true);
    return okJson({ recorded: true });
  } catch (error) {
    return errorJson("记录答题进度失败", 500, String(error));
  }
}
