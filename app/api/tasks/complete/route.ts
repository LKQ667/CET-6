import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { completeTask } from "@/lib/repository";

const schema = z.object({
  taskId: z.string().uuid("taskId 非法")
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }

    const result = await completeTask(auth.userId, parsed.data.taskId);
    if (!result) {
      return errorJson(zhCN.api.task.notFound, 404);
    }
    return okJson(result);
  } catch (error) {
    return errorJson(zhCN.api.task.completeFailed, 500, String(error));
  }
}
