import type { SupabaseClient } from "@supabase/supabase-js";

export type MfaLoginResult = "ok" | "invalid" | "no_factor" | "error";

/** Verifierar TOTP-koden efter lösenordsinloggning; lyckad verifiering uppgraderar sessionen till AAL2. */
export async function completeMfaLogin(supabase: SupabaseClient, code: string): Promise<MfaLoginResult> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return "error";
  const factor = data?.totp?.[0];
  if (!factor) return "no_factor";

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  return verifyError ? "invalid" : "ok";
}

export type EnrollStart =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

export async function startTotpEnrollment(supabase: SupabaseClient): Promise<EnrollStart> {
  const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { ok: false, error: "Kunde inte läsa dina faktorer. Försök igen." };
  if (list?.totp?.length) return { ok: false, error: "Tvåstegsverifiering är redan aktiverad." };

  // Avbrutna försök lämnar overifierade faktorer som annars blockerar samma namn.
  for (const factor of list?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "SH-Cutz admin",
    issuer: "SH-Cutz",
  });
  if (error || !data) return { ok: false, error: "Kunde inte starta registreringen. Försök igen." };
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Bekräftar registreringen med första koden; faktorn blir verifierad och sessionen AAL2. */
export async function confirmTotpEnrollment(supabase: SupabaseClient, factorId: string, code: string): Promise<boolean> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return !error;
}

/** Kräver AAL2-session (Supabase nekar annars borttagning av verifierad faktor). */
export async function removeTotp(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { ok: false, error: "Kunde inte läsa dina faktorer. Försök igen." };

  for (const factor of data?.totp ?? []) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (unenrollError) return { ok: false, error: "Kunde inte ta bort faktorn. Logga ut, logga in igen och försök på nytt." };
  }
  return { ok: true };
}
