# SH-Cutz — Projektplan (Next.js + Supabase)

## 1) Projektöversikt

Bygga en modern, snabb och mobilanpassad barbershop-webbplats för **SH-Cutz** med onlinebokning, avbokning via unik länk, adminpanel och e-postnotiser.

### Verksamhetsinfo (att verifiera innan launch)
- **Namn:** SH-Cutz
- **Adress:** Folkungagatan 87, Södermalm, Stockholm *(rätta stavning och postnummer)*
- **Telefon:** 072-192 68 49 *(format för visning)*
- **Öppettider:** [lägg exakta tider per veckodag]
- **Frisör(er):** Shabir
- **Tjänster/priser (utkast):**
  - Fade — 350 kr / 30 min
  - Skägg — 180 kr / 15 min
  - Fade & Skägg — 400 kr / 30 min
  - Fade sidorna — 280 kr *(förtydliga regler i beskrivning)*

---

## 2) Mål och krav

## Affärsmål
- Få fler bokningar online.
- Minska no-shows med påminnelser.
- Enkelt för admin att hantera tider och bokningar.

## Tekniska mål
- Snabb laddtid och hög mobilupplevelse.
- Stabil bokningslogik utan dubbelbokning.
- SEO-optimering för lokal sökning (Google Maps/Local).

## Icke-funktionella krav
- Responsiv design (mobil först).
- Tillgänglighet (WCAG-ish nivå: tydlig kontrast, tangentbordsnavigering, alt-texter).
- Säker hantering av personuppgifter (GDPR).
- Loggning och felspårning.

---

## 3) Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend/data:** Supabase (Postgres, Auth, RLS, Storage)
- **Hosting:** Cloudflare via OpenNext
- **E-post:** Resend
- **Valfritt men rekommenderat:**
  - Form/validering: Zod + React Hook Form
  - Datum/tid: date-fns
  - UI-komponenter: shadcn/ui
  - Analytics: Plausible eller GA4
  - Error tracking: Sentry

---

## 4) Funktioner (MVP → V2)

## MVP (måste finnas vid launch)
1. Publik webb:
   - Startsida
   - Tjänster med pris/duration
   - Frisörer
   - Galleri
   - Kontakt (karta, telefon, adress)
   - CTA: “Boka tid”
2. Bokningsflöde:
   - Välj tjänst → frisör → tid → kontaktuppgifter → bekräftelse
3. Avbokning:
   - Unik säker länk i e-post/SMS-liknande flöde via token
4. Adminpanel:
   - Kalenderöversikt
   - Hantera bokningar
   - Hantera tjänster
   - Hantera frisörer
   - Arbetstider och frånvaro
5. E-post:
   - Bokningsbekräftelse
   - Påminnelse innan tid
6. SEO-grunder:
   - Metadata per sida
   - Sitemap
   - robots.txt
   - LocalBusiness schema

## V2 (bör finnas kort efter launch)
- Omdömen/testimonials
- Kampanjer/rabatter (kod)
- Presentkort
- “Mina bokningar” med OTP
- Fler språk (svenska/engelska)
- SMS-notiser (Twilio el. liknande)

---

## 5) Informationsarkitektur (sidor)

- `/` Startsida
- `/boka` Bokningsflöde
- `/tjanster`
- `/frisorer`
- `/galleri`
- `/kontakt`
- `/om-oss` *(valfritt men bra för förtroende/SEO)*
- `/avboka/[token]`
- `/admin` (inloggning krävs)
  - `/admin/kalender`
  - `/admin/bokningar`
  - `/admin/tjanster`
  - `/admin/frisorer`
  - `/admin/installningar`

---

## 6) Datamodell (förbättrad)

### Tabellen `services`
- id (uuid, pk)
- name (text)
- description (text)
- price_sek (int)
- duration_minutes (int)
- is_active (bool)
- sort_order (int)
- created_at, updated_at

### Tabellen `barbers`
- id (uuid, pk)
- name (text)
- bio (text)
- photo_url (text)
- is_active (bool)
- created_at, updated_at

### Tabellen `working_hours`
- id (uuid, pk)
- barber_id (fk -> barbers)
- weekday (int, 0-6)
- start_time (time)
- end_time (time)
- is_active (bool)

### Tabellen `time_off`
- id (uuid, pk)
- barber_id (fk -> barbers)
- start_at (timestamptz)
- end_at (timestamptz)
- reason (text)

### Tabellen `bookings`
- id (uuid, pk)
- service_id (fk -> services)
- barber_id (fk -> barbers)
- start_at (timestamptz)
- end_at (timestamptz)
- customer_name (text)
- customer_phone (text)
- customer_email (text, nullable)
- notes (text, nullable)
- status (enum: pending, confirmed, cancelled, completed, no_show)
- cancel_token_hash (text) *(spara hash, inte rå token)*
- reminder_sent_at (timestamptz, nullable)
- created_at, updated_at

### Tabellen `admin_users`
- id (uuid, kopplad till auth.users)
- role (enum: owner, staff)

### Tabellen `shop_settings`
- id
- shop_name
- phone
- email
- address_line
- city
- postal_code
- booking_interval_minutes (ex 15)
- cancellation_policy (text)
- timezone (default: Europe/Stockholm)

---

## 7) Bokningslogik (viktigt)

- Tidszon: **Europe/Stockholm**
- Slot-längd: ex 15 min steg
- Endast tider inom arbetstid visas.
- Blockera tider som krockar med:
  - existerande booking (status pending/confirmed)
  - time_off
- Lägg buffer före/efter tjänst vid behov (valfri inställning).
- Förhindra dubbelbokning via DB constraint/transaktion.
- Sista minuten-regel: ex “kan bokas senast 2h innan”.

---

## 8) Adminpanel (detalj)

- Dashboard: dagens bokningar, kommande, no-show-statistik.
- Kalender: dag/vecka-vy.
- Snabbåtgärder:
  - Bekräfta/avboka/flytta bokning
  - Markera completed/no_show
- CRUD:
  - tjänster
  - frisörer
  - arbetstider
  - frånvaro
- Inställningar:
  - öppettider
  - policytext
  - e-postmallar

---

## 9) SEO & Lokal synlighet

- Metadata: unika titles/descriptions.
- JSON-LD:
  - `LocalBusiness` / `HairSalon`
  - adress, telefon, öppettider, geo (om möjligt)
- Sitemap + robots.
- OG-bilder för delning.
- Optimera Google Business Profile (utanför kod men viktigt).
- Landningscopy med lokala sökord: “Barberare Södermalm”, “Fade Stockholm” etc (naturligt språk).

---

## 10) Juridik & Policy (måste med)

- Integritetspolicy (GDPR):
  - vilka personuppgifter lagras
  - varför
  - hur länge
  - kontakt för radering
- Cookie-notis (om analytics används)
- Avbokningspolicy:
  - hur nära inpå man får avboka
  - ev. avgift/regler
- Samtycke i bokningsflödet (checkbox + länk till policy)

---

## 11) Säkerhet

- Supabase RLS på alla tabeller.
- Endast admin får läsa alla bokningar.
- Publik får bara skapa booking via säker endpoint.
- Rate limiting på boknings- och avboknings-endpoints.
- Validering på server (inte bara klient).
- Hasha cancel-token i DB.
- Bot-skydd för formulär (hCaptcha/Turnstile rekommenderas).

---

## 12) E-postflöden (Resend)

- `booking-confirmation`:
  - datum, tid, tjänst, frisör, adress
  - avbokningslänk
- `booking-reminder`:
  - skickas ex 24h innan
- `booking-cancelled`:
  - bekräfta avbokning
- Mallar i både text + HTML.

---

## 13) UX/UI-riktlinjer

- Mobil först (majoriteten bokar via mobil).
- Fast “Boka tid”-knapp.
- Tydliga priser och tidsåtgång.
- Få steg i flödet.
- Inline-validering med bra felmeddelanden.
- Tom-state och success-state designade.
- Galleri optimerat (webp, lazy loading).

---

## 14) Analytics & uppföljning

Mät:
- Antal bokningar/vecka
- Avhopp i bokningssteg
- Avbokningsgrad
- No-show-grad
- Mest bokade tjänst
- Konvertering från startsida → bokad tid

---

## 15) Projektstruktur (förslag)

- `app/` (routes)
- `components/`
- `lib/` (db, utils, validation)
- `server/` (actions/services)
- `emails/`
- `types/`
- `supabase/migrations/`

---

## 16) Milestones / leveransplan

## Fas 1 — Grund (1–2 dagar)
- Sätta upp Next.js, Tailwind, Supabase, auth för admin, grundlayout.

## Fas 2 — Publika sidor (2–3 dagar)
- Startsida, tjänster, frisörer, galleri, kontakt.

## Fas 3 — Bokningsmotor (3–5 dagar)
- Databas, slots, bokningsflöde, bekräftelsesida.

## Fas 4 — Avbokning + e-post (1–2 dagar)
- Token-flöde, Resend templates, reminder-jobb.

## Fas 5 — Adminpanel (3–5 dagar)
- Kalender + CRUD + statusflöden.

## Fas 6 — SEO + kvalitet (1–2 dagar)
- Schema, sitemap, metadata, test, prestanda.

---

## 17) Definition of Done (DoD)

- Bokning fungerar end-to-end på mobil och desktop.
- Ingen dubbelbokning kan ske.
- Admin kan hantera hela veckan utan DB-manualjobb.
- E-postbekräftelse + påminnelse skickas korrekt.
- Lighthouse:
  - Performance > 85
  - SEO > 90
  - Accessibility > 90
- Policy-sidor finns och är länkade i footer + bokningsflöde.

---

## 18) Öppna frågor till kund (måste besvaras)

1. Exakta öppettider per veckodag?
2. Helgdagar/röda dagar — öppet eller stängt?
3. Hur långt i förväg får man boka? (ex 30 dagar)
4. Hur sent får man avboka?
5. Ska drop-in kommuniceras på hemsidan?
6. Vill kunden ha svenska + engelska?
7. Ska flera frisörer kunna logga in separat?
8. Behövs presentkort eller rabattkoder vid launch?
9. Ska SMS-påminnelse finnas nu eller senare?
10. Finns logotyp, färger och bildmaterial klart?

---

## 19) Snabb checklista innan go-live

- [ ] Verifierade kontaktuppgifter
- [ ] Domän + HTTPS + korrekt DNS
- [ ] SEO metadata + sitemap live
- [ ] Policy-sidor publicerade
- [ ] Backups och DB-restore testat
- [ ] Felspårning (Sentry) aktiv
- [ ] Analytics aktiv
- [ ] Testbokning + testavbokning genomförd
- [ ] Adminkonto säkrat med starkt lösenord/2FA