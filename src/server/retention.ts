import { BOOKING_CONFIG } from "@/lib/booking-config";
import { db, failOnError } from "./db";

export const ANONYMIZED_NAME = "Raderad";

/** Bokningar vars starttid ligger före detta datum ska anonymiseras. */
export function retentionCutoff(now: Date, months: number = BOOKING_CONFIG.retentionMonths): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/** Tar bort personuppgifter men behåller tjänst, tid och status för statistik. Returnerar antal bokningar. */
export async function anonymizeOldBookings(now: Date = new Date()): Promise<number> {
  const { data, error } = await db()
    .from("bookings")
    .update({ customer_name: ANONYMIZED_NAME, customer_phone: "", customer_email: null, notes: null })
    .lt("start_at", retentionCutoff(now).toISOString())
    .neq("customer_name", ANONYMIZED_NAME)
    .select("id");
  failOnError(error);
  return data?.length ?? 0;
}
