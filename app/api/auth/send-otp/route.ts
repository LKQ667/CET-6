import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { isSupabaseReady } from "@/lib/config";
import { zhCN } from "@/lib/i18n/zh-CN";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("邮箱格式错误")
});

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

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email
    });
    if (error) {
      return errorJson(`${zhCN.api.auth.sendOtpFailed}: ${error.message}`, 500);
    }

    return okJson({
      sent: true
    });
  } catch (error) {
    return errorJson(zhCN.api.auth.sendOtpFailed, 500, String(error));
  }
}
