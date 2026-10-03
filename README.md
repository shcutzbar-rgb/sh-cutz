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
