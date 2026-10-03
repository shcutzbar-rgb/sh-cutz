# SH-Cutz

Barbershop-webbplats med onlinebokning fÃ¶r SH-Cutz, SÃ¶dermalm i Stockholm. Byggd med Next.js (App Router), TypeScript, Tailwind CSS och Supabase, och hostas pÃ¥ Cloudflare via OpenNext. Se [PLAN.md](PLAN.md) fÃ¶r projektplan och faser.

## Kom igÃ¥ng

Krav: Node.js 20.19+ (testat med 22) och npm.

1. Installera beroenden:

   ```bash
   npm install
   ```

2. Skapa miljÃ¶fil och fyll i vÃ¤rdena (se kommentarerna i filen):

   ```bash
   cp .env.example .env.local
   ```

   PÃ¥ Windows PowerShell: `Copy-Item .env.example .env.local`

   Variabler: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TIMEZONE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`.

3. Starta utvecklingsservern:

   ```bash
   npm run dev
   ```

4. Ã–ppna [http://localhost:3000](http://localhost:3000).

### Databas (Supabase)

Utan Supabase-variabler visar sajten statisk data, men bokning krÃ¤ver databasen.

1. Skapa ett Supabase-projekt och fyll i `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` och `SUPABASE_SERVICE_ROLE_KEY` i `.env.local` (och `.dev.vars`).
2. KÃ¶r filerna i `supabase/migrations/` i ordning, antingen i Supabase SQL Editor eller med Supabase CLI (`supabase link` och `supabase db push`). De skapar tabeller, RLS-policies och seed fÃ¶r tjÃ¤nster, frisÃ¶r och arbetstider.
3. Starta om `npm run dev`. `/boka` lÃ¤ser nu lediga tider frÃ¥n databasen.

### E-post och pÃ¥minnelser

- BokningsbekrÃ¤ftelse och avbokningsbekrÃ¤ftelse skickas via [Resend](https://resend.com) nÃ¤r kunden angett e-post. Fyll i `RESEND_API_KEY` och `EMAIL_FROM` (verifierad domÃ¤n). Utan dem hoppas e-post Ã¶ver och bokningen pÃ¥verkas inte.
- Avbokning sker via lÃ¤nken `/avboka/<token>` senast 2 timmar fÃ¶re tiden (`cancelDeadlineMinutes` i `src/lib/booking-config.ts`).
- PÃ¥minnelser (ca 24 h fÃ¶re) skickas av `POST /api/cron/reminders`, som krÃ¤ver headern `Authorization: Bearer <CRON_SECRET>`.

**SchemalÃ¤ggning med Cloudflare Cron Trigger**

`wrangler.jsonc` pekar pÃ¥ `worker.ts` (som Ã¥teranvÃ¤nder OpenNext-workern) och har `"triggers": { "crons": ["0 * * * *"] }`, alltsÃ¥ en kÃ¶rning varje hel timme (UTC). `scheduled()` i `worker.ts` anropar endpointen internt med hemligheten.

1. Generera en hemlighet, t.ex. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. SÃ¤tt den i produktion: `npx wrangler secret put CRON_SECRET` (och Ã¤ven `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Deploya med `npm run deploy`. Triggern syns under Workers > sh-cutz > Settings > Triggers.
4. Testa lokalt med kÃ¶rande `npm run dev`:

   ```bash
   curl -X POST http://localhost:3000/api/cron/reminders -H "Authorization: Bearer $CRON_SECRET"
   ```

   Svaret Ã¤r `{ "due": n, "sent": n, "failed": n, "anonymized": n }`. Samma timjobb anonymiserar personuppgifter i bokningar Ã¤ldre Ã¤n `retentionMonths` (12) mÃ¥nader, sÃ¥ som `/integritet` lovar. Bokningar som gjorts mindre Ã¤n 24 h fÃ¶re starten pÃ¥minns inte (bekrÃ¤ftelsen Ã¤r dÃ¥ fÃ¤rsk).

### Bot-skydd (Cloudflare Turnstile)

Bokning, avbokning och admininloggning skyddas av Turnstile (utÃ¶ver rate limit, same-origin-kontroll och honeypot).

1. Skapa en Turnstile-widget i Cloudflare och sÃ¤tt `TURNSTILE_SITE_KEY` samt `TURNSTILE_SECRET_KEY` (`wrangler secret put TURNSTILE_SECRET_KEY`; sajtnyckeln kan ligga som vanlig variabel).
2. Utan `TURNSTILE_SECRET_KEY` hoppas kontrollen Ã¶ver i utveckling men **blockerar allt i produktion** (`NODE_ENV=production`, alltsÃ¥ Ã¤ven `npm run preview`). AnvÃ¤nd Cloudflares testnycklar (se `.env.example`) fÃ¶r lokal preview.
3. SÃ¤tt `NEXT_PUBLIC_SITE_URL` till produktionsadressen **vid bygge**; den anvÃ¤nds i sitemap, robots och canonical-lÃ¤nkar.

### Adminpanel

Adminpanelen ligger pÃ¥ `/admin` och anvÃ¤nder Supabase Auth (e-post + lÃ¶senord). Endast anvÃ¤ndare i tabellen `admin_users` slÃ¤pps in.

1. Skapa anvÃ¤ndaren i Supabase: Authentication > Users > Add user (bekrÃ¤fta e-posten). **StÃ¤ng av Ã¶ppen registrering** under Authentication > Providers/Sign In, och aktivera helst MFA.
2. GÃ¶r anvÃ¤ndaren till admin i SQL Editor (byt e-post, och `owner` mot `staff` vid behov):

   ```sql
   insert into admin_users (id, role)
   select id, 'owner' from auth.users where email = 'du@example.com';
   ```

3. Logga in pÃ¥ `/admin/login`.

| Roll | FÃ¥r |
| --- | --- |
| `staff` | Ã–versikt, kalender, bokningar (bekrÃ¤fta, avboka, flytta, genomfÃ¶rd, no-show) |
| `owner` | Allt ovan samt tjÃ¤nster, frisÃ¶rer (inkl. arbetstider och frÃ¥nvaro) och instÃ¤llningar |

BehÃ¶righet kontrolleras pÃ¥ servern i layouten, pÃ¥ varje sida och i varje server action. AdminÃ¥tgÃ¤rder kÃ¶rs med den inloggade anvÃ¤ndarens egen session, sÃ¥ RLS (`20261003110000_admin_roles.sql`) gÃ¤ller som ett andra lager. Ã–ppettider pÃ¥ sajten hÃ¤rleds frÃ¥n frisÃ¶rernas arbetstider.

### Ã–vriga kommandon

| Kommando | Beskrivning |
| --- | --- |
| `npm run lint` | KÃ¶r ESLint |
| `npm test` | KÃ¶r enhetstester (vitest) |
| `npm run build` | Produktionsbygge (Next.js) |
| `npm run preview` | FÃ¶rhandsgranska pÃ¥ Cloudflare-runtime (lÃ¤ser `.dev.vars`, kopiera frÃ¥n `.env.example`) |
| `npm run deploy` | Bygg och deploya till Cloudflare |

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
