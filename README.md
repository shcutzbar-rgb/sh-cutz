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

   Variabler: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TIMEZONE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`.

3. Starta utvecklingsservern:

   ```bash
   npm run dev
   ```

4. Öppna [http://localhost:3000](http://localhost:3000).

### Databas (Supabase)

Utan Supabase-variabler visar sajten statisk data, men bokning kräver databasen.

1. Skapa ett Supabase-projekt och fyll i `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` och `SUPABASE_SERVICE_ROLE_KEY` i `.env.local` (och `.dev.vars`).
2. Kör filerna i `supabase/migrations/` i ordning, antingen i Supabase SQL Editor eller med Supabase CLI (`supabase link` och `supabase db push`). De skapar tabeller, RLS-policies och seed för tjänster, frisör och arbetstider.
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

   Svaret är `{ "due": n, "sent": n, "failed": n }`. Bokningar som gjorts mindre än 24 h före starten påminns inte (bekräftelsen är då färsk).

### Adminpanel

Adminpanelen ligger på `/admin` och använder Supabase Auth (e-post + lösenord). Endast användare i tabellen `admin_users` släpps in.

1. Skapa användaren i Supabase: Authentication > Users > Add user (bekräfta e-posten). **Stäng av öppen registrering** under Authentication > Providers/Sign In, och aktivera helst MFA.
2. Gör användaren till admin i SQL Editor (byt e-post, och `owner` mot `staff` vid behov):

   ```sql
   insert into admin_users (id, role)
   select id, 'owner' from auth.users where email = 'du@example.com';
   ```

3. Logga in på `/admin/login`.

| Roll | Får |
| --- | --- |
| `staff` | Översikt, kalender, bokningar (bekräfta, avboka, flytta, genomförd, no-show) |
| `owner` | Allt ovan samt tjänster, frisörer (inkl. arbetstider och frånvaro) och inställningar |

Behörighet kontrolleras på servern i layouten, på varje sida och i varje server action. Adminåtgärder körs med den inloggade användarens egen session, så RLS (`20261003110000_admin_roles.sql`) gäller som ett andra lager. Öppettider på sajten härleds från frisörernas arbetstider.

### Övriga kommandon

| Kommando | Beskrivning |
| --- | --- |
| `npm run lint` | Kör ESLint |
| `npm test` | Kör enhetstester (vitest) |
| `npm run build` | Produktionsbygge (Next.js) |
| `npm run preview` | Förhandsgranska på Cloudflare-runtime (läser `.dev.vars`, kopiera från `.env.example`) |
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
