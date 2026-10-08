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

Bygg Fas 2: Publika sidor enligt PLAN.md. Ersätt placeholders med riktigt innehåll på /, /tjanster, /frisorer, /galleri och /kontakt. Lägg tjänster (Fade 350 kr/30 min, Skägg 180 kr/15 min, Fade & Skägg 400 kr/30 min, Fade sidorna 280 kr) och frisör (Shabir) i lib som typad statisk data, som senare kan bytas mot Supabase. Startsidan ska ha hero, tjänsteutdrag, öppettider, en lokal SEO-text och CTA. Kontaktsidan ska ha adress, klickbart telefonnummer och inbäddad karta. Galleriet ska ha ett responsivt rutnät med next/image, lazy loading och alt-texter. Lägg till metadata per sida och en LocalBusiness/HairSalon JSON-LD på startsidan. Följ mobil-först och tillgänglighetskraven. Verifiera med npm run build och npm run lint, och committa i små commits.


Bygg Fas 3: Bokningsmotor enligt PLAN.md. Skapa Supabase-migreringar i migrations för services, barbers, working_hours, time_off, bookings, admin_users och shop_settings. Inkludera RLS på alla tabeller, en DB-constraint som förhindrar dubbelbokning (exclusion constraint på barber och tidsintervall för pending/confirmed) och seed för tjänster och frisör. Byt de statiska datakällorna i lib mot Supabase-läsning med statisk data som fallback. Bygg slot-beräkning i server (tidszon Europe/Stockholm, 15 min-steg, arbetstider, time_off, befintliga bokningar och "senast 2 h innan") med enhetstester. Bygg bokningsflödet på /boka (tjänst → frisör → tid → kontaktuppgifter med samtyckes-checkbox → bekräftelse) med react-hook-form + zod, serverside-validering, en säker endpoint för att skapa bokning, och en hashad cancel_token. Verifiera med npm run build, npm run lint och tester, och committa i små commits.

Bygg Fas 4: Avbokning + e-post enligt PLAN.md. Implementera /avboka/[token]: hasha token, slå upp bokningen med service role, visa sammanfattning och en bekräftelseknapp. Avbokning sker via POST-endpoint med same-origin-kontroll och rate limit. Sätt status cancelled, och respektera en avbokningsgräns som konstant i booking-config.ts (förslag 2 h före). Ogiltig eller redan använd token ska ge en neutral sida utan att läcka om bokningen finns. Lägg till Resend med e-postmallar i emails (text + HTML) för booking-confirmation (med avbokningslänk), booking-reminder och booking-cancelled. Skicka bekräftelse efter lyckad bokning om kunden angett e-post, och låt e-postfel aldrig fälla bokningen. Bygg en reminder-endpoint skyddad av CRON_SECRET som skickar påminnelser ca 24 h före och sätter reminder_sent_at, samt dokumentera hur den schemaläggs med Cloudflare Cron Trigger. Skriv enhetstester för

Bygg Fas 5: Adminpanel enligt PLAN.md. Inför inloggning med Supabase Auth (e-post + lösenord) för /admin/*, där endast användare i admin_users släpps in. Kontrollen ska göras server-side i layout och i alla admin-API:er/server actions, med utloggning och tydlig behandling av owner respektive staff. Bygg /admin (dashboard: dagens och kommande bokningar, no-show-statistik), /admin/kalender (dag- och veckovy per frisör), /admin/bokningar (lista med filter, åtgärderna bekräfta, avboka, flytta, markera completed/no_show; avbokning ska skicka booking-cancelled-mejl), /admin/tjanster, /admin/frisorer (CRUD inkl. arbetstider och frånvaro/time_off) och /admin/installningar (policytext, öppettider, shop_settings). Flytta av bokning ska återanvända slot-logiken och exclusion constraint. Admin-skrivningar går via server actions med zod-validering. Låt publika sidor läsa öppettider från working_hours/shop_settings i stället för hours.ts. Skriv tester för behörighetskontroll och flyttlogik. Verifiera med npm run build, npm run lint och npm test, och committa i små commits.

Bygg Fas 6: SEO + kvalitet enligt PLAN.md. Lägg till app/sitemap.ts och app/robots.ts, där robots stänger /admin, /avboka och /api och sitemap listar de publika sidorna. Se över metadata per sida (title, description, canonical, OG och Twitter) och skapa en OG-bild med opengraph-image. Låt LocalBusiness/HairSalon-JSON-LD hämta öppettider från databasen med postnummer och, om möjligt, geo. Gör en tillgänglighetsgenomgång (kontrast, fokusordning, alt-texter, ARIA i bokningsflödet och admin) och en prestandagenomgång med Lighthouse, med mål Performance > 85, SEO > 90 och Accessibility > 90. Lägg till en cookie-notis bara om analytics införs, och komplettera /integritet med lagringstid och personuppgiftsansvarig. Lägg till Turnstile (eller Cloudflare Rate Limiting) på bokning, avbokning och login. Skriv ett end-to-end-test av boknings- och avbokningsflödet mot en lokal Supabase eller PGlite. Verifiera med npm run build, npm run lint, npm test och opennextjs-cloudflare build, och committa i små commits.

Gör en go-live-genomgång enligt checklistan i PLAN.md (avsnitt 19). Gå igenom varje punkt och verifiera vad som går att verifiera i koden: kontaktuppgifter och öppettider, SEO (sitemap, robots, metadata, JSON-LD), policysidor och länkar i footer och bokningsflöde, felspårning och analytics. Föreslå och implementera Sentry (@sentry/cloudflare eller motsvarande, kontrollera workerstorleken mot 3 MiB gzip) om det får plats, annars alternativ. Lägg till en enkel hälsokontroll-endpoint som inte läcker interna detaljer. Skriv en driftsättningsguide i README för Cloudflare (secrets, cron-trigger, domän och DNS, Supabase-projekt och migreringar, första admin, backup och återställningstest). Lista allt som kräver manuella steg eller svar från kunden (frågorna i avsnitt 18) och vad som blockerar launch. Verifiera med npm run build, npm run lint, npm test och opennextjs-cloudflare build, och committa i små commits.

Bygg tvåstegsverifiering (TOTP/MFA) för adminpanelen med Supabase MFA. Efter lösenordsinloggning ska användare som har en verifierad faktor ledas till /admin/login/mfa och verifiera med mfa.challengeAndVerify. resolveAdmin ska kräva AAL2 när nextLevel är aal2. Lägg till /admin/sakerhet där inloggad admin kan registrera TOTP (QR-kod via mfa.enroll) och ta bort sin faktor. Ge owner möjlighet att kräva MFA för alla admins via en inställning, och blockera då åtkomst tills faktorn är registrerad. Skriv enhetstester för AAL-kontrollen med mockad session, uppdatera README och go-live-checklistan, och verifiera med npm run build, npm run lint, npm test och opennextjs-cloudflare build. Committa i små commits.


Gör en slutlig hårdgörning inför launch: (1) lägg till ett skript eller en CI-workflow (GitHub Actions) som kör npm run lint, npm test, npm run build och opennextjs-cloudflare build på varje push samt npm audit --omit=dev, (2) ta bort påhittade utkast ur koden så att inget kan gå live med falska uppgifter, till exempel genom att check:live och en bygg-tid-kontroll slår larm när öppettider, telefon eller adress fortfarande är seed-värden, (3) lägg till booking-moved-mejl till kund när admin flyttar en bokning (mall text + HTML, tester, kopplat i moveBookingAction), (4) bygg en enkel "Dröppen" (drop-in)-text som kan redigeras i Admin > Inställningar och visas på startsida och kontakt, och (5) lägg till per-frisör-koppling för staff (valfri barber_id i admin_users) så att personal kan begränsas till sina egna bokningar, med RLS och tester. Verifiera med npm run build, npm run lint, npm test och opennextjs-cloudflare build, och committa i små commits.

Gör en komplett designhöjning av SH-Cutz (barbershop på Södermalm, Stockholm) för hela webbplatsen och bokningsflödet. Nuvarande design är tråkig och generisk. Målet är en modern, premium, självsäker barbershop-känsla som får besökare att vilja boka direkt, mobil först (de flesta bokar från telefonen).

## Designriktning
- Känsla: mörk, varm, premium och urban. Tänk modern barbershop, inte frisörsalong. Mycket kontrast, skarpa linjer, generösa luftytor.
- Palett: nära svart bakgrund (#0a0a0a) med varma gråa nyanser för ytor, guld (#d4af37) som enda accentfärg, samt off-white text. Definiera allt som CSS-variabler/tokens i Tailwind 4 (@theme) så färger, radier och skuggor styrs från ett ställe.
- Typografi: en uttrycksfull display-font för rubriker (t.ex. Oswald, Bebas Neue eller Playfair Display, via next/font med self-hosting och display: swap) och en ren sans (Inter eller Geist) för brödtext. Tydlig hierarki, stora rubriker, tight letter-spacing på versaler.
- Former: skarpa eller mycket små radier, tunna guldlinjer som detaljer, subtila gradienter och korn/textur. Inga överdrivna skuggor.
- Rörelse: återhållsam och snabb (150–250 ms). Fade/slide-in vid scroll med CSS (IntersectionObserver, inga tunga bibliotek), hover-/focus-tillstånd på alla klickbara ytor. Respektera prefers-reduced-motion.

## Sidor och sektioner
1. Startsida: 
   - Hero i helskärm på mobil med stark rubrik, en kort undertext och en tydlig primär CTA "Boka tid" (sticky på mobil) samt sekundär "Se priser". Bakgrundsbild eller video-loop med mörk overlay (använd en platshållare som lätt byts, inga hotlinkade bilder).
   - Förtroendelist: betyg, antal klippningar, "Boka på 1 minut" (endast sådant som är sant eller redigerbart i admin, inget påhittat).
   - Tjänster med priser och tid som snygga kort (data från databasen, som idag).
   - Frisörer med foto, namn och en "Boka hos X"-knapp.
   - Galleri (masonry eller horisontell scroll), lazy-loaded webp med fasta proportioner för att undvika layoutskift.
   - Öppettider, Dröppen-ruta (visas bara när texten är ifylld), karta/adress och kontakt.
   - Avslutande stor CTA och en kompakt footer.
2. Tjänster/priser, Kontakt, Integritet, Avboka-sidan: samma designspråk, tydliga rubriker, bra läsbarhet för långtext.
3. Header: transparent över hero, solid vid scroll, mobilmeny med stor träffyta, alltid synlig "Boka"-knapp.

## Bokningsflödet (viktigast)
Gör det till en tydlig stegvis upplevelse med en progressindikator ("1 Tjänst, 2 Frisör, 3 Tid, 4 Dina uppgifter, 5 Klart"):
- Steg 1: välj tjänst via stora tryckvänliga kort (namn, tid, pris, kort beskrivning).
- Steg 2: välj frisör eller "Valfri frisör" med foto.
- Steg 3: datumväljare som horisontell dagstrip (veckodag + datum) och tider som tydliga chips. Visa vilka dagar som är stängda eller fullbokade, och ett vänligt tomt läge ("Inga lediga tider denna dag, prova nästa") med knapp till nästa lediga dag. Tider i Europe/Stockholm.
- Steg 4: formulär med namn, telefon, e-post (valfri, med förklaring att den behövs för bekräftelse och påminnelse), kommentar, Turnstile och GDPR-text. Inline-validering på svenska, tydliga fel, rätt inputmode/autocomplete.
- Sammanfattning som alltid syns (sticky sammanfattningsrad på mobil, sidopanel på desktop): tjänst, frisör, tid, pris.
- Bekräftelsesida: stor tydlig bekräftelse, alla detaljer, "Lägg i kalender" (.ics), vägbeskrivning och avbokningslänk.
- Hantera laddning (skeletons), fel och dubbelbokning ("Tiden hann bli bokad") utan att användaren tappar sina val. Tillåt att gå tillbaka mellan steg utan att data försvinner.
- Avboka-sidan: tydlig sammanfattning, en bekräftelseknapp och besked om avbokningsgränsen.

## Adminpanelen
Lätt uppfräschning i samma tokens: läsbara tabeller, tydliga statusbadges, bra mobilvy för kalender och bokningslista. Ingen omdesign av logiken.

## Krav och begränsningar (får inte brytas)
- Behåll Next.js App Router, Tailwind 4 och nuvarande datalager. Ändra ingen affärslogik, RLS eller server actions.
- Prestanda: Lighthouse mobil minst 95 i Performance och 100 i Accessibility, Best Practices och SEO. Inga nya tunga beroenden (ingen Framer Motion, inga slider-bibliotek). Workern ska fortsatt vara under 3072 KiB gzip (idag ca 2134 KiB), så verifiera med OpenNext-bygge och wrangler dry-run.
- Tillgänglighet: WCAG AA-kontrast (kontrollera guld på svart), synlig fokusmarkering, tangentbordsnavigering, aria-labels, minst 44 px träffyta, semantiska rubriker.
- Innehåll: inga påhittade uppgifter (adress, telefon, öppettider, omdömen, priser). Allt kommer från databasen eller admin-inställningar, och saknas data ska sektionen döljas snyggt. Texterna är på svenska.
- Hårdkoda inte adress eller öppettider i brödtext; använd shop-settings. Behåll deploy-spärren (check:launch) och JSON-LD.
- Bilder: använd next/image eller fasta width/height, webp, lazy-loading, alt-texter.

## Leverans
1. Börja med en kort designspec (tokens, typografi, komponentlista) och visa mig den innan du bygger.
2. Bygg sedan i små commits: (a) tokens + typografi + layout/header/footer, (b) startsidan, (c) bokningsflödet, (d) övriga sidor, (e) admin-polish.
3. Verifiera efter varje del med `npm run lint`, `npm test`, `npm run build`, och i slutet OpenNext-bygge, samt kör Lighthouse mobil på startsida och /boka.
4. Avsluta med en kort sammanfattning, vad som kräver riktiga bilder/texter från kunden, och förslag på nästa steg.