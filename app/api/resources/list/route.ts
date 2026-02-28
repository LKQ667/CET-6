import { NextRequest } from "next/server";

import { errorJson, okJson } from "@/lib/api";
import { zhCN } from "@/lib/i18n/zh-CN";
import { listResources } from "@/lib/repository";

export async function GET(_request: NextRequest) {
  try {
    const data = await listResources();
    return okJson(data);
  } catch (error) {
    return errorJson(zhCN.api.resources.listFailed, 500, String(error));
  }
}

