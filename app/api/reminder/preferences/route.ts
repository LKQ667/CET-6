import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getOrCreateReminderPreference, updateReminderPreference } from "@/lib/repository";

const patchSchema = z.object({
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  reminderTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(3),
  timezone: z.string().min(3)
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const data = await getOrCreateReminderPreference(auth.userId);
    return okJson(data);
  } catch (error) {
    return errorJson(zhCN.api.reminder.getPreferenceFailed, 500, String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }
    const data = await updateReminderPreference(auth.userId, parsed.data);
    return okJson(data);
  } catch (error) {
    return errorJson(zhCN.api.reminder.updatePreferenceFailed, 500, String(error));
  }
}
