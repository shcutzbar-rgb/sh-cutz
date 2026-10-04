import { NextResponse } from "next/server";
import { z } from "zod";
import { claimSlotHold } from "@/server/slot-holds";
import { BookingError } from "@/server/errors";
import { clientIp, isRateLimited, isSameOrigin } from "@/server/request-guards";
import { reportError } from "@/server/report";

const NO_STORE = { "Cache-Control": "no-store" };
const schema = z.object({
  serviceId: z.uuid(),
  barberId: z.uuid(),
  startAt: z.iso.datetime({ offset: true }),
  holdToken: z.uuid(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Otillåten förfrågan." }, { status: 403, headers: NO_STORE });
  if (isRateLimited(`availability-hold:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "För många förfrågningar." }, { status: 429, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400, headers: NO_STORE });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga parametrar." }, { status: 400, headers: NO_STORE });

  try {
    return NextResponse.json(await claimSlotHold(parsed.data), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    reportError(error, { route: "/api/availability/hold" });
    return NextResponse.json({ error: "Kunde inte reservera tiden." }, { status: 500, headers: NO_STORE });
  }
}
