import { BOOKING_CONFIG } from "@/lib/booking-config";
import { addDays, dayRange, isValidDateString, todayIn, weekdayOf } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase";
import type { Service } from "@/types/shop";
import { mapServiceRow } from "@/lib/services";
import { BookingError } from "./errors";
import { computeSlots, type Interval } from "./slots";

export type Availability = {
  service: Service;
  barber: { id: string; name: string };
  slots: Date[];
};

function db() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new BookingError("unavailable", "Bokning är tillfälligt otillgänglig.", 503);
  }
  return createServiceClient();
}

function failOnError(error: { message: string } | null) {
  if (error) {
    console.error("Databasfel:", error.message);
    throw new BookingError("unavailable", "Bokning är tillfälligt otillgänglig.", 503);
  }
}

export async function getAvailability(
  params: { serviceId: string; barberId: string; date: string },
  now: Date = new Date(),
): Promise<Availability> {
  const timezone = siteConfig.timezone;
  const { serviceId, barberId, date } = params;

  if (!isValidDateString(date)) throw new BookingError("invalid", "Ogiltigt datum.", 400);

  const supabase = db();

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

  const service = mapServiceRow(serviceRes.data);
  const barber = barberRes.data;

  const today = todayIn(timezone, now);
  if (date < today || date > addDays(today, BOOKING_CONFIG.maxDaysAhead)) {
    return { service, barber, slots: [] };
  }

  const { start, end } = dayRange(date, timezone);

  const [hoursRes, timeOffRes, bookingsRes] = await Promise.all([
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
    supabase
      .from("bookings")
      .select("start_at,end_at")
      .eq("barber_id", barberId)
      .in("status", ["pending", "confirmed"])
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString()),
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
    stepMinutes: BOOKING_CONFIG.slotStepMinutes,
    workingWindows: (hoursRes.data ?? []).map((h) => ({ startTime: h.start_time, endTime: h.end_time })),
    busy,
    now,
    minNoticeMinutes: BOOKING_CONFIG.minNoticeMinutes,
  });

  return { service, barber, slots };
}
