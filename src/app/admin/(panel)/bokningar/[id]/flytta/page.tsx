import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Flash, first, ui } from "@/components/admin/ui";
import { isMovable } from "@/lib/booking-rules";
import { dateIn, formatDateLongIn, formatTimeIn, isValidDateString } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { restrictBarbers } from "@/lib/barber-access";
import { getBooking } from "@/server/admin-bookings";
import { getAvailability } from "@/server/availability";
import { BookingError } from "@/server/errors";
import { moveBookingAction } from "../../actions";

export const metadata = { title: "Flytta bokning" };

export default async function MoveBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const booking = await getBooking(admin, id);
  if (!booking) notFound();

  const sp = await searchParams;
  const tz = siteConfig.timezone;
  const dateParam = first(sp.date);
  const date = dateParam && isValidDateString(dateParam) ? dateParam : dateIn(tz, booking.startAt);

  const barberParam = first(sp.barber);
  const { data: barberRows } = await admin.supabase.from("barbers").select("id,name").eq("is_active", true).order("name");
  const barbers = restrictBarbers(admin, (barberRows ?? []) as { id: string; name: string }[]);
  const barberId = barbers.some((b) => b.id === barberParam) ? (barberParam as string) : booking.barberId;

  let slots: Date[] = [];
  let slotError: string | null = null;
  if (isMovable(booking.status)) {
    try {
      ({ slots } = await getAvailability(
        { serviceId: booking.serviceId, barberId, date },
        new Date(),
        { excludeBookingId: booking.id, adminOverride: true },
      ));
    } catch (err) {
      if (!(err instanceof BookingError)) throw err;
      slotError = err.message;
    }
  }

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error) ?? slotError ?? undefined} />
      <Link href="/admin/bokningar" className="text-sm text-accent underline underline-offset-4">
        Till bokningar
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Flytta bokning</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {booking.customerName}: {booking.serviceName}, nu {formatDateLongIn(booking.startAt, tz)}{" "}
        {formatTimeIn(booking.startAt, tz)} hos {booking.barberName}
      </p>

      {!isMovable(booking.status) ? (
        <p className="mt-6 text-foreground/70">Endast väntande och bekräftade bokningar kan flyttas.</p>
      ) : (
        <>
          <form method="get" className={`${ui.card} mt-6 flex flex-wrap items-end gap-3`}>
            <div>
              <label htmlFor="date" className={ui.label}>
                Datum
              </label>
              <input id="date" name="date" type="date" defaultValue={date} className={ui.input} />
            </div>
            <div>
              <label htmlFor="barber" className={ui.label}>
                Frisör
              </label>
              <select id="barber" name="barber" defaultValue={barberId} className={ui.input}>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={ui.primary}>
              Visa lediga tider
            </button>
          </form>

          <h2 className="mt-6 font-semibold">Lediga tider {date}</h2>
          {slots.length === 0 ? (
            <p className="mt-2 text-foreground/70">Inga lediga tider detta datum för vald frisör.</p>
          ) : (
            <form action={moveBookingAction} className="mt-3">
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="barberId" value={barberId} />
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {slots.map((slot) => (
                  <li key={slot.toISOString()}>
                    <button
                      type="submit"
                      name="startAt"
                      value={slot.toISOString()}
                      className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-medium hover:border-accent"
                    >
                      {formatTimeIn(slot, tz)}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-foreground/60">
                Att välja en tid flyttar bokningen direkt. Kunden får ett mejl om den nya tiden om e-post finns; annars behöver du ringa.
              </p>
            </form>
          )}
        </>
      )}
    </>
  );
}
