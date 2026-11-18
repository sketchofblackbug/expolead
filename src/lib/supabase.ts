import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type TypedSupabaseClient = SupabaseClient<Database>;

/** True when public Supabase env vars are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Shared Supabase client for browser and server (anon key).
 * - Browser: cookie-backed SSR client (auth + data)
 * - Server modules that aren't request-scoped: ephemeral anon client
 */
export function createSupabaseClient(): TypedSupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  if (typeof window !== "undefined") {
    return createBrowserSupabaseClient();
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * Optional server-only client using the service role key.
 * Never import this into client components — it bypasses RLS.
 */
export function createSupabaseServiceClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (typeof window !== "undefined") {
    throw new Error("createSupabaseServiceClient() must only be used on the server");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
