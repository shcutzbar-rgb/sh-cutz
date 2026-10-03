import { BOOKING_CONFIG } from "@/lib/booking-config";
import { evaluateCancellation, isValidCancelToken } from "@/lib/booking-rules";
import { db, failOnError } from "./db";
import { hashToken } from "./tokens";

export type BookingByToken = {
  id: string;
  status: string;
  startAt: Date;
  endAt: Date;
  serviceName: string;
  priceSek: number;
  barberName: string;
  customerName: string;
  customerEmail: string | null;
};

export type CancelResult =
  | { ok: true; booking: BookingByToken }
  | { ok: false; reason: "invalid" | "too_late" };

type Named<T> = T | T[] | null;
const first = <T>(v: Named<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Slår upp via hash av token. Ogiltigt format eller okänd token ger null. */
export async function findBookingByToken(token: string): Promise<BookingByToken | null> {
  if (!isValidCancelToken(token)) return null;

  const { data, error } = await db()
    .from("bookings")
    .select("id,status,start_at,end_at,customer_name,customer_email,services(name,price_sek),barbers(name)")
    .eq("cancel_token_hash", await hashToken(token))
    .maybeSingle();
  failOnError(error);
  if (!data) return null;

  const service = first<{ name: string; price_sek: number }>(data.services);
  const barber = first<{ name: string }>(data.barbers);
  if (!service || !barber) return null;

  return {
    id: data.id,
    status: data.status,
    startAt: new Date(data.start_at),
    endAt: new Date(data.end_at),
    serviceName: service.name,
    priceSek: service.price_sek,
    barberName: barber.name,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
  };
}

export async function cancelBookingByToken(token: string, now: Date = new Date()): Promise<CancelResult> {
  const booking = await findBookingByToken(token);
  if (!booking) return { ok: false, reason: "invalid" };

  const state = evaluateCancellation(booking.status, booking.startAt, now);
  if (state === "unavailable") return { ok: false, reason: "invalid" };
  if (state === "too_late") return { ok: false, reason: "too_late" };

  // Villkoren upprepas i UPDATE så att samtidiga anrop bara kan avboka en gång.
  const { data, error } = await db()
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id)
    .in("status", ["pending", "confirmed"])
    .gte("start_at", new Date(now.getTime() + BOOKING_CONFIG.cancelDeadlineMinutes * 60_000).toISOString())
    .select("id");
  failOnError(error);
  if (!data || data.length === 0) return { ok: false, reason: "invalid" };

  return { ok: true, booking: { ...booking, status: "cancelled" } };
}
