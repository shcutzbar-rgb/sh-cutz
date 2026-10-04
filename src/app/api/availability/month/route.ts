import { NextResponse } from "next/server";
import { getMonthAvailability } from "@/server/availability";
import { BookingError } from "@/server/errors";
import { reportError } from "@/server/report";
import { clientIp, isRateLimited } from "@/server/request-guards";
import { z } from "zod";

const NO_STORE = { "Cache-Control": "no-store" };
const querySchema = z.object({ serviceId: z.uuid(), barberId: z.uuid(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

export async function GET(request: Request) {
  if (isRateLimited(`availability-month:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "För många förfrågningar." }, { status: 429, headers: NO_STORE });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga parametrar." }, { status: 400, headers: NO_STORE });
  }

  try {
    const days = await getMonthAvailability(parsed.data);
    return NextResponse.json({ days }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
    }
    reportError(error, { route: "/api/availability/month" });
    return NextResponse.json({ error: "Något gick fel." }, { status: 500, headers: NO_STORE });
  }
}
