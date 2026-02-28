import { NextRequest } from "next/server";

import { errorJson, okJson } from "@/lib/api";
import { requireUserId } from "@/lib/auth";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getGameProfile } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserId(request);
    if (!auth.ok || !auth.userId) {
      return errorJson(auth.error ?? zhCN.api.common.unauthorized, 401);
    }
    const data = await getGameProfile(auth.userId);
    return okJson(data);
  } catch (error) {
    return errorJson(zhCN.api.game.profileFailed, 500, String(error));
  }
}

