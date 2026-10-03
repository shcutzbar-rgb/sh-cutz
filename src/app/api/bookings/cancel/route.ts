import { after, NextResponse } from "next/server";
import { z } from "zod";
import { isValidCancelToken } from "@/lib/booking-rules";
import { siteConfig } from "@/lib/site";
import { cancelBookingByToken } from "@/server/cancellation";
import { BookingError } from "@/server/errors";
import { sendCancelledEmail } from "@/server/notifications";
import { clientIp, isRateLimited, isSameOrigin } from "@/server/request-guards";

const NO_STORE = { "Cache-Control": "no-store" };
const bodySchema = z.object({ token: z.string().refine(isValidCancelToken) });

const INVALID = "Länken är ogiltig eller har redan använts.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Otillåten förfrågan." }, { status: 403, headers: NO_STORE });
  }
  if (isRateLimited(`cancel:${clientIp(request)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "För många försök. Vänta en stund." }, { status: 429, headers: NO_STORE });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 415, headers: NO_STORE });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: INVALID }, { status: 404, headers: NO_STORE });
  }

  try {
    const result = await cancelBookingByToken(parsed.data.token);
    if (result.ok) {
      const { booking } = result;
      if (booking.customerEmail) after(() => sendCancelledEmail(booking, booking.customerEmail!));
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }
    if (result.reason === "too_late") {
      return NextResponse.json(
        { error: `Det är för sent att avboka online. Ring oss på ${siteConfig.phone}.`, code: "too_late" },
        { status: 409, headers: NO_STORE },
      );
    }
    return NextResponse.json({ error: INVALID }, { status: 404, headers: NO_STORE });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error(err);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500, headers: NO_STORE });
  }
}
