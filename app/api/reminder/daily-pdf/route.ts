import { NextRequest, NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { buildDailyBriefPdfBuffer } from "@/lib/daily-brief-pdf";
import { verifyDailyPdfToken } from "@/lib/daily-pdf-token";
import { getBeijingDateString } from "@/lib/date";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getBaselineScore, getOrCreateTodayTasks, getVocabToday } from "@/lib/repository";

function badRequest(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const uid = url.searchParams.get("uid");
    const date = url.searchParams.get("date") ?? getBeijingDateString();
    const expRaw = url.searchParams.get("exp");
    const token = url.searchParams.get("token");

    let userId: string | null = null;

    if (uid && expRaw && token) {
      const expiresAt = Number(expRaw);
      if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        return badRequest("PDF 链接已过期。", 401);
      }
      const ok = verifyDailyPdfToken({
        userId: uid,
        date,
        expiresAt,
        token
      });
      if (!ok) {
        return badRequest("PDF 链接签名无效。", 401);
      }
      userId = uid;
    } else {
      const auth = await requireUserId(request);
      if (!auth.ok || !auth.userId) {
        return badRequest(auth.error ?? zhCN.api.common.unauthorized, 401);
      }
      userId = auth.userId;
    }

    const [baseline, taskData, vocab] = await Promise.all([
      getBaselineScore(userId),
      getOrCreateTodayTasks(userId, date),
      getVocabToday(16)
    ]);

    const pdfBuffer = await buildDailyBriefPdfBuffer({
      date,
      prepStartDate: appConfig.prep.startDate,
      prepEndDate: appConfig.prep.endDate,
      targetScore: appConfig.prep.targetScore,
      baseline,
      tasks: taskData.tasks,
      vocab
    });

    const fileName = `CET6-每日备考-${date}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: zhCN.api.reminder.dailyPdfFailed,
        detail: String(error)
      },
      { status: 500 }
    );
  }
}
