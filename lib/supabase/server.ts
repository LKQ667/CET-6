import { createClient } from "@supabase/supabase-js";

import { getEnvOrThrow } from "@/lib/config";

export function getSupabaseServerClient() {
  return createClient(
    getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export function getSupabaseServiceClient() {
  return createClient(
    getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

