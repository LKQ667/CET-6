import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { isSupabaseReady } from "@/lib/config";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("邮箱格式错误")
});

function mapOtpError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("for security purposes")
  ) {
    return {
      status: 429,
      hint: "请求过于频繁，请 60 秒后重试，或直接使用最近一封邮件中的验证码。"
    };
  }
  if (normalized.includes("email logins are disabled")) {
    return {
      status: 503,
      hint: "Supabase 邮箱登录未启用，请在 Authentication -> Providers -> Email 开启。"
    };
  }
  if (normalized.includes("smtp") || normalized.includes("error sending")) {
    return {
      status: 502,
      hint: "邮件网关异常，请稍后重试。"
    };
  }
  return {
    status: 500,
    hint: "发送验证码失败，请稍后重试。"
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(zhCN.api.common.validationFailed, 422, parsed.error.flatten());
    }

    if (!isSupabaseReady()) {
      return okJson({
        mockMode: true,
        message: zhCN.api.auth.mockOtpMsg
      });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false
      }
    });
    if (error) {
      const mapped = mapOtpError(error.message);
      return errorJson(zhCN.api.auth.sendOtpFailed, mapped.status, {
        reason: error.message,
        hint: mapped.hint
      });
    }

    return okJson({
      sent: true
    });
  } catch (error) {
    return errorJson(zhCN.api.auth.sendOtpFailed, 500, String(error));
  }
}
