import { BOOKING_CONFIG } from "@/lib/booking-config";
import { isReminderDue } from "@/lib/booking-rules";
import { db, failOnError } from "./db";
import { sendReminderEmail } from "./notifications";

export type ReminderSummary = { due: number; sent: number; failed: number };

type Named<T> = T | T[] | null;
const first = <T>(v: Named<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const BATCH_LIMIT = 100;

export async function sendDueReminders(now: Date = new Date()): Promise<ReminderSummary> {
  const supabase = db();
  const horizon = new Date(now.getTime() + BOOKING_CONFIG.reminderLeadHours * 3_600_000);

  const { data, error } = await supabase
    .from("bookings")
    .select("id,status,start_at,end_at,created_at,customer_name,customer_email,services(name,price_sek),barbers(name)")
    .in("status", ["pending", "confirmed"])
    .is("reminder_sent_at", null)
    .not("customer_email", "is", null)
    .gt("start_at", now.toISOString())
    .lte("start_at", horizon.toISOString())
    .order("start_at")
    .limit(BATCH_LIMIT);
  failOnError(error);

  const due = (data ?? []).filter((row) =>
    isReminderDue(
      {
        status: row.status,
        startAt: new Date(row.start_at),
        createdAt: new Date(row.created_at),
        reminderSentAt: null,
        email: row.customer_email,
      },
      now,
    ),
  );

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const service = first<{ name: string; price_sek: number }>(row.services);
    const barber = first<{ name: string }>(row.barbers);
    if (!service || !barber) continue;

    // Claim först så att överlappande körningar inte skickar dubbletter.
    const claim = await supabase
      .from("bookings")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (claim.error || !claim.data || claim.data.length === 0) continue;

    const ok = await sendReminderEmail(
      {
        customerName: row.customer_name,
        serviceName: service.name,
        barberName: barber.name,
        startAt: row.start_at,
        endAt: row.end_at,
        priceSek: service.price_sek,
      },
      row.customer_email,
    );

    if (ok) {
      sent++;
    } else {
      failed++;
      // Släpp claim så att nästa körning försöker igen.
      await supabase.from("bookings").update({ reminder_sent_at: null }).eq("id", row.id);
    }
  }

  return { due: due.length, sent, failed };
}
