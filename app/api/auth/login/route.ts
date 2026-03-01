import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { isSupabaseReady } from "@/lib/config";
import { ensureUserMeta } from "@/lib/repository";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("邮箱格式错误"),
  password: z.string().min(6, "密码至少 6 位")
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson("参数校验失败", 422, parsed.error.flatten());
    }

    const { email, password } = parsed.data;
    if (!isSupabaseReady()) {
      return okJson({
        accessToken: "dev-access-token",
        refreshToken: "dev-refresh-token",
        user: {
          id: "demo-user",
          email
        }
      });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data.user || !data.session) {
      return errorJson(error?.message ?? "邮箱或密码错误", 401, {
        hint: "请检查邮箱/密码，若未注册请先注册。"
      });
    }

    let syncWarning: string | null = null;
    try {
      const service = getSupabaseServiceClient();
      await ensureUserMeta(data.user.id);
      const { error: userUpdateError } = await service
        .from("users")
        .update({
          email,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.user.id);
      if (userUpdateError) {
        syncWarning = `用户资料同步失败: ${userUpdateError.message}`;
      }
    } catch (syncError) {
      syncWarning = `用户资料同步失败: ${String(syncError)}`;
    }

    return okJson({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id ?? randomUUID(),
        email
      },
      syncWarning
    });
  } catch (error) {
    return errorJson("登录失败", 500, String(error));
  }
}

