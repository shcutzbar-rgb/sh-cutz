import { NextResponse } from "next/server";
import { z } from "zod";
import { releaseSlotHold } from "@/server/slot-holds";
import { BookingError } from "@/server/errors";
import { clientIp, isRateLimited, isSameOrigin } from "@/server/request-guards";
import { reportError } from "@/server/report";

const NO_STORE = { "Cache-Control": "no-store" };
const schema = z.object({ holdToken: z.uuid() });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Otillåten förfrågan." }, { status: 403, headers: NO_STORE });
  if (isRateLimited(`availability-release:${clientIp(request)}`, 30, 60_000)) {
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
    await releaseSlotHold(parsed.data.holdToken);
    return new NextResponse(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    reportError(error, { route: "/api/availability/release" });
    return NextResponse.json({ error: "Kunde inte släppa reservationen." }, { status: 500, headers: NO_STORE });
  }
}
