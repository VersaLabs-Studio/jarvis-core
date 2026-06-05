import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@jarvis/shared";

let _supabase: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client (lazy-initialized).
 * Only initializes when actually called at runtime, not at module import time.
 * This prevents build-time failures when env vars aren't set.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

/** Convenience export — calls getSupabase() on first access */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient<Database>];
  },
});
