import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Flash, first, ui } from "@/components/admin/ui";
import {
  addDays,
  dayRange,
  formatDateLongIn,
  formatTimeIn,
  isValidDateString,
  todayIn,
  weekdayOf,
} from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { listBookingsBetween, type AdminBooking } from "@/server/admin-bookings";

export const metadata = { title: "Kalender" };

type TimeOff = { barber_id: string; start_at: string; end_at: string; reason: string | null };
type Hours = { barber_id: string; weekday: number; start_time: string; end_time: string };

const WEEKDAY_SHORT = ["sön", "mån", "tis", "ons", "tors", "fre", "lör"];

function BookingItem({ b, showBarber }: { b: AdminBooking; showBarber: boolean }) {
  const tz = siteConfig.timezone;
  return (
    <li className="rounded-lg border border-white/10 p-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">
          {formatTimeIn(b.startAt, tz)}–{formatTimeIn(b.endAt, tz)}
        </span>
        <StatusBadge status={b.status} />
      </div>
      <p>{b.customerName}</p>
      <p className="text-foreground/70">
        {b.serviceName}
        {showBarber ? ` · ${b.barberName}` : ""}
      </p>
    </li>
  );
}

function OffItem({ t }: { t: TimeOff }) {
  const tz = siteConfig.timezone;
  return (
    <li className="rounded-lg border border-dashed border-white/20 p-2 text-sm text-foreground/70">
      Frånvaro {formatTimeIn(t.start_at, tz)}–{formatTimeIn(t.end_at, tz)}
      {t.reason ? ` (${t.reason})` : ""}
    </li>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const tz = siteConfig.timezone;

  const view = first(sp.view) === "week" ? "week" : "day";
  const dateParam = first(sp.date);
  const date = dateParam && isValidDateString(dateParam) ? dateParam : todayIn(tz);
  const barberParam = first(sp.barber);

  const { data: barberRows } = await admin.supabase.from("barbers").select("id,name,is_active").order("name");
  const allBarbers = (barberRows ?? []) as { id: string; name: string; is_active: boolean }[];
  const barber = allBarbers.find((b) => b.id === barberParam);
  const shownBarbers = barber ? [barber] : allBarbers.filter((b) => b.is_active);

  // Veckan börjar på måndag.
  const weekStart = addDays(date, -((weekdayOf(date, tz) + 6) % 7));
  const firstDay = view === "week" ? weekStart : date;
  const dayCount = view === "week" ? 7 : 1;
  const days = Array.from({ length: dayCount }, (_, i) => addDays(firstDay, i));
  const rangeStart = dayRange(days[0], tz).start;
  const rangeEnd = dayRange(days[days.length - 1], tz).end;

  const [bookingsAll, timeOffRes, hoursRes] = await Promise.all([
    listBookingsBetween(admin, rangeStart, rangeEnd, barber?.id),
    admin.supabase
      .from("time_off")
      .select("barber_id,start_at,end_at,reason")
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString())
      .order("start_at"),
    admin.supabase.from("working_hours").select("barber_id,weekday,start_time,end_time").eq("is_active", true),
  ]);
  const bookings = bookingsAll.filter((b) => b.status !== "cancelled");
  const timeOff = (timeOffRes.data ?? []) as TimeOff[];
  const hours = (hoursRes.data ?? []) as Hours[];

  const step = view === "week" ? 7 : 1;
  const nav = (d: string, v: string = view) => {
    const q = new URLSearchParams({ view: v, date: d });
    if (barber) q.set("barber", barber.id);
    return `/admin/kalender?${q}`;
  };

  const inDay = (iso: string | Date, day: string) => {
    const t = new Date(iso).getTime();
    const r = dayRange(day, tz);
    return t >= r.start.getTime() && t < r.end.getTime();
  };

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-2" role="group" aria-label="Vy">
          <Link
            href={nav(date, "day")}
            aria-current={view === "day" ? "page" : undefined}
            className={view === "day" ? ui.primary : ui.secondary}
          >
            Dag
          </Link>
          <Link
            href={nav(date, "week")}
            aria-current={view === "week" ? "page" : undefined}
            className={view === "week" ? ui.primary : ui.secondary}
          >
            Vecka
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href={nav(addDays(date, -step))} className={ui.secondary}>
            Föregående
          </Link>
          <Link href={nav(todayIn(tz))} className={ui.secondary}>
            Idag
          </Link>
          <Link href={nav(addDays(date, step))} className={ui.secondary}>
            Nästa
          </Link>
        </div>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="view" value={view} />
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
            <select id="barber" name="barber" defaultValue={barber?.id ?? ""} className={ui.input}>
              <option value="">Alla</option>
              {allBarbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={ui.primary}>
            Visa
          </button>
        </form>
      </div>

      {view === "day" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shownBarbers.map((b) => {
            const day = days[0];
            const wd = weekdayOf(day, tz);
            const work = hours.filter((h) => h.barber_id === b.id && h.weekday === wd);
            const items = bookings.filter((x) => x.barberId === b.id);
            const off = timeOff.filter((t) => t.barber_id === b.id);
            return (
              <section key={b.id} className={ui.card} aria-labelledby={`barber-${b.id}`}>
                <h2 id={`barber-${b.id}`} className="font-semibold">
                  {b.name}
                </h2>
                <p className="text-xs text-foreground/60">
                  {formatDateLongIn(dayRange(day, tz).start, tz)} ·{" "}
                  {work.length
                    ? work.map((h) => `${h.start_time.slice(0, 5)}–${h.end_time.slice(0, 5)}`).join(", ")
                    : "ledig dag"}
                </p>
                {items.length + off.length === 0 ? (
                  <p className="mt-3 text-sm text-foreground/70">Inga bokningar.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {[
                      ...items.map((x) => ({ at: x.startAt.getTime(), node: <BookingItem key={x.id} b={x} showBarber={false} /> })),
                      ...off.map((t, i) => ({ at: new Date(t.start_at).getTime(), node: <OffItem key={`off-${i}`} t={t} /> })),
                    ]
                      .sort((a, c) => a.at - c.at)
                      .map((x) => x.node)}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const items = bookings.filter((x) => inDay(x.startAt, day));
            const off = timeOff.filter((t) => inDay(t.start_at, day) && (!barber || t.barber_id === barber.id));
            return (
              <section key={day} className={`${ui.card} p-3`} aria-labelledby={`day-${day}`}>
                <h2 id={`day-${day}`} className="text-sm font-semibold">
                  <Link href={nav(day, "day")} className="hover:text-accent">
                    {WEEKDAY_SHORT[weekdayOf(day, tz)]} {day.slice(8)}/{day.slice(5, 7)}
                  </Link>
                </h2>
                {items.length + off.length === 0 ? (
                  <p className="mt-2 text-xs text-foreground/60">Inget</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {[
                      ...items.map((x) => ({ at: x.startAt.getTime(), node: <BookingItem key={x.id} b={x} showBarber={!barber} /> })),
                      ...off.map((t, i) => ({ at: new Date(t.start_at).getTime(), node: <OffItem key={`off-${i}`} t={t} /> })),
                    ]
                      .sort((a, c) => a.at - c.at)
                      .map((x) => x.node)}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
