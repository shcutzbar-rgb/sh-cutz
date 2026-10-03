"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { BOOKING_STATUSES } from "@/lib/booking-rules";
import { BookingError } from "@/server/errors";
import { changeBookingStatus, moveBooking } from "@/server/admin-bookings";
import { done, fail, firstIssue, formObject, guardAction, safeAdminPath } from "@/server/admin-action";
import { sendCancelledEmail } from "@/server/notifications";

const LIST = "/admin/bokningar";

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(BOOKING_STATUSES as [string, ...string[]]),
});

export async function setBookingStatus(formData: FormData) {
  const returnTo = safeAdminPath(formData.get("returnTo"), LIST);
  const admin = await guardAction("staff", returnTo);

  const parsed = statusSchema.safeParse(formObject(formData));
  if (!parsed.success) fail(returnTo, firstIssue(parsed.error));

  let message: string;
  try {
    const result = await changeBookingStatus(admin, parsed.data.id, parsed.data.status as (typeof BOOKING_STATUSES)[number]);
    if (!result.ok) fail(returnTo, result.error);
    const { booking } = result;
    if (booking.status === "cancelled" && booking.customerEmail) {
      const email = booking.customerEmail;
      after(() => sendCancelledEmail(booking, email));
    }
    message = "Bokningen är uppdaterad.";
  } catch (err) {
    if (err instanceof BookingError) fail(returnTo, err.message);
    throw err;
  }

  revalidatePath("/admin", "layout");
  done(returnTo, message);
}

const moveSchema = z.object({
  id: z.uuid(),
  barberId: z.uuid(),
  startAt: z.iso.datetime({ offset: true }),
});

export async function moveBookingAction(formData: FormData) {
  const raw = formObject(formData);
  const back = typeof raw.id === "string" && z.uuid().safeParse(raw.id).success ? `${LIST}/${raw.id}/flytta` : LIST;
  const admin = await guardAction("staff", back);

  const parsed = moveSchema.safeParse(raw);
  if (!parsed.success) fail(back, firstIssue(parsed.error));

  let message: string;
  try {
    const result = await moveBooking(admin, {
      bookingId: parsed.data.id,
      barberId: parsed.data.barberId,
      startAt: parsed.data.startAt,
    });
    if (!result.ok) fail(back, result.error);
    message = "Bokningen är flyttad.";
  } catch (err) {
    if (err instanceof BookingError) fail(back, err.message);
    throw err;
  }

  revalidatePath("/admin", "layout");
  done(LIST, message);
}
