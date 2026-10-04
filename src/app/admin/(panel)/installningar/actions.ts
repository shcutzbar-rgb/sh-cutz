"use server";

import { revalidatePath } from "next/cache";
import { settingsSchema } from "@/lib/validation/admin";
import { dbErrorMessage, done, fail, firstIssue, formObject, guardAction } from "@/server/admin-action";

const PATH = "/admin/installningar";

export async function saveSettings(formData: FormData) {
  const admin = await guardAction("owner", PATH);
  const parsed = settingsSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(PATH, firstIssue(parsed.error));

  const v = parsed.data;
  const { error } = await admin.supabase.from("shop_settings").upsert({
    id: 1,
    shop_name: v.shopName,
    phone: v.phone,
    email: v.email || null,
    address_line: v.addressLine,
    city: v.city,
    postal_code: v.postalCode || null,
    booking_interval_minutes: v.bookingIntervalMinutes,
    cancellation_policy: v.cancellationPolicy,
    latitude: v.latitude === "" ? null : Number(v.latitude),
    longitude: v.longitude === "" ? null : Number(v.longitude),
    require_admin_mfa: v.requireAdminMfa,
  });
  if (error) fail(PATH, dbErrorMessage(error));

  for (const p of ["/", "/kontakt", "/boka", PATH]) revalidatePath(p);
  done(PATH, "Inställningarna är sparade.");
}
