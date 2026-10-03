"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase-server";

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
