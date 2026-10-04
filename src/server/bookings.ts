import { dateIn } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import type { CreateBookingInput } from "@/lib/validation/booking";
import { getAvailability } from "./availability";
import { db } from "./db";
import { BookingError } from "./errors";
import { generateCancelToken, hashToken } from "./tokens";

export type CreatedBooking = {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  barberName: string;
  priceSek: number;
  /** Rå token, visas bara en gång. Endast hashen lagras. */
  cancelToken: string;
};

const EXCLUSION_VIOLATION = "23P01";
const UNIQUE_VIOLATION = "23505";

export async function createBooking(input: CreateBookingInput, now: Date = new Date()): Promise<CreatedBooking> {
  const start = new Date(input.startAt);
  const date = dateIn(siteConfig.timezone, start);
  const holdTokenHash = await hashToken(input.holdToken);

  // Servern avgör alltid om tiden är ledig; klientens val litas inte på.
  const { service, barber, slots } = await getAvailability(
    { serviceId: input.serviceId, barberId: input.barberId, date },
    now,
    { excludeHoldTokenHash: holdTokenHash },
  );
  if (!slots.some((s) => s.getTime() === start.getTime())) {
    throw new BookingError("slot_unavailable", "Tiden är inte längre ledig. Välj en annan tid.", 409);
  }

  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  for (let attempt = 0; attempt < 2; attempt++) {
    const cancelToken = generateCancelToken();
    const { data, error } = await db()
      .from("bookings")
      .insert({
        service_id: service.id,
        barber_id: barber.id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        customer_name: input.customerName,
        customer_phone: input.customerPhone || null,
        customer_email: input.customerEmail,
        notes: input.notes || null,
        status: "confirmed",
        cancel_token_hash: await hashToken(cancelToken),
        slot_hold_token_hash: holdTokenHash,
      })
      .select("id")
      .single();

    if (!error && data) {
      return {
        id: data.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        serviceName: service.name,
        barberName: barber.name,
        priceSek: service.priceSek,
        cancelToken,
      };
    }

    // Race: någon annan hann boka tiden mellan kontrollen och insert.
    if (error?.code === EXCLUSION_VIOLATION) {
      throw new BookingError("slot_unavailable", "Tiden hann bli bokad. Välj en annan tid.", 409);
    }
    // Osannolik token-krock: försök igen med ny token.
    if (error?.code === UNIQUE_VIOLATION) continue;

    console.error("Kunde inte skapa bokning:", error?.message);
    throw new BookingError("unavailable", "Bokningen kunde inte genomföras. Försök igen.", 503);
  }

  throw new BookingError("unavailable", "Bokningen kunde inte genomföras. Försök igen.", 503);
}
