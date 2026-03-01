import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { isSupabaseReady } from "@/lib/config";
import { zhCN } from "@/lib/i18n/zh-CN";
import { ensureUserMeta } from "@/lib/repository";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("邮箱格式错误"),
  token: z.string().trim().min(4, "验证码过短")
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }

    const email = parsed.data.email.trim();
    const token = parsed.data.token;
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
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email"
    });
    if (error || !data.user || !data.session) {
      return errorJson(error?.message ?? zhCN.api.auth.verifyOtpFailed, 401, {
        hint: "验证码可能已过期或已被使用，请重新发送最新验证码。",
        email
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
      console.error("[verify-otp] user meta sync failed", syncError);
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
    return errorJson(zhCN.api.auth.verifyOtpFailed, 500, String(error));
  }
}
