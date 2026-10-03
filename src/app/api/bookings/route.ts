import { NextResponse } from "next/server";
import { z } from "zod";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking } from "@/server/bookings";
import { BookingError } from "@/server/errors";
import { clientIp, isRateLimited, isSameOrigin } from "@/server/request-guards";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 10_000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Otillåten förfrågan." }, { status: 403, headers: NO_STORE });
  }
  if (isRateLimited(`booking:${clientIp(request)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "För många försök. Vänta en stund." }, { status: 429, headers: NO_STORE });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 415, headers: NO_STORE });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Förfrågan är för stor." }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400, headers: NO_STORE });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Kontrollera uppgifterna.", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const booking = await createBooking(parsed.data);
    return NextResponse.json({ booking }, { status: 201, headers: NO_STORE });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error(err);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500, headers: NO_STORE });
  }
}
