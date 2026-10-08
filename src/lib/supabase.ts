import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Saknar miljövariabel: ${name}`);
  return value;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/** Client key is public and remains subject to RLS. */
export function createAnonClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Saknar miljövariabel: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    key,
  );
}

/** Server-only key bypasses RLS and must never reach client code. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Saknar miljövariabel: SUPABASE_SECRET_KEY");
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
