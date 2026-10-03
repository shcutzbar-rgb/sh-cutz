import { NextResponse } from "next/server";
import { BookingError } from "@/server/errors";
import { isAuthorizedCron } from "@/server/cron-auth";
import { sendDueReminders } from "@/server/reminders";

const NO_STORE = { "Cache-Control": "no-store" };

// Anropas av Cloudflare Cron Trigger via worker.ts. Skyddas av CRON_SECRET.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET saknas." }, { status: 503, headers: NO_STORE });
  }
  if (!isAuthorizedCron(request, secret)) {
    return NextResponse.json({ error: "Obehörig." }, { status: 401, headers: NO_STORE });
  }

  try {
    return NextResponse.json(await sendDueReminders(), { headers: NO_STORE });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error(err);
    return NextResponse.json({ error: "Något gick fel." }, { status: 500, headers: NO_STORE });
  }
}
