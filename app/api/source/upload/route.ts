import path from "node:path";

import { NextRequest } from "next/server";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { isSupabaseReady } from "@/lib/config";
import { zhCN } from "@/lib/i18n/zh-CN";
import { saveUpload } from "@/lib/repository";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { extractTextFromFile } from "@/lib/vocab-extractor";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedExtensions = new Set([".txt", ".pdf"]);
const allowedMimeTypes = new Set([
  "text/plain",
  "application/pdf",
  "application/octet-stream"
]);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return errorJson(zhCN.api.source.invalidUploadContentType, 415);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorJson(zhCN.api.source.invalidFile, 422);
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return errorJson(zhCN.api.source.invalidFile, 422);
    }

    const fileName = path.basename(file.name || "").trim();
    const extension = path.extname(fileName).toLowerCase();
    if (!fileName || !allowedExtensions.has(extension)) {
      return errorJson(zhCN.api.source.unsupportedFileType, 422);
    }
    if (file.size <= 0) {
      return errorJson(zhCN.api.source.emptyFile, 422);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorJson(zhCN.api.source.fileTooLarge, 413);
    }
    const normalizedMime = (file.type || "").toLowerCase();
    if (normalizedMime && !allowedMimeTypes.has(normalizedMime)) {
      return errorJson(zhCN.api.source.unsupportedFileType, 422);
    }

    const arrayBuffer = await file.arrayBuffer();
    const content = Buffer.from(arrayBuffer);
    if (content.byteLength <= 0) {
      return errorJson(zhCN.api.source.emptyFile, 422);
    }

    let text = "";
    try {
      text = await extractTextFromFile(fileName, content);
    } catch {
      return errorJson(zhCN.api.source.parseFileFailed, 422);
    }
    if (!text.trim()) {
      return errorJson(zhCN.api.source.parseFileFailed, 422);
    }

    let filePath = `mock://${fileName}`;
    if (isSupabaseReady()) {
      const supabase = getSupabaseServiceClient();
      filePath = `${auth.userId}/${Date.now()}-${fileName}`;
      const { error } = await supabase.storage
        .from("paper-uploads")
        .upload(filePath, content, {
          contentType: file.type || "application/octet-stream",
          upsert: false
        });
      if (error) {
        return errorJson(`${zhCN.api.source.uploadFailed}: ${error.message}`, 500);
      }
    }

    const upload = await saveUpload({
      userId: auth.userId,
      fileName,
      filePath,
      contentText: text
    });
    return okJson({
      uploadId: upload.id,
      fileName: upload.fileName,
      charCount: text.length,
      parseStatus: upload.status
    });
  } catch (error) {
    return errorJson(zhCN.api.source.uploadFailed, 500, String(error));
  }
}
