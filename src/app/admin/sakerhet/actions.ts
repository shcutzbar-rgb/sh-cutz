"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mfaCodeSchema } from "@/lib/validation/admin";
import { done, fail, formObject, guardAction } from "@/server/admin-action";
import { confirmTotpEnrollment, removeTotp, startTotpEnrollment } from "@/server/admin-mfa";
import { isRateLimited } from "@/server/request-guards";

const PAGE = "/admin/sakerhet";
// Registreringen måste fungera även när MFA är påtvingat men saknas.
const ENROLL = { allowMfaEnrollment: true } as const;
const RATE_LIMITED = "För många försök. Vänta en stund och försök igen.";

export type EnrollState =
  | { step: "idle" }
  | { step: "verify"; factorId: string; qrCode: string; secret: string }
  | { step: "error"; error: string };

export async function startEnrollment(): Promise<EnrollState> {
  const admin = await guardAction("staff", PAGE, ENROLL);
  if (isRateLimited(`mfa-enroll:${admin.userId}`, 10, 10 * 60_000)) return { step: "error", error: RATE_LIMITED };

  const result = await startTotpEnrollment(admin.supabase);
  return result.ok
    ? { step: "verify", factorId: result.factorId, qrCode: result.qrCode, secret: result.secret }
    : { step: "error", error: result.error };
}

const confirmSchema = mfaCodeSchema.extend({ factorId: z.uuid() });

/** Returnerar ett felmeddelande, eller omdirigerar vid lyckad aktivering. */
export async function confirmEnrollment(_prev: string | null, formData: FormData): Promise<string | null> {
  const admin = await guardAction("staff", PAGE, ENROLL);
  if (isRateLimited(`mfa-enroll:${admin.userId}`, 10, 10 * 60_000)) return RATE_LIMITED;

  const parsed = confirmSchema.safeParse(formObject(formData));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Kontrollera koden.";

  if (!(await confirmTotpEnrollment(admin.supabase, parsed.data.factorId, parsed.data.code))) {
    return "Fel kod. Kontrollera koden i din autentiseringsapp och försök igen.";
  }

  revalidatePath("/admin", "layout");
  done(PAGE, "Tvåstegsverifiering är aktiverad.");
}

export async function removeFactor() {
  const admin = await guardAction("staff", PAGE);
  const result = await removeTotp(admin.supabase);
  if (!result.ok) fail(PAGE, result.error);

  revalidatePath("/admin", "layout");
  done(PAGE, "Tvåstegsverifiering är borttagen.");
}
