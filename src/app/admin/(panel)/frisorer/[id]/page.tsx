import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Flash, first, ui } from "@/components/admin/ui";
import { formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { weekdayNamesSv } from "@/lib/hours";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { addTimeOff, addWorkingHours, deleteTimeOff, deleteWorkingHours } from "../actions";

export const metadata = { title: "Arbetstider och frånvaro" };

type Hours = { id: string; weekday: number; start_time: string; end_time: string };
type Off = { id: string; start_at: string; end_at: string; reason: string | null };

// Måndag först.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function BarberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("owner");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const tz = siteConfig.timezone;

  const { data: barber } = await admin.supabase.from("barbers").select("id,name").eq("id", id).maybeSingle();
  if (!barber) notFound();

  const [hoursRes, offRes] = await Promise.all([
    admin.supabase.from("working_hours").select("id,weekday,start_time,end_time").eq("barber_id", id),
    admin.supabase
      .from("time_off")
      .select("id,start_at,end_at,reason")
      .eq("barber_id", id)
      .gte("end_at", new Date().toISOString())
      .order("start_at"),
  ]);
  const hours = ((hoursRes.data ?? []) as Hours[]).sort(
    (a, b) =>
      WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday) || a.start_time.localeCompare(b.start_time),
  );
  const off = (offRes.data ?? []) as Off[];

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <Link href="/admin/frisorer" className="text-sm text-accent underline underline-offset-4">
        Till frisörer
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{barber.name}: arbetstider och frånvaro</h1>

      <section className={`${ui.card} mt-6`} aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="font-semibold">
          Arbetstider (veckovis)
        </h2>
        {hours.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Inga arbetstider. Frisören kan inte bokas.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/10">
            {hours.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {weekdayNamesSv[h.weekday]} {h.start_time.slice(0, 5)}–{h.end_time.slice(0, 5)}
                </span>
                <form action={deleteWorkingHours}>
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="barberId" value={id} />
                  <button type="submit" className={ui.danger}>
                    Ta bort
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addWorkingHours} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="barberId" value={id} />
          <div>
            <label htmlFor="weekday" className={ui.label}>
              Dag
            </label>
            <select id="weekday" name="weekday" className={ui.input}>
              {WEEKDAY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {weekdayNamesSv[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startTime" className={ui.label}>
              Från
            </label>
            <input id="startTime" name="startTime" type="time" defaultValue="10:00" required className={ui.input} />
          </div>
          <div>
            <label htmlFor="endTime" className={ui.label}>
              Till
            </label>
            <input id="endTime" name="endTime" type="time" defaultValue="19:00" required className={ui.input} />
          </div>
          <button type="submit" className={ui.primary}>
            Lägg till
          </button>
        </form>
      </section>

      <section className={`${ui.card} mt-6`} aria-labelledby="off-heading">
        <h2 id="off-heading" className="font-semibold">
          Frånvaro (kommande)
        </h2>
        {off.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Ingen planerad frånvaro.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/10">
            {off.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {formatDateLongIn(t.start_at, tz)} {formatTimeIn(t.start_at, tz)} till{" "}
                  {formatDateLongIn(t.end_at, tz)} {formatTimeIn(t.end_at, tz)}
                  {t.reason ? ` (${t.reason})` : ""}
                </span>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="barberId" value={id} />
                  <button type="submit" className={ui.danger}>
                    Ta bort
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addTimeOff} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="barberId" value={id} />
          <div>
            <label htmlFor="startAt" className={ui.label}>
              Från
            </label>
            <input id="startAt" name="startAt" type="datetime-local" required className={ui.input} />
          </div>
          <div>
            <label htmlFor="endAt" className={ui.label}>
              Till
            </label>
            <input id="endAt" name="endAt" type="datetime-local" required className={ui.input} />
          </div>
          <div>
            <label htmlFor="reason" className={ui.label}>
              Anledning (valfri)
            </label>
            <input id="reason" name="reason" maxLength={200} className={ui.input} />
          </div>
          <button type="submit" className={ui.primary}>
            Lägg till
          </button>
        </form>
        <p className="mt-2 text-xs text-foreground/60">Tider anges i {tz}. Befintliga bokningar i perioden påverkas inte.</p>
      </section>
    </>
  );
}
