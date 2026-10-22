import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Creates an elevated administrative Supabase client using the private SUPABASE_SERVICE_ROLE_KEY.
 * STRICTLY SERVER-SIDE ONLY. Never import or invoke this in client components or client-facing code.
 * Decoupled from next/headers to allow direct serverless, background, and runtime-testing invocations.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-test-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key";

  return createServerClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
