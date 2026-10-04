"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dayRange, isValidDateString, parseLocalDateTime, todayIn } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { barberSchema, dayOffSchema, idSchema, timeOffSchema, workingHourSchema } from "@/lib/validation/admin";
import { dbErrorMessage, done, fail, firstIssue, formObject, guardAction } from "@/server/admin-action";

const LIST = "/admin/frisorer";

function revalidatePublic() {
  for (const p of ["/", "/frisorer", "/kontakt", "/boka", LIST]) revalidatePath(p);
}

export async function saveBarber(formData: FormData) {
  const admin = await guardAction("owner", LIST);
  const parsed = barberSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(LIST, firstIssue(parsed.error));

  const { id, name, bio, photoUrl, isActive } = parsed.data;
  const row = { name, bio, photo_url: photoUrl || null, is_active: isActive };

  if (id) {
    const { data, error } = await admin.supabase.from("barbers").update(row).eq("id", id).select("id");
    if (error) fail(LIST, dbErrorMessage(error));
    if (!data || data.length === 0) fail(LIST, "Frisören kunde inte sparas.");
  } else {
    const { error } = await admin.supabase.from("barbers").insert(row);
    if (error) fail(LIST, dbErrorMessage(error));
  }

  revalidatePublic();
  done(LIST, "Frisören är sparad.");
}

export async function deleteBarber(formData: FormData) {
  const admin = await guardAction("owner", LIST);
  const parsed = idSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(LIST, firstIssue(parsed.error));

  const { data, error } = await admin.supabase.from("barbers").delete().eq("id", parsed.data.id).select("id");
  if (error) fail(LIST, dbErrorMessage(error));
  if (!data || data.length === 0) fail(LIST, "Frisören kunde inte tas bort.");

  revalidatePublic();
  done(LIST, "Frisören är borttagen.");
}

function detailPath(raw: Record<string, FormDataEntryValue>): string {
  const id = raw.barberId;
  return typeof id === "string" && z.uuid().safeParse(id).success ? `${LIST}/${id}` : LIST;
}

export async function addWorkingHours(formData: FormData) {
  const raw = formObject(formData);
  const path = detailPath(raw);
  const admin = await guardAction("owner", path);

  const parsed = workingHourSchema.safeParse(raw);
  if (!parsed.success) fail(path, firstIssue(parsed.error));

  const { barberId, weekday, startTime, endTime } = parsed.data;
  const { error } = await admin.supabase
    .from("working_hours")
    .insert({ barber_id: barberId, weekday, start_time: startTime, end_time: endTime });
  if (error) fail(path, dbErrorMessage(error));

  revalidatePublic();
  done(path, "Arbetstiden är tillagd.");
}

export async function deleteWorkingHours(formData: FormData) {
  const raw = formObject(formData);
  const path = detailPath(raw);
  const admin = await guardAction("owner", path);

  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) fail(path, firstIssue(parsed.error));

  const { data, error } = await admin.supabase.from("working_hours").delete().eq("id", parsed.data.id).select("id");
  if (error) fail(path, dbErrorMessage(error));
  if (!data || data.length === 0) fail(path, "Arbetstiden kunde inte tas bort.");

  revalidatePublic();
  done(path, "Arbetstiden är borttagen.");
}

export async function addTimeOff(formData: FormData) {
  const raw = formObject(formData);
  const path = detailPath(raw);
  const admin = await guardAction("owner", path);

  const parsed = timeOffSchema.safeParse(raw);
  if (!parsed.success) fail(path, firstIssue(parsed.error));

  const tz = siteConfig.timezone;
  const { barberId, startAt, endAt, reason } = parsed.data;
  const { error } = await admin.supabase.from("time_off").insert({
    barber_id: barberId,
    start_at: parseLocalDateTime(startAt, tz).toISOString(),
    end_at: parseLocalDateTime(endAt, tz).toISOString(),
    reason: reason || null,
  });
  if (error) fail(path, dbErrorMessage(error));

  revalidatePublic();
  done(path, "Frånvaron är tillagd. Befintliga bokningar i perioden påverkas inte; flytta eller avboka dem vid behov.");
}

export async function addDayOff(formData: FormData) {
  const raw = formObject(formData);
  const path = detailPath(raw);
  const admin = await guardAction("owner", path);
  const parsed = dayOffSchema.safeParse(raw);
  if (!parsed.success) fail(path, firstIssue(parsed.error));

  const { barberId, date, reason } = parsed.data;
  const tz = siteConfig.timezone;
  if (!isValidDateString(date)) fail(path, "Välj ett giltigt datum.");
  if (date < todayIn(tz)) fail(path, "Du kan inte lägga in ledighet bakåt i tiden.");

  const { start, end } = dayRange(date, tz);
  const { error } = await admin.supabase.from("time_off").insert({
    barber_id: barberId,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    reason: reason || null,
  });
  if (error) fail(path, dbErrorMessage(error));

  revalidatePublic();
  done(path, "Hela dagen är markerad som ledig. Befintliga bokningar påverkas inte; flytta eller avboka dem vid behov.");
}

export async function deleteTimeOff(formData: FormData) {
  const raw = formObject(formData);
  const path = detailPath(raw);
  const admin = await guardAction("owner", path);

  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) fail(path, firstIssue(parsed.error));

  const { data, error } = await admin.supabase.from("time_off").delete().eq("id", parsed.data.id).select("id");
  if (error) fail(path, dbErrorMessage(error));
  if (!data || data.length === 0) fail(path, "Frånvaron kunde inte tas bort.");

  revalidatePublic();
  done(path, "Frånvaron är borttagen.");
}
