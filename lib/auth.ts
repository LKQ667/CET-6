import { NextRequest } from "next/server";

import { isSupabaseReady } from "@/lib/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthResult {
  ok: boolean;
  userId?: string;
  error?: string;
}

export async function requireUserId(request: NextRequest): Promise<AuthResult> {
  if (!isSupabaseReady()) {
    const fallbackUser = request.headers.get("x-dev-user-id") ?? "demo-user";
    return {
      ok: true,
      userId: fallbackUser
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      error: "缺少 Bearer Token。"
    };
  }
  const accessToken = authHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    return {
      ok: false,
      error: "Token 为空。"
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return {
      ok: false,
      error: "用户鉴权失败。"
    };
  }

  return {
    ok: true,
    userId: data.user.id
  };
}

