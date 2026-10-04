import { evaluateReadiness, type ReadinessIssue } from "@/lib/launch-readiness";
import type { AdminContext } from "./admin-auth";

export async function getLaunchReadiness(admin: AdminContext): Promise<ReadinessIssue[]> {
  const [settings, hours] = await Promise.all([
    admin.supabase
      .from("shop_settings")
      .select("postal_code,contact_confirmed_at,hours_confirmed_at")
      .eq("id", 1)
      .maybeSingle(),
    admin.supabase.from("working_hours").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return evaluateReadiness({
    contactConfirmed: Boolean(settings.data?.contact_confirmed_at),
    hoursConfirmed: Boolean(settings.data?.hours_confirmed_at),
    workingHoursCount: hours.count ?? 0,
    postalCode: settings.data?.postal_code ?? null,
  });
}
