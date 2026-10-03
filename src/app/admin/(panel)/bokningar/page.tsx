import Link from "next/link";
import { z } from "zod";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Flash, first, ui } from "@/components/admin/ui";
import { BOOKING_STATUSES, STATUS_LABEL, canChangeStatus, isMovable, type BookingStatus } from "@/lib/booking-rules";
import { formatDateLongIn, formatTimeIn, todayIn } from "@/lib/datetime";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { listBookings, type AdminBooking, type BookingFilters } from "@/server/admin-bookings";
import { setBookingStatus } from "./actions";

export const metadata = { title: "Bokningar" };

const filterSchema = z.object({
  status: z.enum(BOOKING_STATUSES as [string, ...string[]]).optional().catch(undefined),
  barber: z.uuid().optional().catch(undefined),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  q: z.string().max(50).optional().catch(undefined),
});

function ActionButton({
  booking,
  to,
  label,
  returnTo,
  confirm,
  className,
}: {
  booking: AdminBooking;
  to: BookingStatus;
  label: string;
  returnTo: string;
  confirm?: string;
  className?: string;
}) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="status" value={to} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {confirm ? (
        <ConfirmButton message={confirm} className={className ?? ui.secondary}>
          {label}
        </ConfirmButton>
      ) : (
        <button type="submit" className={className ?? ui.secondary}>
          {label}
        </button>
      )}
    </form>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const tz = siteConfig.timezone;
  const now = new Date();

  const rawFilters = {
    status: first(sp.status) || undefined,
    barber: first(sp.barber) || undefined,
    from: first(sp.from) ?? todayIn(tz, now),
    to: first(sp.to) || undefined,
    q: first(sp.q) || undefined,
  };
  const parsed = filterSchema.parse(rawFilters);
  const filters: BookingFilters = {
    status: parsed.status as BookingStatus | undefined,
    barberId: parsed.barber,
    from: parsed.from,
    to: parsed.to,
    q: parsed.q,
  };

  const [bookings, barbersRes] = await Promise.all([
    listBookings(admin, filters),
    admin.supabase.from("barbers").select("id,name").order("name"),
  ]);
  const barbers = (barbersRes.data ?? []) as { id: string; name: string }[];

  const returnQuery = new URLSearchParams(
    Object.entries({ status: parsed.status, barber: parsed.barber, from: parsed.from, to: parsed.to, q: parsed.q }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();
  const returnTo = returnQuery ? `/admin/bokningar?${returnQuery}` : "/admin/bokningar";

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <h1 className="text-2xl font-bold tracking-tight">Bokningar</h1>

      <form method="get" className={`${ui.card} mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6`}>
        <div>
          <label htmlFor="from" className={ui.label}>
            Från
          </label>
          <input id="from" name="from" type="date" defaultValue={parsed.from} className={ui.input} />
        </div>
        <div>
          <label htmlFor="to" className={ui.label}>
            Till
          </label>
          <input id="to" name="to" type="date" defaultValue={parsed.to} className={ui.input} />
        </div>
        <div>
          <label htmlFor="status" className={ui.label}>
            Status
          </label>
          <select id="status" name="status" defaultValue={parsed.status ?? ""} className={ui.input}>
            <option value="">Alla</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="barber" className={ui.label}>
            Frisör
          </label>
          <select id="barber" name="barber" defaultValue={parsed.barber ?? ""} className={ui.input}>
            <option value="">Alla</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q" className={ui.label}>
            Namn eller telefon
          </label>
          <input id="q" name="q" defaultValue={parsed.q} maxLength={50} className={ui.input} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={ui.primary}>
            Filtrera
          </button>
          <Link href="/admin/bokningar" className={ui.secondary}>
            Rensa
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-foreground/70" aria-live="polite">
        {bookings.length} bokningar{bookings.length === 200 ? " (visar max 200, snäva in filtret)" : ""}
      </p>

      {bookings.length === 0 ? (
        <p className="mt-6 text-foreground/70">Inga bokningar matchar filtret.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className={ui.card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {formatDateLongIn(b.startAt, tz)}, {formatTimeIn(b.startAt, tz)}–{formatTimeIn(b.endAt, tz)}
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    {b.serviceName} hos {b.barberName} ({formatPrice(b.priceSek)})
                  </p>
                  <p className="mt-1 text-sm">
                    {b.customerName},{" "}
                    <a href={`tel:${b.customerPhone.replace(/[^\d+]/g, "")}`} className="text-accent underline underline-offset-2">
                      {b.customerPhone}
                    </a>
                    {b.customerEmail ? `, ${b.customerEmail}` : ""}
                  </p>
                  {b.notes && <p className="mt-1 text-sm text-foreground/70">Meddelande: {b.notes}</p>}
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {canChangeStatus(b.status, "confirmed", b.startAt, now).ok && (
                  <ActionButton booking={b} to="confirmed" label="Bekräfta" returnTo={returnTo} className={ui.primary} />
                )}
                {canChangeStatus(b.status, "completed", b.startAt, now).ok && (
                  <ActionButton booking={b} to="completed" label="Genomförd" returnTo={returnTo} />
                )}
                {canChangeStatus(b.status, "no_show", b.startAt, now).ok && (
                  <ActionButton booking={b} to="no_show" label="No-show" returnTo={returnTo} />
                )}
                {isMovable(b.status) && (
                  <Link href={`/admin/bokningar/${b.id}/flytta`} className={ui.secondary}>
                    Flytta
                  </Link>
                )}
                {canChangeStatus(b.status, "cancelled", b.startAt, now).ok && (
                  <ActionButton
                    booking={b}
                    to="cancelled"
                    label="Avboka"
                    returnTo={returnTo}
                    className={ui.danger}
                    confirm={`Avboka ${b.customerName}s tid?${b.customerEmail ? " Kunden får ett avbokningsmejl." : ""}`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
