import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getVocabProvenance } from "@/lib/repository";

const idSchema = z.object({
  id: z.string().uuid("词汇 ID 非法")
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const params = await context.params;
    const parsed = idSchema.safeParse(params);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }
    const data = await getVocabProvenance(parsed.data.id);
    return okJson(data);
  } catch (error) {
    return errorJson(zhCN.api.vocab.getProvenanceFailed, 500, String(error));
  }
}
