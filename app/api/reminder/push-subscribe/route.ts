import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { savePushSubscription } from "@/lib/repository";

const schema = z.object({
  endpoint: z.string().url("endpoint 非法"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
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
    await savePushSubscription(auth.userId, parsed.data);
    return okJson({
      saved: true
    });
  } catch (error) {
    return errorJson(zhCN.api.reminder.savePushFailed, 500, String(error));
  }
}
