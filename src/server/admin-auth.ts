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
  /** Har en verifierad faktor men sessionen är bara AAL1. */
  | { status: "mfa_required" }
  /** Ägaren kräver MFA men användaren har ingen faktor än. */
  | { status: "mfa_enrollment_required"; admin: AdminContext }
  | { status: "ok"; admin: AdminContext };

export type AdminAuthCode = "unauthenticated" | "forbidden" | "mfa_required" | "mfa_enrollment_required";

export class AdminAuthError extends Error {
  constructor(public readonly code: AdminAuthCode) {
    super(code === "unauthenticated" ? "Inte inloggad." : code === "forbidden" ? "Saknar behörighet." : "Tvåstegsverifiering krävs.");
  }
}

export const MFA_LOGIN_PATH = "/admin/login/mfa";
export const MFA_SETUP_PATH = "/admin/sakerhet?required=1";

type GuardOptions = {
  /** Sidor och actions för att registrera MFA måste nås även när MFA är påtvingat men saknas. */
  allowMfaEnrollment?: boolean;
};

/** staff = alla admins, owner = endast ägare. */
export function hasRole(actual: AdminRole | null | undefined, required: AdminRole): boolean {
  if (!actual) return false;
  return required === "staff" ? true : actual === "owner";
}

// AAL läses ur den signaturverifierade JWT:n. Faktorlistan hämtas från Auth-servern via getUser();
// användarobjektet i cookien (getSession) går att förfalska och används därför aldrig här.
async function currentAal(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data) return null;
    const aal = (data.claims as { aal?: unknown }).aal;
    return typeof aal === "string" ? aal : null;
  } catch {
    return null;
  }
}

/** Vid fel antas MFA krävas (fail closed). */
async function isMfaEnforced(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.from("shop_settings").select("require_admin_mfa").eq("id", 1).maybeSingle();
  if (error) return true;
  return data?.require_admin_mfa === true;
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

  const admin: AdminContext = { userId: user.id, email: user.email ?? null, role: row.role, supabase };

  const hasVerifiedTotp = (user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
  if (hasVerifiedTotp) {
    return (await currentAal(supabase)) === "aal2" ? { status: "ok", admin } : { status: "mfa_required" };
  }

  return (await isMfaEnforced(supabase)) ? { status: "mfa_enrollment_required", admin } : { status: "ok", admin };
}

/** För sidor och layouts: omdirigerar i stället för att kasta. */
export async function requireAdminPage(required: AdminRole = "staff", options: GuardOptions = {}): Promise<AdminContext> {
  const result = await resolveAdmin();
  if (result.status === "anonymous") redirect("/admin/login");
  if (result.status === "not_admin") redirect("/admin/login?error=forbidden");
  if (result.status === "mfa_required") redirect(MFA_LOGIN_PATH);
  if (result.status === "mfa_enrollment_required" && !options.allowMfaEnrollment) redirect(MFA_SETUP_PATH);
  if (!hasRole(result.admin.role, required)) redirect("/admin?denied=1");
  return result.admin;
}

/** För server actions och API-routes: kastar AdminAuthError. */
export async function requireAdminAction(required: AdminRole = "staff", options: GuardOptions = {}): Promise<AdminContext> {
  const result = await resolveAdmin();
  if (result.status === "anonymous") throw new AdminAuthError("unauthenticated");
  if (result.status === "not_admin") throw new AdminAuthError("forbidden");
  if (result.status === "mfa_required") throw new AdminAuthError("mfa_required");
  if (result.status === "mfa_enrollment_required" && !options.allowMfaEnrollment) {
    throw new AdminAuthError("mfa_enrollment_required");
  }
  if (!hasRole(result.admin.role, required)) throw new AdminAuthError("forbidden");
  return result.admin;
}
