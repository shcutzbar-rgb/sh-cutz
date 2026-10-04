# SH-Cutz

Barbershop-webbplats med onlinebokning för SH-Cutz, Södermalm i Stockholm. Byggd med Next.js (App Router), TypeScript, Tailwind CSS och Supabase, och hostas på Cloudflare via OpenNext. Se [PLAN.md](PLAN.md) för projektplan och faser.

## Kom igång

Krav: Node.js 20.19+ (testat med 22) och npm.

1. Installera beroenden:

   ```bash
   npm install
   ```

2. Skapa miljöfil och fyll i värdena (se kommentarerna i filen):

   ```bash
   cp .env.example .env.local
   ```

   På Windows PowerShell: `Copy-Item .env.example .env.local`

   Variabler: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TIMEZONE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` och valfritt `SENTRY_DSN`.

3. Starta utvecklingsservern:

   ```bash
   npm run dev
   ```

4. Öppna [http://localhost:3000](http://localhost:3000).

### Databas (Supabase)

Utan Supabase-variabler visar sajten statisk data, men bokning kräver databasen.

1. Skapa ett Supabase-projekt och fyll i `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` och `SUPABASE_SERVICE_ROLE_KEY` i `.env.local` (och `.dev.vars`).
2. Kör filerna i `supabase/migrations/` i ordning, antingen i Supabase SQL Editor eller med Supabase CLI (`supabase link` och `supabase db push`). De skapar tabeller, RLS-policies och seed för tjänster, frisör och arbetstider. Migrationen `20261004100000_daily_hours_10_20.sql` sätter befintliga aktiva frisörer till 10:00-20:00 alla dagar.
3. Starta om `npm run dev`. `/boka` läser nu lediga tider från databasen.

### E-post och påminnelser

- Bokningsbekräftelse och avbokningsbekräftelse skickas via [Resend](https://resend.com) när kunden angett e-post. Fyll i `RESEND_API_KEY` och `EMAIL_FROM` (verifierad domän). Utan dem hoppas e-post över och bokningen påverkas inte.
- Avbokning sker via länken `/avboka/<token>` senast 2 timmar före tiden (`cancelDeadlineMinutes` i `src/lib/booking-config.ts`).
- Påminnelser (ca 24 h före) skickas av `POST /api/cron/reminders`, som kräver headern `Authorization: Bearer <CRON_SECRET>`.

**Schemaläggning med Cloudflare Cron Trigger**

`wrangler.jsonc` pekar på `worker.ts` (som återanvänder OpenNext-workern) och har `"triggers": { "crons": ["0 * * * *"] }`, alltså en körning varje hel timme (UTC). `scheduled()` i `worker.ts` anropar endpointen internt med hemligheten.

1. Generera en hemlighet, t.ex. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Sätt den i produktion: `npx wrangler secret put CRON_SECRET` (och även `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Deploya med `npm run deploy`. Triggern syns under Workers > sh-cutz > Settings > Triggers.
4. Testa lokalt med körande `npm run dev`:

   ```bash
   curl -X POST http://localhost:3000/api/cron/reminders -H "Authorization: Bearer $CRON_SECRET"
   ```

   Svaret är `{ "due": n, "sent": n, "failed": n, "anonymized": n }`. Samma timjobb anonymiserar personuppgifter i bokningar äldre än `retentionMonths` (12) månader, så som `/integritet` lovar. Bokningar som gjorts mindre än 24 h före starten påminns inte (bekräftelsen är då färsk).

### Bot-skydd (Cloudflare Turnstile)

Bokning, avbokning och admininloggning skyddas av Turnstile (utöver rate limit, same-origin-kontroll och honeypot).

1. Skapa en Turnstile-widget i Cloudflare och sätt `TURNSTILE_SITE_KEY` samt `TURNSTILE_SECRET_KEY` (`wrangler secret put TURNSTILE_SECRET_KEY`; sajtnyckeln kan ligga som vanlig variabel).
2. Utan `TURNSTILE_SECRET_KEY` hoppas kontrollen över i utveckling men **blockerar allt i produktion** (`NODE_ENV=production`, alltså även `npm run preview`). Använd Cloudflares testnycklar (se `.env.example`) för lokal preview.
3. Sätt `NEXT_PUBLIC_SITE_URL` till produktionsadressen **vid bygge**; den används i sitemap, robots och canonical-länkar.

### Adminpanel

Adminpanelen ligger på `/admin` och använder Supabase Auth (e-post + lösenord). Endast användare i tabellen `admin_users` släpps in.

1. Skapa användaren i Supabase: Authentication > Users > Add user (bekräfta e-posten) med ett långt, unikt lösenord. **Stäng av öppen registrering** under Authentication > Sign In / Providers.
2. Gör användaren till admin i SQL Editor (byt e-post, och `owner` mot `staff` vid behov):

   ```sql
   insert into admin_users (id, role)
   select id, 'owner' from auth.users where email = 'du@example.com';
   ```

3. Logga in på `/admin/login`.

| Roll | Får |
| --- | --- |
| `staff` | Översikt, kalender, bokningar (bekräfta, avboka, flytta, genomförd, no-show). Kan begränsas till en egen frisör, se nedan |
| `owner` | Allt ovan samt tjänster, frisörer (inkl. arbetstider och frånvaro) och inställningar |

**Personal per frisör:** koppla en `staff`-användare till en frisör så ser och ändrar hen bara den frisörens bokningar (RLS-policyn `bookings_admin_access` och funktionen `can_access_barber()` i `20261003160000_staff_barber.sql`, plus filtrerade val i gränssnittet). Utan koppling (`barber_id` är `null`) ser personalen alla, och ägare är aldrig begränsade. Kopplingen sätts med SQL (ingen UI, och personal kan inte ändra den själv):

```sql
update admin_users set barber_id = '<frisör-uuid>' where id = (select id from auth.users where email = 'personal@example.com');
```

En frisör som är kopplad till en användare kan inte raderas (`on delete restrict`); inaktivera i stället eller ta bort kopplingen först.

**Mejl vid flytt:** när admin flyttar en bokning får kunden ett mejl (`booking-moved`) med ny och tidigare tid om e-post finns. Saknas e-post visas en uppmaning att ringa kunden.

**Bekräftelse och dröppen:** under Admin > Inställningar bekräftar ägaren att kontaktuppgifter och öppettider stämmer (sparas som tidsstämplar, och avkryssning gör dem obekräftade igen). Översikten visar vad som återstår. Samma sida har en fri text för *Dröppen* som visas på startsidan och kontaktsidan när den inte är tom.

Behörighet kontrolleras på servern i layouten, på varje sida och i varje server action. Adminåtgärder körs med den inloggade användarens egen session, så RLS (`20261003110000_admin_roles.sql`) gäller som ett andra lager. Öppettider på sajten härleds från frisörernas arbetstider.

#### Tvåstegsverifiering (TOTP)

Admin skyddas av TOTP (autentiseringsapp) via Supabase MFA.

1. Kontrollera att TOTP är påslaget i Supabase: Authentication > Sign In / Providers > Multi-Factor.
2. Logga in och öppna **Säkerhet** (`/admin/sakerhet`) > *Aktivera tvåstegsverifiering*. Skanna QR-koden och bekräfta med första koden.
3. Framöver frågar inloggningen efter en kod på `/admin/login/mfa`. Användare med verifierad faktor får **ingen** åtkomst till `/admin` eller adminåtgärder förrän sessionen är AAL2.
4. **Kräv MFA för alla:** ägaren kan under Admin > Inställningar kryssa i *Kräv tvåstegsverifiering för alla admins*. Admins utan faktor skickas då till Säkerhet och blockeras från resten tills de har registrerat en. Aktivera din egen först. Vid databasfel antas kravet gälla (fail closed).

Sessionens nivå läses ur den signaturverifierade JWT:n (`getClaims`) och faktorerna från Auth-servern (`getUser`), aldrig från cookie-sessionen, som går att förfalska.

**Tappad telefon / återställning:** Supabase har inga återhämtningskoder. En annan `owner` kan inte ta bort din faktor via appen. Ta bort den i Supabase (Authentication > Users > användaren, om dashboarden erbjuder *Remove MFA factors*) eller med SQL i SQL Editor, och registrera sedan en ny:

```sql
delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'du@example.com');
```

Ha därför minst två `owner`-konton med egen faktor om fler än en person driver verksamheten.

### Övriga kommandon

| Kommando | Beskrivning |
| --- | --- |
| `npm run lint` | Kör ESLint |
| `npm test` | Enhetstester och end-to-end-test av bokning/avbokning mot PGlite (vitest) |
| `npm run check:live -- https://din-domän.se` | Kontrollerar en körande sajt mot go-live-checklistan (robots, sitemap, canonical, JSON-LD, headers, adminskydd, hälsokontroll, bekräftade kontaktuppgifter/öppettider) |
| `npm run check:launch` | Stoppar (exit 1) om sajten fortfarande har utkastvärden: saknad `NEXT_PUBLIC_SITE_URL`, platshållarbilder i galleriet eller obekräftade/seed-lika kontaktuppgifter och öppettider. Körs automatiskt av `predeploy` och `preupload`, alltså före `npm run deploy` |
| `npm run verify` | Kör lint, tester och bygge lokalt (samma som CI) |
| `npm run build` | Produktionsbygge (Next.js) |
| `npm run preview` | Förhandsgranska på Cloudflare-runtime (läser `.dev.vars`, kopiera från `.env.example`) |
| `npm run deploy` | Bygg och deploya till Cloudflare |

### CI (GitHub Actions)

`.github/workflows/ci.yml` körs vid varje push och pull request: `npm run lint`, `npm test`, `npm run build`, `opennextjs-cloudflare build` samt en kontroll att workern efter `wrangler deploy --dry-run` ligger under 3072 KiB gzip (gratisplanens gräns). Ett separat jobb kör `npm audit --omit=dev` (körtidsberoenden; misslyckas vid skärpta sårbarheter). CI-bygget använder `NEXT_PUBLIC_SITE_URL=https://example.com` och kör alltså inte launch-spärren, som bara gäller deploy.

### Launch-spärr (inga utkastvärden live)

`npm run deploy` och `npm run upload` kör först `npm run check:launch` (npm `predeploy`/`preupload`). Spärren läser miljön och `.env.production.local`/`.env.local`, kontrollerar `NEXT_PUBLIC_SITE_URL`, platshållarbilder och (om `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` finns) att kontaktuppgifter och öppettider är bekräftade i Admin > Inställningar och inte längre seed-värden. Lägg därför Supabase-variablerna i `.env.production.local` för en lokal deploy. För en test-/stagingmiljö kan spärren kringgås med `ALLOW_DRAFT_DEPLOY=1` (använd aldrig för produktion). Workers Builds i git kör också `npm run deploy` och får därmed samma spärr om bygg-variablerna är satta. Efter deploy larmar `npm run check:live` om bekräftelsen saknas.

## Projektstruktur

```
src/app/            Routes (App Router)
src/components/     UI-komponenter
src/lib/            Sajtkonfig, Supabase-klienter, validering
src/server/         Serverlogik (actions/services)
src/types/          Delade typer
src/emails/         E-postmallar (Resend)
supabase/migrations/ SQL-migreringar
```

## Driftsättning (Cloudflare)

Förutsättningar: Cloudflare-konto, domänen i Cloudflare (för enklast DNS), Supabase-, Resend- och (valfritt) Sentry-konto, samt `npx wrangler login`.

### 1. Supabase-projekt

1. Skapa ett projekt i en EU-region. Notera URL, anon-nyckel och service role-nyckel (Project settings > API).
2. Kör filerna i `supabase/migrations/` i filnamnsordning (SQL Editor eller `supabase db push`).
3. Authentication > Sign In / Providers: **stäng av öppen registrering** ("Allow new users to sign up"). Sätt Site URL till produktionsadressen.
4. Skapa första admin enligt avsnittet [Adminpanel](#adminpanel) och logga in på `/admin/login`.
5. Fyll i riktiga uppgifter under Admin > Inställningar (telefon, adress, postnummer, e-post, koordinater, avbokningspolicy) och bekräfta öppettiderna under Inställningar. Standardtiderna är 10:00-20:00 alla dagar; ändra dem under Admin > Frisörer om verksamhetens öppettider skiljer sig.

### 2. Variabler och hemligheter

`NEXT_PUBLIC_*` bakas in **vid bygge**; allt annat läses vid körning.

| Variabel | När | Var | Obligatorisk |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | bygge | skal eller `.env.production.local` | ja (sitemap, canonical, OG) |
| `NEXT_PUBLIC_TIMEZONE` | bygge | som ovan | nej (standard `Europe/Stockholm`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | bygge | som ovan | ja |
| `SUPABASE_SERVICE_ROLE_KEY` | körning | `wrangler secret put` | ja |
| `CRON_SECRET` | körning | `wrangler secret put` | ja (påminnelser, lagringstid) |
| `RESEND_API_KEY`, `EMAIL_FROM` | körning | `wrangler secret put` | ja (mejl) |
| `TURNSTILE_SECRET_KEY` | körning | `wrangler secret put` | ja (annars blockeras bokning, avbokning och login) |
| `TURNSTILE_SITE_KEY` | körning | `vars` i `wrangler.jsonc` eller dashboard | ja |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | körning | `wrangler secret put` / `vars` | nej, men rekommenderas |

```bash
# bygg-variabler: lägg i .env.production.local (ignoreras av git) eller exportera i skalet
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put SENTRY_DSN
```

Secrets kan sättas först efter första deployen eftersom workern då finns. Använder du Workers Builds (git) kan bygg-variablerna läggas som Build variables i dashboarden.

### 3. Deploy och cron

```bash
npm run deploy
```

Det bygger med OpenNext och deployar workern `sh-cutz` med cron-triggern (`0 * * * *`, varje hel timme UTC) som skickar påminnelser och anonymiserar gamla bokningar. Kontrollera under Workers > sh-cutz > Settings > Triggers och att `/api/cron/reminders` svarar 200 med rätt `Authorization: Bearer <CRON_SECRET>`. Workern ska vara under 3 MiB gzip på gratisplanen (idag ca 2,1 MiB).

### 4. Domän och DNS

1. Workers & Pages > sh-cutz > Settings > Domains & Routes > **Add > Custom domain**: lägg till apex (t.ex. `sh-cutz.se`) och `www`. Ligger zonen i Cloudflare skapas DNS-posterna och certifikatet automatiskt.
2. Skapa en Redirect Rule `www` till apex (eller tvärtom) så att bara en adress indexeras. Canonical-länkarna följer `NEXT_PUBLIC_SITE_URL`.
3. SSL/TLS > Edge Certificates: slå på **Always Use HTTPS** och **HSTS** (börja med kort max-age).
4. Turnstile: lägg domänen under Hostname Management för widgeten.
5. Resend: verifiera avsändardomänen (SPF, DKIM och helst DMARC som DNS-poster) och använd en adress på den domänen i `EMAIL_FROM`.
6. Supabase: uppdatera Site URL (se steg 1).

### 5. Verifiera efter deploy

```bash
npm run check:live -- https://din-domän.se
```

Skriptet kontrollerar bland annat HTTPS, `/api/health`, robots/sitemap/canonical på rätt domän, OG-bild, JSON-LD (öppettider, postnummer, geo), policysidan, adminskydd, säkerhetsheaders och att galleriet inte visar platshållare. Fel ger exit-kod 1; varningar (postnummer, koordinater, HSTS, platshållarbilder) är sådant som bör åtgärdas men inte stoppar.

Genomför därefter en manuell testbokning: boka (med din e-post), kontrollera bekräftelsemejlet, avboka via länken, kontrollera avbokningsmejlet, och verifiera i Admin att bokningen syns och får status `Avbokad`. Testa Flytta i admin på en ny testbokning.

### 6. Felspårning och övervakning

- **Sentry:** skapa ett projekt (JavaScript/Cloudflare) och sätt `SENTRY_DSN`. Servern rapporterar oväntade fel (sidor, API-routes, databasfel, misslyckad cron). Headers, cookies, request-body, query och användare tas bort, och avbokningstoken och e-postadresser maskas. Webbläsarfel rapporteras inte (medvetet, för snabb laddning). Lägg en alert-regel på nya fel.
- **Övervakning:** låt en uptime-tjänst (t.ex. Cloudflare Health Checks eller UptimeRobot) anropa `https://din-domän.se/api/health` varje minut. `200 {"status":"ok"}` betyder att databasen svarar; `503 {"status":"degraded"}` att den inte gör det. Inga detaljer läcker.
- **Loggar:** `npx wrangler tail` visar live-loggar från produktionsworkern.

### 7. Backup och återställningstest

Kontrollera vilken backup din Supabase-plan ger (automatiska dagliga backuper och PITR ingår i betalplaner; på gratisplanen behöver du ta egna dumpar). Ta alltid en egen dump före större ändringar. Dumparna innehåller personuppgifter: lagra dem krypterat, med begränsad åtkomst och radera gamla dumpar i takt med lagringstiden i `/integritet`.

```bash
# dump av data (anslutningssträngen finns under Connect i Supabase)
pg_dump "$DATABASE_URL" --format=custom --schema=public --data-only --exclude-table=admin_users -f sh-cutz-data.dump
```

Återställningstest (gör det före launch och sedan med jämna mellanrum):

1. Skapa ett tillfälligt Supabase-projekt.
2. Kör migreringarna `...schema.sql`, `...rls.sql`, `...admin_roles.sql`, `...shop_geo.sql`, `...admin_mfa_setting.sql`, `...launch_confirmation.sql`, `...drop_in_text.sql`, `...staff_barber.sql` och `...daily_hours_10_20.sql` (inte `...seed.sql`, den skulle ge dubbletter i `working_hours`).
3. Återställ: `pg_restore --data-only --disable-triggers --no-owner -d "$TEST_DATABASE_URL" sh-cutz-data.dump`.
4. Jämför antal rader: `select count(*) from bookings;` (samt `services`, `barbers`, `working_hours`, `shop_settings`) mot produktionsprojektet.
5. Kontrollera att en bokning ser rätt ut och att exclusion constrainten finns kvar (`\d bookings`).
6. Radera testprojektet.

## Go-live-checklista

Status mot checklistan i [PLAN.md](PLAN.md) (avsnitt 19). **Klart** = verifierat i kod/test, **Manuellt** = kräver åtgärd utanför koden.

| Punkt | Status | Kommentar |
| --- | --- | --- |
| Verifierade kontaktuppgifter | Manuellt, med spärr | Adress och telefon är utkast i `src/lib/site.ts` och seed. Fyll i riktiga uppgifter (inkl. postnummer och koordinater) under Admin > Inställningar och kryssa i bekräftelsen. `npm run deploy` stoppar och `check:live` larmar tills det är gjort. |
| Öppettider | Inställt på begäran, bekräftelse manuell | Migrationen sätter 10:00-20:00 alla dagar för aktiva frisörer. Ändra under Admin > Frisörer om tiderna ska skilja sig och bekräfta under Inställningar. Utan arbetstider i databasen visas ingen öppettidstabell. Bekräftelsen är en mänsklig kontroll. |
| Domän + HTTPS + korrekt DNS | Manuellt | Se avsnitt 4. Kontrolleras av `check:live`. |
| SEO metadata + sitemap live | Klart i kod | Sitemap, robots, canonical, Open Graph/Twitter, OG-bild och JSON-LD finns. Kräver `NEXT_PUBLIC_SITE_URL` vid bygge. Lighthouse (mobil): Performance 96–98, Accessibility 100, Best Practices 100, SEO 100. |
| Policy-sidor publicerade | Klart i kod, juridik manuellt | `/integritet` finns och är länkad i footern och i bokningsflödet. Texten är ett utkast: låt verksamheten granska den (organisationsnummer, lagringstid 12 månader). |
| Backups och DB-restore testat | Manuellt | Se avsnitt 7. |
| Felspårning (Sentry) aktiv | Klart i kod | Verifierat i Workers-runtime. Kräver `SENTRY_DSN` i produktion. |
| Analytics aktiv | Ej byggt | Ingen analytics är införd (kundbeslut). Cookiefria alternativ: Cloudflare Web Analytics eller Plausible. Inför du analytics: uppdatera `/integritet`; cookie-notis behövs bara om analytics sätter cookies. |
| Testbokning + testavbokning genomförd | Manuellt | Flödet är testat automatiskt (PGlite), men gör en riktig körning enligt avsnitt 5. |
| Adminkonto säkrat med starkt lösenord/2FA | Klart i kod, aktivering manuell | TOTP-2FA med AAL2-krav finns (se Tvåstegsverifiering). Manuellt: starkt lösenord, avstängd registrering, registrera faktor för varje admin och kryssa i *Kräv tvåstegsverifiering för alla admins*. Flödet är enhetstestat men inte kört mot ett riktigt Supabase-projekt: testa det en gång (aktivera, logga ut, logga in med kod, ta bort). |

### Svar som behövs från kunden (PLAN.md avsnitt 18)

| # | Fråga | Var svaret slår igenom |
| --- | --- | --- |
| 1 | Exakta öppettider per veckodag? | Admin > Frisörer > Arbetstider (öppettider härleds). |
| 2 | Helgdagar/röda dagar: öppet eller stängt? | Lägg in som frånvaro per frisör och dag (Admin > Frisörer). Ingen automatisk helgdagslogik finns. |
| 3 | Hur långt i förväg får man boka? | `maxDaysAhead` (nu 30) i `src/lib/booking-config.ts`. |
| 4 | Hur sent får man avboka? | `cancelDeadlineMinutes` (nu 120) i `booking-config.ts` och policytext i Admin > Inställningar. |
| 5 | Ska drop-in kommuniceras? | Byggt: fri text under Admin > Inställningar visas på startsida och kontakt när den är ifylld. Beslut om innehåll kvarstår. |
| 6 | Svenska + engelska? | Inte byggt (V2). Sajten är bara på svenska. |
| 7 | Ska flera frisörer logga in separat? | Byggt: koppla `staff` till en frisör med SQL (se Adminpanel). Kopplade användare ser bara sin frisörs bokningar. Flertalet verksamheter behöver inte mer, men kopplingen saknar UI. |
| 8 | Presentkort eller rabattkoder vid launch? | Inte byggt (V2). |
| 9 | SMS-påminnelse nu eller senare? | Inte byggt; påminnelser skickas via e-post och kräver att kunden anger e-post. |
| 10 | Finns logotyp, färger och bildmaterial? | Galleriet visar platshållarbilder, och logotyp saknas. Ersätt `public/gallery/*` (helst webp) och uppdatera alt-texter i `src/lib/gallery.ts`. |

### Blockerar launch

1. Riktiga kontaktuppgifter och öppettider, bekräftade i Admin > Inställningar (inget får gå ut med utkastvärdena; deploy-spärren stoppar annars).
2. Riktiga galleribilder (platshållarna syns för besökare).
3. Domän, DNS, HTTPS och `NEXT_PUBLIC_SITE_URL` satt vid bygge (annars pekar sitemap och canonical på fel adress).
4. Produktions-Supabase med migreringar, första admin och avstängd registrering.
5. Turnstile-nycklar (utan dem blockeras bokning, avbokning och admininloggning i produktion).
6. Verifierad avsändardomän i Resend och `EMAIL_FROM`.
7. Juridisk granskning av `/integritet`.
8. Genomförd och godkänd backup-återställning samt testbokning/-avbokning.
9. 2FA aktiverad för varje admin (och kravet påslaget), inklusive ett testat inloggningsflöde mot produktions-Supabase.

### Bör göras (blockerar inte)

- Sätt `SENTRY_DSN` och en uptime-monitor på `/api/health`.
- Fyll i postnummer och koordinater för bättre lokal SEO.
- Aktivera HSTS i Cloudflare.
- Besluta om analytics och uppdatera `/integritet` om det införs.
