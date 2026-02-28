import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import {
  getUploadById,
  markUploadParsed,
  saveCandidates
} from "@/lib/repository";
import { extractCandidatesFromText } from "@/lib/vocab-extractor";

const schema = z.object({
  uploadId: z.string().uuid("uploadId 非法")
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

    const upload = await getUploadById(parsed.data.uploadId);
    if (!upload || upload.userId !== auth.userId) {
      return errorJson(zhCN.api.source.uploadNotFound, 404);
    }
    const candidates = extractCandidatesFromText(upload.contentText);
    const saved = await saveCandidates(upload.id, auth.userId, candidates);
    await markUploadParsed(upload.id);
    return okJson({
      uploadId: upload.id,
      candidateCount: saved.length,
      candidates: saved
    });
  } catch (error) {
    return errorJson(zhCN.api.source.extractFailed, 500, String(error));
  }
}
