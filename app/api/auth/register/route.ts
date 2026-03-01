import { NextRequest } from "next/server";
import { z } from "zod";

import { errorJson, okJson } from "@/lib/api";
import { isSupabaseReady } from "@/lib/config";
import { ensureUserMeta } from "@/lib/repository";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

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

    const email = parsed.data.email.trim();
    const password = parsed.data.password;
    if (!isSupabaseReady()) {
      return okJson({
        registered: true,
        mockMode: true,
        message: "当前为本地演示模式，已模拟注册成功。"
      });
    }

    const service = getSupabaseServiceClient();
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        return okJson({
          registered: true,
          alreadyExists: true,
          message: "该邮箱已注册，无需重复注册，请直接密码登录。"
        });
      }
      return errorJson("注册失败", 400, error.message);
    }

    if (data.user?.id) {
      try {
        await ensureUserMeta(data.user.id);
        await service
          .from("users")
          .update({
            email,
            updated_at: new Date().toISOString()
          })
          .eq("id", data.user.id);
      } catch {
        // 不阻塞注册成功返回
      }
    }

    return okJson({
      registered: true,
      userId: data.user?.id ?? null,
      message: "注册成功，请使用密码登录。"
    });
  } catch (error) {
    return errorJson("注册失败", 500, String(error));
  }
}
