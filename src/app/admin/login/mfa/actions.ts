"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase-server";
import { mfaCodeSchema } from "@/lib/validation/admin";
import { resolveAdmin } from "@/server/admin-auth";
import { completeMfaLogin } from "@/server/admin-mfa";
import { isRateLimited } from "@/server/request-guards";

const PAGE = "/admin/login/mfa";

export async function verifyMfa(formData: FormData) {
  const resolved = await resolveAdmin();
  if (resolved.status === "anonymous" || resolved.status === "not_admin") redirect("/admin/login");
  if (resolved.status === "ok") redirect("/admin");
  if (resolved.status === "mfa_enrollment_required") redirect("/admin/sakerhet?required=1");

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");
  if (isRateLimited(`mfa:${data.user.id}`, 10, 10 * 60_000)) redirect(`${PAGE}?error=rate`);

  const parsed = mfaCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${PAGE}?error=format`);

  const result = await completeMfaLogin(supabase, parsed.data.code);
  if (result === "ok") redirect("/admin");
  redirect(`${PAGE}?error=${result === "invalid" ? "invalid" : "unavailable"}`);
}
