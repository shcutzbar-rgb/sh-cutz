import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Flash, first, ui } from "@/components/admin/ui";
import { computeStats } from "@/lib/booking-rules";
import { addDays, dayRange, formatDateLongIn, formatTimeIn, todayIn } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { listBookingsBetween, type AdminBooking } from "@/server/admin-bookings";
import { getLaunchReadiness } from "@/server/launch-readiness";

const STATS_DAYS = 90;

function percent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)} %`;
}

function BookingRow({ b, showDate }: { b: AdminBooking; showDate?: boolean }) {
  const tz = siteConfig.timezone;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium">
          {showDate && `${formatDateLongIn(b.startAt, tz)}, `}
          {formatTimeIn(b.startAt, tz)}–{formatTimeIn(b.endAt, tz)} · {b.customerName}
        </p>
        <p className="text-sm text-foreground/70">
          {b.serviceName} hos {b.barberName}
        </p>
      </div>
      <StatusBadge status={b.status} />
    </li>
  );
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const tz = siteConfig.timezone;
  const now = new Date();
  const today = todayIn(tz, now);
  const todayRange = dayRange(today, tz);
  const upcomingEnd = dayRange(addDays(today, 7), tz).end;
  const statsStart = new Date(now.getTime() - STATS_DAYS * 86_400_000);

  const [todayAll, upcomingAll, statsRes, readiness] = await Promise.all([
    listBookingsBetween(admin, todayRange.start, todayRange.end),
    listBookingsBetween(admin, todayRange.end, upcomingEnd),
    admin.supabase
      .from("bookings")
      .select("status")
      .gte("start_at", statsStart.toISOString())
      .lt("start_at", now.toISOString())
      .limit(5000),
    getLaunchReadiness(admin),
  ]);

  const todayBookings = todayAll.filter((b) => b.status !== "cancelled");
  const upcoming = upcomingAll.filter((b) => b.status === "pending" || b.status === "confirmed");
  const stats = computeStats((statsRes.data ?? []).map((r: { status: string }) => r.status));

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} denied={first(sp.denied) === "1"} />
      <h1 className="text-2xl font-bold tracking-tight">Översikt</h1>

      {readiness.length > 0 && (
        <section aria-labelledby="readiness-heading" className="mt-4 rounded-xl border border-yellow-400/40 p-4 text-sm">
          <h2 id="readiness-heading" className="font-semibold text-yellow-300">
            Kvar innan sajten kan gå live
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/80">
            {readiness.map((issue) => (
              <li key={issue.id}>
                {issue.message}
                {issue.level === "warning" ? " (rekommenderas)" : ""}
              </li>
            ))}
          </ul>
          {admin.role === "owner" && (
            <p className="mt-2">
              <Link href="/admin/installningar" className="text-accent underline underline-offset-4">
                Till Inställningar
              </Link>
            </p>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={`${ui.card} lg:col-span-2`} aria-labelledby="today-heading">
          <h2 id="today-heading" className="font-semibold">
            Dagens bokningar ({todayBookings.length})
          </h2>
          {todayBookings.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/70">Inga bokningar idag.</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/10">
              {todayBookings.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
            </ul>
          )}
        </section>

        <section className={ui.card} aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="font-semibold">
            Senaste {STATS_DAYS} dagarna
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground/70">Bokningar</dt>
              <dd className="font-medium">{stats.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/70">Genomförda</dt>
              <dd className="font-medium">{stats.completed}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/70">No-shows</dt>
              <dd className="font-medium">{stats.noShow}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/70">No-show-grad</dt>
              <dd className="font-medium">{percent(stats.noShowRate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/70">Avbokningsgrad</dt>
              <dd className="font-medium">{percent(stats.cancelRate)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-foreground/60">
            No-show-grad = no-shows av genomförda + no-shows. Bokningar som ännu inte markerats räknas inte med.
          </p>
        </section>
      </div>

      <section className={`${ui.card} mt-6`} aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming-heading" className="font-semibold">
            Kommande 7 dagar ({upcoming.length})
          </h2>
          <Link href="/admin/bokningar" className="text-sm text-accent underline underline-offset-4">
            Alla bokningar
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/70">Inga kommande bokningar.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/10">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} showDate />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
