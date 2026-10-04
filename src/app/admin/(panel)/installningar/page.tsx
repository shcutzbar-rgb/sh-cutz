import Link from "next/link";
import { Flash, first, ui } from "@/components/admin/ui";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { BOOKING_CONFIG } from "@/lib/booking-config";
import { getOpeningHours } from "@/lib/hours";
import { siteConfig } from "@/lib/site";
import { requireAdminPage } from "@/server/admin-auth";
import { saveSettings } from "./actions";

export const metadata = { title: "Inställningar" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("owner");
  const sp = await searchParams;

  const { data: s } = await admin.supabase
    .from("shop_settings")
    .select("shop_name,phone,email,address_line,city,postal_code,booking_interval_minutes,cancellation_policy,drop_in_text,latitude,longitude,require_admin_mfa,contact_confirmed_at,hours_confirmed_at")
    .eq("id", 1)
    .maybeSingle();
  const hours = await getOpeningHours();

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <h1 className="text-2xl font-bold tracking-tight">Inställningar</h1>

      <form action={saveSettings} className={`${ui.card} mt-6 grid gap-4 sm:grid-cols-2`}>
        <div>
          <label htmlFor="shopName" className={ui.label}>
            Butikens namn
          </label>
          <input id="shopName" name="shopName" defaultValue={s?.shop_name ?? siteConfig.name} required maxLength={100} className={ui.input} />
        </div>
        <div>
          <label htmlFor="phone" className={ui.label}>
            Telefon
          </label>
          <input id="phone" name="phone" type="tel" defaultValue={s?.phone ?? siteConfig.phone} required maxLength={30} className={ui.input} />
        </div>
        <div>
          <label htmlFor="email" className={ui.label}>
            E-post (valfri)
          </label>
          <input id="email" name="email" type="email" defaultValue={s?.email ?? ""} maxLength={254} className={ui.input} />
        </div>
        <div>
          <label htmlFor="addressLine" className={ui.label}>
            Adress
          </label>
          <input id="addressLine" name="addressLine" defaultValue={s?.address_line ?? siteConfig.address.street} required maxLength={200} className={ui.input} />
        </div>
        <div>
          <label htmlFor="city" className={ui.label}>
            Ort
          </label>
          <input id="city" name="city" defaultValue={s?.city ?? siteConfig.address.city} required maxLength={100} className={ui.input} />
        </div>
        <div>
          <label htmlFor="postalCode" className={ui.label}>
            Postnummer (valfritt)
          </label>
          <input id="postalCode" name="postalCode" defaultValue={s?.postal_code ?? ""} maxLength={10} className={ui.input} />
        </div>
        <div>
          <label htmlFor="bookingIntervalMinutes" className={ui.label}>
            Tidsintervall i bokning (minuter)
          </label>
          <input
            id="bookingIntervalMinutes"
            name="bookingIntervalMinutes"
            type="number"
            min={5}
            max={120}
            step={5}
            defaultValue={s?.booking_interval_minutes ?? 15}
            required
            className={ui.input}
          />
        </div>
        <div>
          <label htmlFor="latitude" className={ui.label}>
            Latitud (valfri, för Google)
          </label>
          <input id="latitude" name="latitude" inputMode="decimal" defaultValue={s?.latitude ?? ""} className={ui.input} />
        </div>
        <div>
          <label htmlFor="longitude" className={ui.label}>
            Longitud (valfri, för Google)
          </label>
          <input id="longitude" name="longitude" inputMode="decimal" defaultValue={s?.longitude ?? ""} className={ui.input} />
        </div>
        <div>
          <p className={ui.label}>Tidszon</p>
          <p className="mt-1 py-2 text-sm text-foreground/70">{siteConfig.timezone} (styrs av NEXT_PUBLIC_TIMEZONE)</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cancellationPolicy" className={ui.label}>
            Avbokningspolicy (visas på bokningssidan och kontaktsidan)
          </label>
          <textarea id="cancellationPolicy" name="cancellationPolicy" rows={4} defaultValue={s?.cancellation_policy ?? ""} maxLength={2000} className={ui.input} />
          <p className="mt-1 text-xs text-foreground/60">
            Kunder kan avboka själva fram till {BOOKING_CONFIG.cancelDeadlineMinutes / 60} timmar före tiden. Ändra gränsen i koden (booking-config).
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dropInText" className={ui.label}>
            Dröppen (visas på startsidan och kontaktsidan, lämna tomt för att dölja)
          </label>
          <textarea id="dropInText" name="dropInText" rows={3} defaultValue={s?.drop_in_text ?? ""} maxLength={500} className={ui.input} />
          <p className="mt-1 text-xs text-foreground/60">
            Skriv fritt, t.ex. vilka dagar och tider drop-in gäller. Max 500 tecken.
          </p>
        </div>
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">Bekräftelse inför launch</legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="contactConfirmed"
              defaultChecked={Boolean(s?.contact_confirmed_at)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]"
            />
            <span>Jag har kontrollerat att kontaktuppgifterna ovan (telefon, adress, ort) stämmer.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="hoursConfirmed"
              defaultChecked={Boolean(s?.hours_confirmed_at)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]"
            />
            <span>Jag har kontrollerat att öppettiderna (se nedan) stämmer.</span>
          </label>
          <p className="text-xs text-foreground/60">
            Utan bekräftelse stoppar <code>npm run deploy</code> och <code>npm run check:live</code> flaggar att sajten
            fortfarande kan innehålla utkastvärden.
          </p>
        </fieldset>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="requireAdminMfa"
              defaultChecked={s?.require_admin_mfa ?? false}
              className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]"
            />
            <span>
              <span className="font-medium">Kräv tvåstegsverifiering för alla admins</span>
              <span className="block text-xs text-foreground/60">
                Admins utan registrerad autentiseringsapp skickas till Admin &gt; Säkerhet och får ingen åtkomst till
                panelen förrän de har aktiverat den. Aktivera din egen först.
              </span>
            </span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className={ui.primary}>
            Spara inställningar
          </button>
        </div>
      </form>

      <section className={`${ui.card} mt-6`} aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="font-semibold">
          Öppettider
        </h2>
        <p className="mt-1 text-sm text-foreground/70">
          Härleds från frisörernas arbetstider (tidigaste start och senaste slut per dag) och visas på startsidan och
          kontaktsidan. Ändra dem under{" "}
          <Link href="/admin/frisorer" className="text-accent underline underline-offset-4">
            Frisörer
          </Link>
          .
        </p>
        <div className="mt-3 max-w-sm">
          <OpeningHoursTable hours={hours} />
        </div>
      </section>
    </>
  );
}
