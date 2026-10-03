import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase-server";

export type AdminRole = "owner" | "staff";

export const ROLE_LABEL: Record<AdminRole, string> = { owner: "Ägare", staff: "Personal" };

export type AdminContext = {
  userId: string;
  email: string | null;
  role: AdminRole;
  /** Användarens egen klient: RLS gäller även om koden skulle missa en kontroll. */
  supabase: SupabaseClient;
};

export type AdminResolution =
  | { status: "anonymous" }
  | { status: "not_admin" }
  | { status: "ok"; admin: AdminContext };

export class AdminAuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden") {
    super(code === "unauthenticated" ? "Inte inloggad." : "Saknar behörighet.");
  }
}

/** staff = alla admins, owner = endast ägare. */
export function hasRole(actual: AdminRole | null | undefined, required: AdminRole): boolean {
  if (!actual) return false;
  return required === "staff" ? true : actual === "owner";
}

export async function resolveAdmin(): Promise<AdminResolution> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { status: "anonymous" };
  }

  const supabase = await createSessionClient();
  // getUser() validerar sessionen mot Supabase; cookien litas aldrig på ensam.
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { status: "anonymous" };

  const { data: row } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle();
  if (!row || (row.role !== "owner" && row.role !== "staff")) return { status: "not_admin" };

  return { status: "ok", admin: { userId: user.id, email: user.email ?? null, role: row.role, supabase } };
}

/** För sidor och layouts: omdirigerar i stället för att kasta. */
export async function requireAdminPage(required: AdminRole = "staff"): Promise<AdminContext> {
  const result = await resolveAdmin();
  if (result.status === "anonymous") redirect("/admin/login");
  if (result.status === "not_admin") redirect("/admin/login?error=forbidden");
  if (!hasRole(result.admin.role, required)) redirect("/admin?denied=1");
  return result.admin;
}

/** För server actions och API-routes: kastar AdminAuthError. */
export async function requireAdminAction(required: AdminRole = "staff"): Promise<AdminContext> {
  const result = await resolveAdmin();
  if (result.status === "anonymous") throw new AdminAuthError("unauthenticated");
  if (result.status === "not_admin" || !hasRole(result.admin.role, required)) {
    throw new AdminAuthError("forbidden");
  }
  return result.admin;
}
