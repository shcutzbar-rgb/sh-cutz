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

export type MonthAvailability = { date: string; available: boolean }[];

export type AvailabilityOptions = {
  /** Ignorera denna bokning som upptagen (vid flytt av en befintlig bokning). */
  excludeBookingId?: string;
  excludeHoldTokenHash?: string;
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

  const [hoursRes, timeOffRes, bookingsRes, holdsRes, settingsRes] = await Promise.all([
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
    options.adminOverride
      ? Promise.resolve({ data: [], error: null })
      : (() => {
          let query = supabase
            .from("booking_slot_holds")
            .select("start_at,end_at")
            .eq("barber_id", barberId)
            .eq("active", true)
            .gt("expires_at", now.toISOString())
            .lt("start_at", end.toISOString())
            .gt("end_at", start.toISOString());
          if (options.excludeHoldTokenHash) query = query.neq("token_hash", options.excludeHoldTokenHash);
          return query;
        })(),
    supabase.from("shop_settings").select("booking_interval_minutes").eq("id", 1).maybeSingle(),
  ]);
  failOnError(hoursRes.error);
  failOnError(timeOffRes.error);
  failOnError(bookingsRes.error);
  failOnError(holdsRes.error);

  const busy: Interval[] = [...(timeOffRes.data ?? []), ...(bookingsRes.data ?? []), ...(holdsRes.data ?? [])].map((r) => ({
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

export async function getMonthAvailability(
  params: { serviceId: string; barberId: string; month: string },
  now: Date = new Date(),
): Promise<MonthAvailability> {
  const { serviceId, barberId, month } = params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new BookingError("invalid", "Ogiltig månad.", 400);
  }

  const timezone = siteConfig.timezone;
  const supabase = db();
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthAfter = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const rangeStart = dayRange(monthStart, timezone).start;
  const rangeEnd = dayRange(monthAfter, timezone).start;
  const today = todayIn(timezone, now);
  const horizon = addDays(today, BOOKING_CONFIG.maxDaysAhead);

  const [serviceRes, barberRes] = await Promise.all([
    supabase
      .from("services")
      .select("id,name,description,price_sek,duration_minutes,is_active,sort_order")
      .eq("id", serviceId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("barbers").select("id,name").eq("id", barberId).eq("is_active", true).maybeSingle(),
  ]);
  failOnError(serviceRes.error);
  failOnError(barberRes.error);
  if (!serviceRes.data || !barberRes.data) throw new BookingError("not_found", "Tjänst eller frisör finns inte.", 404);

  const [hoursRes, timeOffRes, bookingsRes, holdsRes, settingsRes] = await Promise.all([
    supabase.from("working_hours").select("weekday,start_time,end_time").eq("barber_id", barberId).eq("is_active", true),
    supabase
      .from("time_off")
      .select("start_at,end_at")
      .eq("barber_id", barberId)
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString()),
    supabase
      .from("bookings")
      .select("start_at,end_at")
      .eq("barber_id", barberId)
      .in("status", ["pending", "confirmed"])
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString()),
    supabase
      .from("booking_slot_holds")
      .select("start_at,end_at")
      .eq("barber_id", barberId)
      .eq("active", true)
      .gt("expires_at", now.toISOString())
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString()),
    supabase.from("shop_settings").select("booking_interval_minutes").eq("id", 1).maybeSingle(),
  ]);
  failOnError(hoursRes.error);
  failOnError(timeOffRes.error);
  failOnError(bookingsRes.error);
  failOnError(holdsRes.error);

  const workingHours = hoursRes.data ?? [];
  const busyIntervals: Interval[] = [...(timeOffRes.data ?? []), ...(bookingsRes.data ?? []), ...(holdsRes.data ?? [])].map((row) => ({
    start: new Date(row.start_at),
    end: new Date(row.end_at),
  }));
  const service = mapServiceRow(serviceRes.data);
  const statuses: MonthAvailability = [];

  for (let dayIndex = 0; dayIndex < daysInMonth; dayIndex++) {
    const date = addDays(monthStart, dayIndex);
    if (date < today || date > horizon) {
      statuses.push({ date, available: false });
      continue;
    }

    const { start, end } = dayRange(date, timezone);
    const busy = busyIntervals.filter((interval) => interval.start < end && start < interval.end);
    const slots = computeSlots({
      date,
      timezone,
      durationMinutes: service.durationMinutes,
      stepMinutes: settingsRes.data?.booking_interval_minutes ?? BOOKING_CONFIG.slotStepMinutes,
      workingWindows: workingHours
        .filter((hours) => hours.weekday === weekdayOf(date, timezone))
        .map((hours) => ({ startTime: hours.start_time, endTime: hours.end_time })),
      busy,
      now,
      minNoticeMinutes: BOOKING_CONFIG.minNoticeMinutes,
    });
    statuses.push({ date, available: slots.length > 0 });
  }

  return statuses;
}
