import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { importBuiltinResources } from "@/lib/repository";

const schema = z.object({
  resourceIds: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }

    const result = await importBuiltinResources(auth.userId, parsed.data.resourceIds);
    return okJson(result);
  } catch (error) {
    return errorJson(zhCN.api.resources.importFailed, 500, String(error));
  }
}

