// Delad kontroll av om verksamhetens uppgifter är bekräftade (och inte längre seed-värden).
// Används av scripts/check-launch-ready.mjs (före deploy) och scripts/check-live.mjs (efter deploy).
import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.production.local", ".env.local", ".env.production", ".env"];

/** Läser .env-filer i samma prioritetsordning som Next.js; befintliga miljövariabler vinner. */
export function loadEnv(cwd = process.cwd(), env = process.env) {
  for (const file of ENV_FILES) {
    const full = path.join(cwd, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || match[1] in env) continue;
      env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return env;
}

// Värden från seed-migreringen (supabase/migrations/*_seed.sql).
export const SEED = { phone: "072-192 68 49", address: "Folkungagatan 87" };
const SEED_HOURS = { 1: ["10:00-19:00"], 2: ["10:00-19:00"], 3: ["10:00-19:00"], 4: ["10:00-19:00"], 5: ["10:00-19:00"], 6: ["10:00-17:00"] };

/** rows: [{ weekday, start_time, end_time }] */
export function looksLikeSeedHours(rows) {
  const byDay = {};
  for (const r of rows) (byDay[r.weekday] ??= []).push(`${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}`);
  const days = Object.keys(byDay).sort();
  const seedDays = Object.keys(SEED_HOURS).sort();
  return days.join() === seedDays.join() && days.every((d) => [...new Set(byDay[d])].sort().join() === SEED_HOURS[d].join());
}

async function rest(env, fetchImpl, table, query) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const res = await fetchImpl(`${base}/rest/v1/${table}?${query}`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

/** Returnerar { blockers, warnings } med läsbara meddelanden. Kräver NEXT_PUBLIC_SUPABASE_URL och _ANON_KEY. */
export async function fetchDatabaseReadiness({ env = process.env, fetchImpl = fetch } = {}) {
  const blockers = [];
  const warnings = [];

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    blockers.push("NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY saknas, så uppgifterna kan inte verifieras.");
    return { blockers, warnings };
  }

  try {
    const [settings] = await rest(
      env,
      fetchImpl,
      "shop_settings",
      "id=eq.1&select=phone,address_line,postal_code,contact_confirmed_at,hours_confirmed_at",
    );
    const hours = await rest(env, fetchImpl, "working_hours", "is_active=eq.true&select=weekday,start_time,end_time");

    if (!settings) {
      blockers.push("Inställningsraden (shop_settings) saknas: kör migreringarna och fyll i Admin > Inställningar.");
    } else {
      if (!settings.contact_confirmed_at) {
        const seed = settings.phone === SEED.phone || settings.address_line === SEED.address;
        blockers.push(
          `Kontaktuppgifterna är inte bekräftade${seed ? " och innehåller fortfarande seed-värden" : ""} (telefon ${settings.phone}, adress ${settings.address_line}). Kontrollera dem och kryssa i bekräftelsen under Admin > Inställningar.`,
        );
      }
      if (!settings.postal_code) warnings.push("Postnummer saknas (påverkar lokal SEO).");
    }

    if (hours.length === 0) {
      blockers.push("Inga arbetstider finns: öppettider skulle saknas på sajten. Lägg in dem under Admin > Frisörer.");
    } else if (!settings?.hours_confirmed_at) {
      blockers.push(
        `Öppettiderna är inte bekräftade${looksLikeSeedHours(hours) ? " och är fortfarande seed-värdena (mån–fre 10–19, lör 10–17)" : ""}. Kontrollera dem och kryssa i bekräftelsen under Admin > Inställningar.`,
      );
    }
  } catch (err) {
    blockers.push(`Kunde inte läsa från Supabase (${err instanceof Error ? err.message : String(err)}).`);
  }

  return { blockers, warnings };
}
