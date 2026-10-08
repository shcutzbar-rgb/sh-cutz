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
	const params = await searchParams;
	const { data: settings } = await admin.supabase
		.from("shop_settings")
		.select(
			"shop_name,phone,email,address_line,city,postal_code,booking_interval_minutes,cancellation_policy,drop_in_text,latitude,longitude,require_admin_mfa,contact_confirmed_at,hours_confirmed_at",
		)
		.eq("id", 1)
		.maybeSingle();
	const hours = await getOpeningHours();

	return (
		<>
			<Flash ok={first(params.ok)} error={first(params.error)} />
			<h1 className="text-2xl font-bold tracking-tight">Inställningar</h1>

			<form action={saveSettings} className={`${ui.card} mt-6 grid gap-4 sm:grid-cols-2`}>
				<div>
					<label htmlFor="shopName" className={ui.label}>Butikens namn</label>
					<input id="shopName" name="shopName" defaultValue={settings?.shop_name ?? siteConfig.name} required maxLength={100} className={ui.input} />
				</div>
				<div>
					<label htmlFor="phone" className={ui.label}>Telefon</label>
					<input id="phone" name="phone" type="tel" defaultValue={settings?.phone ?? siteConfig.phone} required maxLength={30} className={ui.input} />
				</div>
				<div>
					<label htmlFor="email" className={ui.label}>E-post (valfri)</label>
					<input id="email" name="email" type="email" defaultValue={settings?.email ?? ""} maxLength={254} className={ui.input} />
				</div>
				<div>
					<label htmlFor="addressLine" className={ui.label}>Adress</label>
					<input id="addressLine" name="addressLine" defaultValue={settings?.address_line ?? siteConfig.address.street} required maxLength={200} className={ui.input} />
				</div>
				<div>
					<label htmlFor="city" className={ui.label}>Ort</label>
					<input id="city" name="city" defaultValue={settings?.city ?? siteConfig.address.city} required maxLength={100} className={ui.input} />
				</div>
				<div>
					<label htmlFor="postalCode" className={ui.label}>Postnummer (valfritt)</label>
					<input id="postalCode" name="postalCode" defaultValue={settings?.postal_code ?? ""} maxLength={10} className={ui.input} />
				</div>
				<div>
					<label htmlFor="bookingIntervalMinutes" className={ui.label}>Tidsintervall i bokning (minuter)</label>
					<input id="bookingIntervalMinutes" name="bookingIntervalMinutes" type="number" min={5} max={120} step={5} defaultValue={settings?.booking_interval_minutes ?? 15} required className={ui.input} />
				</div>
				<div>
					<label htmlFor="latitude" className={ui.label}>Latitud (valfri, för Google)</label>
					<input id="latitude" name="latitude" inputMode="decimal" defaultValue={settings?.latitude ?? ""} className={ui.input} />
				</div>
				<div>
					<label htmlFor="longitude" className={ui.label}>Longitud (valfri, för Google)</label>
					<input id="longitude" name="longitude" inputMode="decimal" defaultValue={settings?.longitude ?? ""} className={ui.input} />
				</div>
				<div>
					<p className={ui.label}>Tidszon</p>
					<p className="mt-1 py-2 text-sm text-foreground/70">{siteConfig.timezone} (styrs av NEXT_PUBLIC_TIMEZONE)</p>
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="cancellationPolicy" className={ui.label}>Avbokningspolicy (visas på bokningssidan och kontaktsidan)</label>
					<textarea id="cancellationPolicy" name="cancellationPolicy" rows={4} defaultValue={settings?.cancellation_policy ?? ""} maxLength={2000} className={ui.input} />
					<p className="mt-1 text-xs text-foreground/60">
						Kunder kan avboka själva fram till {BOOKING_CONFIG.cancelDeadlineMinutes / 60} timmar före tiden. Ändra gränsen i koden (booking-config).
					</p>
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="dropInText" className={ui.label}>Dröppen (visas på startsidan och kontaktsidan, lämna tomt för att dölja)</label>
					<textarea id="dropInText" name="dropInText" rows={3} defaultValue={settings?.drop_in_text ?? ""} maxLength={500} className={ui.input} />
					<p className="mt-1 text-xs text-foreground/60">Skriv vilka dagar och tider drop-in gäller. Max 500 tecken.</p>
				</div>
				<fieldset className="space-y-3 rounded-lg border border-line p-4 sm:col-span-2">
					<legend className="px-1 text-sm font-medium">Bekräftelse inför launch</legend>
					<label className="flex items-start gap-3 text-sm">
						<input type="checkbox" name="contactConfirmed" defaultChecked={Boolean(settings?.contact_confirmed_at)} className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]" />
						<span>Jag har kontrollerat att kontaktuppgifterna ovan (telefon, adress, ort) stämmer.</span>
					</label>
					<label className="flex items-start gap-3 text-sm">
						<input type="checkbox" name="hoursConfirmed" defaultChecked={Boolean(settings?.hours_confirmed_at)} className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]" />
						<span>Jag har kontrollerat att öppettiderna stämmer.</span>
					</label>
					<div className="max-w-sm pl-8"><OpeningHoursTable hours={hours} /></div>
					<p className="text-xs text-foreground/60">Utan bekräftelse stoppar <code>npm run deploy</code>; `check:live` varnar efter deploy.</p>
				</fieldset>
				<div className="sm:col-span-2">
					<label className="flex items-start gap-3 text-sm">
						<input type="checkbox" name="requireAdminMfa" defaultChecked={settings?.require_admin_mfa ?? false} className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]" />
						<span>
							<span className="font-medium">Kräv tvåstegsverifiering för alla admins</span>
							<span className="block text-xs text-foreground/60">Aktivera efter att alla admins har registrerat TOTP.</span>
						</span>
					</label>
				</div>
				<button type="submit" className={`${ui.primary} sm:col-span-2`}>Spara inställningar</button>
			</form>
		</>
	);
}
