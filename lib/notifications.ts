import { Resend } from "resend";
import webPush from "web-push";

import { appConfig } from "@/lib/config";
import type { DailyTask } from "@/lib/types";

interface SendReminderInput {
  to: string;
  tasks: DailyTask[];
  score: number;
  slot: string;
  pdfDownloadUrl?: string;
  pdfAttachmentBase64?: string;
  pdfFileName?: string;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendReminderEmail(input: SendReminderInput) {
  const resend = getResendClient();
  if (!resend) {
    return {
      ok: false,
      reason: "RESEND_API_KEY 未配置，跳过邮件发送。"
    };
  }

  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? "noreply@example.com";
  const content = input.tasks
    .map((task) => `- ${task.title}（${task.estimatedMinutes} 分钟）`)
    .join("<br/>");
  const isEvening = input.slot === "21:40";
  const eveningHint = isEvening
    ? "<p>今晚提醒已附上“每日学习 PDF”，请下载后按顺序复盘。</p>"
    : "";
  const pdfLink = input.pdfDownloadUrl
    ? `<p>PDF 下载链接：<a href="${input.pdfDownloadUrl}" target="_blank" rel="noreferrer">${input.pdfDownloadUrl}</a></p>`
    : "";

  const { error } = await resend.emails.send({
    from: `CET-6 片场提醒 <${fromEmail}>`,
    to: input.to,
    subject: "今日六级任务提醒：12:00 / 21:40 记得打卡",
    html: `<p>你的目标分：${input.score}+，今日任务如下：</p><p>${content}</p>${eveningHint}${pdfLink}<p>时区：${appConfig.reminder.timezone}</p>`,
    attachments:
      isEvening && input.pdfAttachmentBase64
        ? [
            {
              filename: input.pdfFileName ?? "CET6-每日备考.pdf",
              content: input.pdfAttachmentBase64
            }
          ]
        : undefined
  });

  if (error) {
    return {
      ok: false,
      reason: error.message
    };
  }
  return { ok: true as const };
}

function setupWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return false;
  }
  webPush.setVapidDetails("mailto:admin@example.com", publicKey, privateKey);
  return true;
}

export async function sendPushNotification(
  subscriptions: Array<Record<string, unknown>>,
  payload: { title: string; body: string; url: string }
) {
  if (!setupWebPush()) {
    return {
      ok: false,
      reason: "VAPID 未配置，跳过 Push 发送。"
    };
  }

  const failed: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription, index) => {
      try {
        await webPush.sendNotification(
          subscription as unknown as webPush.PushSubscription,
          JSON.stringify(payload)
        );
      } catch (error) {
        failed.push(`sub-${index}:${String(error)}`);
      }
    })
  );
  return {
    ok: failed.length === 0,
    failed
  };
}
