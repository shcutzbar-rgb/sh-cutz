import { dateIn } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { db } from "@/server/db";
import { BookingError } from "@/server/errors";
import { getAvailability } from "@/server/availability";
import { hashToken } from "@/server/tokens";

export const SLOT_HOLD_MINUTES = 5;

type HoldInput = { serviceId: string; barberId: string; startAt: string; holdToken: string };

export async function claimSlotHold(input: HoldInput, now: Date = new Date()) {
  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) throw new BookingError("invalid", "Ogiltig tid.", 400);

  const tokenHash = await hashToken(input.holdToken);
  const date = dateIn(siteConfig.timezone, start);
  const { service, slots } = await getAvailability(
    { serviceId: input.serviceId, barberId: input.barberId, date },
    now,
    { excludeHoldTokenHash: tokenHash },
  );
  if (!slots.some((slot) => slot.getTime() === start.getTime())) {
    throw new BookingError("slot_unavailable", "Tiden är inte längre ledig. Välj en annan tid.", 409);
  }

  const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const expiresAt = new Date(now.getTime() + SLOT_HOLD_MINUTES * 60_000);
  const { data, error } = await db().rpc("claim_booking_slot", {
    p_token_hash: tokenHash,
    p_barber_id: input.barberId,
    p_start_at: start.toISOString(),
    p_end_at: end.toISOString(),
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) throw new BookingError("unavailable", "Kunde inte reservera tiden. Försök igen.", 503);
  if (data !== true) throw new BookingError("slot_unavailable", "Någon annan hann välja tiden. Välj en annan tid.", 409);

  return { expiresAt: expiresAt.toISOString() };
}

export async function releaseSlotHold(holdToken: string) {
  const { error } = await db().rpc("release_booking_slot", { p_token_hash: await hashToken(holdToken) });
  if (error) throw new BookingError("unavailable", "Kunde inte släppa tidsreservationen.", 503);
}
