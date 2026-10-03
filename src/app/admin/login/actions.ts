"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase-server";
import { isRateLimited } from "@/server/request-guards";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export async function login(formData: FormData) {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`login:${ip}`, 10, 10 * 60_000)) redirect("/admin/login?error=rate");
  if (!isSupabaseConfigured()) redirect("/admin/login?error=config");

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/login?error=invalid");

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) redirect("/admin/login?error=invalid");

  // Samma felmeddelande för "fel lösenord" och "inte admin" så att kontoexistens inte läcker.
  const { data: row } = await supabase.from("admin_users").select("role").eq("id", data.user.id).maybeSingle();
  if (!row) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=invalid");
  }

  redirect("/admin");
}
