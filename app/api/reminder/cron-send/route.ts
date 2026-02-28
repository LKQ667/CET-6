import { NextRequest } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { randomUUID } from "node:crypto";

import { errorJson, okJson } from "@/lib/api";
import { appConfig, isSupabaseReady } from "@/lib/config";
import { buildDailyBriefPdfBuffer } from "@/lib/daily-brief-pdf";
import { buildSignedDailyPdfUrl } from "@/lib/daily-pdf-token";
import { zhCN } from "@/lib/i18n/zh-CN";
import { sendPushNotification, sendReminderEmail } from "@/lib/notifications";
import {
  getBaselineScore,
  getOrCreateReminderPreference,
  getOrCreateTodayTasks,
  getPushSubscriptions,
  getVocabToday,
  listReminderUsers
} from "@/lib/repository";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const REMINDER_BATCH_SIZE = 10;

type ReminderUser = Awaited<ReturnType<typeof listReminderUsers>>[number];

function getCurrentSlot() {
  const now = toZonedTime(new Date(), appConfig.reminder.timezone);
  return format(now, "HH:mm");
}

async function shouldSkipSlot(userId: string, slot: string, date: string) {
  if (!isSupabaseReady()) {
    return false;
  }
  const supabase = getSupabaseServiceClient();
  const eventKey = `reminder:${date}:${slot}`;
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", "reminder_sent")
    .eq("event_key", eventKey)
    .maybeSingle();
  if (error) {
    throw new Error(`检查提醒幂等失败: ${error.message}`);
  }
  return Boolean(data);
}

async function markSlotSent(userId: string, slot: string, date: string, result: Record<string, unknown>) {
  if (!isSupabaseReady()) {
    return;
  }
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("activity_logs").insert({
    id: randomUUID(),
    user_id: userId,
    event_type: "reminder_sent",
    event_key: `reminder:${date}:${slot}`,
    payload: result
  });
  if (error) {
    throw new Error(`写入提醒日志失败: ${error.message}`);
  }
}

async function processReminderUser(input: {
  user: ReminderUser;
  slot: string;
  today: string;
  isEveningSlot: boolean;
  appUrl: string;
}) {
  const { user, slot, today, isEveningSlot, appUrl } = input;
  try {
    const preference = await getOrCreateReminderPreference(user.userId);
    if (!preference.reminderTimes.includes(slot)) {
      return {
        userId: user.userId,
        slot,
        skipped: true,
        reason: "不在提醒时间配置内"
      };
    }
    const sent = await shouldSkipSlot(user.userId, slot, today);
    if (sent) {
      return {
        userId: user.userId,
        slot,
        skipped: true,
        reason: "同一时段已发送"
      };
    }

    const taskData = await getOrCreateTodayTasks(user.userId, today);

    let pdfDownloadUrl: string | undefined;
    let pdfAttachmentBase64: string | undefined;
    let pdfFileName: string | undefined;
    let pdfSkippedReason: string | undefined;

    if (isEveningSlot) {
      try {
        const [baseline, vocab] = await Promise.all([
          getBaselineScore(user.userId),
          getVocabToday(16)
        ]);
        const pdfBuffer = await buildDailyBriefPdfBuffer({
          userEmail: user.email,
          date: today,
          prepStartDate: appConfig.prep.startDate,
          prepEndDate: appConfig.prep.endDate,
          targetScore: user.targetScore,
          baseline,
          tasks: taskData.tasks,
          vocab
        });
        const expiresAt = Date.now() + 36 * 60 * 60 * 1000;
        pdfDownloadUrl = buildSignedDailyPdfUrl(appUrl, {
          userId: user.userId,
          date: today,
          expiresAt
        });
        pdfAttachmentBase64 = pdfBuffer.toString("base64");
        pdfFileName = `CET6-每日备考-${today}.pdf`;
      } catch (pdfError) {
        // PDF 失败时降级为普通提醒，不阻断邮件/推送发送。
        pdfSkippedReason = String(pdfError);
      }
    }

    let emailResult: Record<string, unknown> = { skipped: true };
    if (preference.emailEnabled) {
      const firstTry = await sendReminderEmail({
        to: user.email,
        tasks: taskData.tasks,
        score: user.targetScore,
        slot,
        pdfDownloadUrl,
        pdfAttachmentBase64,
        pdfFileName
      });
      if (!firstTry.ok) {
        const retry = await sendReminderEmail({
          to: user.email,
          tasks: taskData.tasks,
          score: user.targetScore,
          slot,
          pdfDownloadUrl,
          pdfAttachmentBase64,
          pdfFileName
        });
        emailResult = retry;
      } else {
        emailResult = firstTry;
      }
    }

    let pushResult: Record<string, unknown> = { skipped: true };
    if (preference.pushEnabled) {
      const subscriptions = await getPushSubscriptions(user.userId);
      const firstTry = await sendPushNotification(subscriptions, {
        title: "CET-6 片场提醒",
        body: isEveningSlot
          ? `现在是 ${slot}，已为你准备今晚复盘 PDF，点击下载并完成收尾。`
          : `现在是 ${slot}，今天还剩 ${taskData.tasks.filter((task) => !task.completed).length} 个任务待完成。`,
        url: pdfDownloadUrl ?? appUrl
      });
      if (!firstTry.ok) {
        const retry = await sendPushNotification(subscriptions, {
          title: "CET-6 片场提醒（重试）",
          body: "别让今天断档，完成一组任务即可打卡。",
          url: pdfDownloadUrl ?? appUrl
        });
        pushResult = retry;
      } else {
        pushResult = firstTry;
      }
    }

    const result = {
      userId: user.userId,
      slot,
      date: today,
      emailResult,
      pushResult,
      pdfIncluded: Boolean(pdfAttachmentBase64 || pdfDownloadUrl),
      pdfSkipped: Boolean(pdfSkippedReason),
      ...(pdfSkippedReason ? { pdfReason: pdfSkippedReason } : {})
    };
    await markSlotSent(user.userId, slot, today, result);
    return result;
  } catch (userError) {
    return {
      userId: user.userId,
      slot,
      failed: true,
      reason: String(userError)
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret) {
      const incoming =
        request.headers.get("x-cron-secret") ??
        request.headers.get("authorization")?.replace("Bearer ", "");
      if (incoming !== expectedSecret) {
        return errorJson("Cron 鉴权失败", 401);
      }
    }

    const forcedSlot = request.headers.get("x-dev-slot");
    const slot = forcedSlot ?? getCurrentSlot();
    const isEveningSlot = slot === "21:40";
    const today = format(toZonedTime(new Date(), appConfig.reminder.timezone), "yyyy-MM-dd");
    const users = await listReminderUsers();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const summary: Array<Record<string, unknown>> = [];
    for (let start = 0; start < users.length; start += REMINDER_BATCH_SIZE) {
      const batch = users.slice(start, start + REMINDER_BATCH_SIZE);
      const batchSummary = await Promise.all(
        batch.map((user) =>
          processReminderUser({
            user,
            slot,
            today,
            isEveningSlot,
            appUrl
          })
        )
      );
      summary.push(...batchSummary);
    }

    return okJson({
      slot,
      count: summary.length,
      summary
    });
  } catch (error) {
    return errorJson(zhCN.api.reminder.cronFailed, 500, String(error));
  }
}
