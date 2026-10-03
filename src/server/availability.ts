import { BOOKING_CONFIG } from "@/lib/booking-config";
import { addDays, dayRange, isValidDateString, todayIn, weekdayOf } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import type { Service } from "@/types/shop";
import { mapServiceRow } from "@/lib/services";
import { db, failOnError } from "./db";
import { BookingError } from "./errors";
import { computeSlots, type Interval } from "./slots";

export type Availability = {
  service: Service;
  barber: { id: string; name: string };
  slots: Date[];
};

export type AvailabilityOptions = {
  /** Ignorera denna bokning som upptagen (vid flytt av en befintlig bokning). */
  excludeBookingId?: string;
  /** Admin: ingen minsta framförhållning och ingen bokningshorisont. */
  adminOverride?: boolean;
};

export async function getAvailability(
  params: { serviceId: string; barberId: string; date: string },
  now: Date = new Date(),
  options: AvailabilityOptions = {},
): Promise<Availability> {
  const timezone = siteConfig.timezone;
  const { serviceId, barberId, date } = params;

  if (!isValidDateString(date)) throw new BookingError("invalid", "Ogiltigt datum.", 400);

  const supabase = db();

  // Admin får flytta bokningar även om tjänsten eller frisören inaktiverats efteråt.
  let serviceQuery = supabase
    .from("services")
    .select("id,name,description,price_sek,duration_minutes,is_active,sort_order")
    .eq("id", serviceId);
  let barberQuery = supabase.from("barbers").select("id,name").eq("id", barberId);
  if (!options.adminOverride) {
    serviceQuery = serviceQuery.eq("is_active", true);
    barberQuery = barberQuery.eq("is_active", true);
  }

  const [serviceRes, barberRes] = await Promise.all([serviceQuery.maybeSingle(), barberQuery.maybeSingle()]);
  failOnError(serviceRes.error);
  failOnError(barberRes.error);
  if (!serviceRes.data || !barberRes.data) throw new BookingError("not_found", "Tjänst eller frisör finns inte.", 404);

  const service = mapServiceRow(serviceRes.data);
  const barber = barberRes.data;

  const today = todayIn(timezone, now);
  const horizon = options.adminOverride ? null : addDays(today, BOOKING_CONFIG.maxDaysAhead);
  if (date < today || (horizon && date > horizon)) {
    return { service, barber, slots: [] };
  }

  const { start, end } = dayRange(date, timezone);

  let bookingsQuery = supabase
    .from("bookings")
    .select("start_at,end_at")
    .eq("barber_id", barberId)
    .in("status", ["pending", "confirmed"])
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());
  if (options.excludeBookingId) bookingsQuery = bookingsQuery.neq("id", options.excludeBookingId);

  const [hoursRes, timeOffRes, bookingsRes, settingsRes] = await Promise.all([
    supabase
      .from("working_hours")
      .select("start_time,end_time")
      .eq("barber_id", barberId)
      .eq("weekday", weekdayOf(date, timezone))
      .eq("is_active", true),
    supabase
      .from("time_off")
      .select("start_at,end_at")
      .eq("barber_id", barberId)
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString()),
    bookingsQuery,
    supabase.from("shop_settings").select("booking_interval_minutes").eq("id", 1).maybeSingle(),
  ]);
  failOnError(hoursRes.error);
  failOnError(timeOffRes.error);
  failOnError(bookingsRes.error);

  const busy: Interval[] = [...(timeOffRes.data ?? []), ...(bookingsRes.data ?? [])].map((r) => ({
    start: new Date(r.start_at),
    end: new Date(r.end_at),
  }));

  const slots = computeSlots({
    date,
    timezone,
    durationMinutes: service.durationMinutes,
    stepMinutes: settingsRes.data?.booking_interval_minutes ?? BOOKING_CONFIG.slotStepMinutes,
    workingWindows: (hoursRes.data ?? []).map((h) => ({ startTime: h.start_time, endTime: h.end_time })),
    busy,
    now,
    minNoticeMinutes: options.adminOverride ? 0 : BOOKING_CONFIG.minNoticeMinutes,
  });

  return { service, barber, slots };
}
