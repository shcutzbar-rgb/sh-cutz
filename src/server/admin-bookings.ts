import { canAccessBarber } from "@/lib/barber-access";
import { canChangeStatus, isBookingStatus, isMovable, type BookingStatus } from "@/lib/booking-rules";
import { dateIn, dayRange, isValidDateString } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import type { AdminContext } from "./admin-auth";
import { getAvailability } from "./availability";
import { BookingError } from "./errors";

export const BOOKING_SELECT =
  "id,status,start_at,end_at,created_at,barber_id,service_id,customer_name,customer_phone,customer_email,notes,services(name,price_sek,duration_minutes),barbers(name)";

export type AdminBooking = {
  id: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  barberId: string;
  serviceId: string;
  serviceName: string;
  priceSek: number;
  durationMinutes: number;
  barberName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
};

type Named<T> = T | T[] | null;
const first = <T>(v: Named<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBookingRow(row: any): AdminBooking {
  const service = first<{ name: string; price_sek: number; duration_minutes: number }>(row.services);
  const barber = first<{ name: string }>(row.barbers);
  return {
    id: row.id,
    status: isBookingStatus(row.status) ? row.status : "pending",
    startAt: new Date(row.start_at),
    endAt: new Date(row.end_at),
    barberId: row.barber_id,
    serviceId: row.service_id,
    serviceName: service?.name ?? "Okänd tjänst",
    priceSek: service?.price_sek ?? 0,
    durationMinutes: service?.duration_minutes ?? 0,
    barberName: barber?.name ?? "Okänd frisör",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    notes: row.notes,
  };
}

export async function getBooking(admin: AdminContext, id: string): Promise<AdminBooking | null> {
  const { data, error } = await admin.supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) throw new BookingError("unavailable", "Databasfel.", 503);
  return data ? mapBookingRow(data) : null;
}

export type ChangeResult = { ok: true; booking: AdminBooking } | { ok: false; error: string };

export async function changeBookingStatus(
  admin: AdminContext,
  id: string,
  to: BookingStatus,
  now: Date = new Date(),
): Promise<ChangeResult> {
  const booking = await getBooking(admin, id);
  if (!booking) return { ok: false, error: "Bokningen finns inte." };

  const check = canChangeStatus(booking.status, to, booking.startAt, now);
  if (!check.ok) return check;

  // Villkoret på nuvarande status gör att två admins inte skriver över varandra.
  const { data, error } = await admin.supabase
    .from("bookings")
    .update({ status: to })
    .eq("id", id)
    .eq("status", booking.status)
    .select("id");
  if (error) return { ok: false, error: "Kunde inte uppdatera bokningen." };
  if (!data || data.length === 0) return { ok: false, error: "Bokningen ändrades just av någon annan. Ladda om sidan." };

  return { ok: true, booking: { ...booking, status: to } };
}

const EXCLUSION_VIOLATION = "23P01";

export type MoveResult =
  | { ok: true; booking: AdminBooking; previous: { startAt: Date; endAt: Date; barberName: string } }
  | { ok: false; error: string };

export async function moveBooking(
  admin: AdminContext,
  input: { bookingId: string; barberId: string; startAt: string },
  now: Date = new Date(),
): Promise<MoveResult> {
  const booking = await getBooking(admin, input.bookingId);
  if (!booking) return { ok: false, error: "Bokningen finns inte." };
  if (!isMovable(booking.status)) return { ok: false, error: "Endast väntande och bekräftade bokningar kan flyttas." };
  if (!canAccessBarber(admin, booking.barberId) || !canAccessBarber(admin, input.barberId)) {
    return { ok: false, error: "Du kan bara hantera bokningar för din egen frisör." };
  }

  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Ogiltig tid." };

  // Samma slot-logik som publik bokning, men utan framförhållningskrav och utan att bokningen blockerar sig själv.
  const { service, barber, slots } = await getAvailability(
    { serviceId: booking.serviceId, barberId: input.barberId, date: dateIn(siteConfig.timezone, start) },
    now,
    { excludeBookingId: booking.id, adminOverride: true },
  );
  if (!slots.some((s) => s.getTime() === start.getTime())) {
    return { ok: false, error: "Tiden är inte ledig. Välj en annan tid." };
  }

  const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const { data, error } = await admin.supabase
    .from("bookings")
    .update({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      barber_id: input.barberId,
      reminder_sent_at: null,
    })
    .eq("id", booking.id)
    .in("status", ["pending", "confirmed"])
    .select("id");

  if (error?.code === EXCLUSION_VIOLATION) return { ok: false, error: "Tiden hann bli bokad. Välj en annan tid." };
  if (error) return { ok: false, error: "Kunde inte flytta bokningen." };
  if (!data || data.length === 0) return { ok: false, error: "Bokningen kunde inte flyttas (status ändrad)." };

  return {
    ok: true,
    booking: { ...booking, startAt: start, endAt: end, barberId: input.barberId, barberName: barber.name },
    previous: { startAt: booking.startAt, endAt: booking.endAt, barberName: booking.barberName },
  };
}

export type BookingFilters = {
  status?: BookingStatus;
  barberId?: string;
  from?: string;
  to?: string;
  q?: string;
};

/** Tar bort tecken med betydelse i PostgREST-filter och LIKE. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*_\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
}

export async function listBookings(admin: AdminContext, filters: BookingFilters, limit = 200): Promise<AdminBooking[]> {
  const tz = siteConfig.timezone;
  let query = admin.supabase.from("bookings").select(BOOKING_SELECT).order("start_at", { ascending: true }).limit(limit);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.barberId) query = query.eq("barber_id", filters.barberId);
  if (filters.from && isValidDateString(filters.from)) query = query.gte("start_at", dayRange(filters.from, tz).start.toISOString());
  if (filters.to && isValidDateString(filters.to)) query = query.lt("start_at", dayRange(filters.to, tz).end.toISOString());
  const q = filters.q ? sanitizeSearch(filters.q) : "";
  if (q) query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw new BookingError("unavailable", "Databasfel.", 503);
  return (data ?? []).map(mapBookingRow);
}

export async function listBookingsBetween(admin: AdminContext, start: Date, end: Date, barberId?: string) {
  let query = admin.supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString())
    .order("start_at", { ascending: true });
  if (barberId) query = query.eq("barber_id", barberId);
  const { data, error } = await query;
  if (error) throw new BookingError("unavailable", "Databasfel.", 503);
  return (data ?? []).map(mapBookingRow);
}
