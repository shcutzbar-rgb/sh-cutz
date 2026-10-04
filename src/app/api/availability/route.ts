import { NextResponse } from "next/server";
import { availabilityQuerySchema } from "@/lib/validation/booking";
import { getAvailability } from "@/server/availability";
import { BookingError } from "@/server/errors";
import { reportError } from "@/server/report";
import { clientIp, isRateLimited } from "@/server/request-guards";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (isRateLimited(`availability:${clientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "För många förfrågningar." }, { status: 429, headers: NO_STORE });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = availabilityQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga parametrar." }, { status: 400, headers: NO_STORE });
  }

  try {
    const { slots } = await getAvailability(parsed.data);
    return NextResponse.json({ slots: slots.map((s) => s.toISOString()) }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    reportError(err, { route: "/api/availability" });
    return NextResponse.json({ error: "Något gick fel." }, { status: 500, headers: NO_STORE });
  }
}
