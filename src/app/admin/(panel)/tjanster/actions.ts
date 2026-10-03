"use server";

import { revalidatePath } from "next/cache";
import { serviceSchema, idSchema } from "@/lib/validation/admin";
import { dbErrorMessage, done, fail, firstIssue, formObject, guardAction } from "@/server/admin-action";

const PATH = "/admin/tjanster";

function revalidatePublic() {
  for (const p of ["/", "/tjanster", "/boka", PATH]) revalidatePath(p);
}

export async function saveService(formData: FormData) {
  const admin = await guardAction("owner", PATH);
  const parsed = serviceSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(PATH, firstIssue(parsed.error));

  const { id, name, description, priceSek, durationMinutes, sortOrder, isActive } = parsed.data;
  const row = {
    name,
    description,
    price_sek: priceSek,
    duration_minutes: durationMinutes,
    sort_order: sortOrder,
    is_active: isActive,
  };

  if (id) {
    const { data, error } = await admin.supabase.from("services").update(row).eq("id", id).select("id");
    if (error) fail(PATH, dbErrorMessage(error));
    if (!data || data.length === 0) fail(PATH, "Tjänsten kunde inte sparas.");
  } else {
    const { error } = await admin.supabase.from("services").insert(row);
    if (error) fail(PATH, dbErrorMessage(error));
  }

  revalidatePublic();
  done(PATH, "Tjänsten är sparad.");
}

export async function deleteService(formData: FormData) {
  const admin = await guardAction("owner", PATH);
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(PATH, firstIssue(parsed.error));

  const { data, error } = await admin.supabase.from("services").delete().eq("id", parsed.data.id).select("id");
  if (error) fail(PATH, dbErrorMessage(error));
  if (!data || data.length === 0) fail(PATH, "Tjänsten kunde inte tas bort.");

  revalidatePublic();
  done(PATH, "Tjänsten är borttagen.");
}
