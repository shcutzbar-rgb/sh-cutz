import { describe, expect, it } from "vitest";
import { fetchDatabaseReadiness, looksLikeSeedHours, loadEnv } from "./launch-status.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const seedHours = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: "10:00:00", end_time: "19:00:00" })).concat([
  { weekday: 6, start_time: "10:00:00", end_time: "17:00:00" },
]);

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" };

function fakeFetch(tables) {
  return async (url) => {
    const table = new URL(url).pathname.split("/").pop();
    if (!(table in tables)) return new Response("nope", { status: 404 });
    return Response.json(tables[table]);
  };
}

const settings = (over = {}) => ({
  phone: "070-000 00 00",
  address_line: "Riktiggatan 1",
  postal_code: "116 31",
  contact_confirmed_at: "2026-10-04T10:00:00Z",
  hours_confirmed_at: "2026-10-04T10:00:00Z",
  ...over,
});

describe("looksLikeSeedHours", () => {
  it("känner igen seed-öppettiderna oavsett sekunder och dubbletter", () => {
    expect(looksLikeSeedHours(seedHours)).toBe(true);
    expect(looksLikeSeedHours([...seedHours, ...seedHours])).toBe(true);
  });

  it("känner inte igen andra öppettider", () => {
    expect(looksLikeSeedHours(seedHours.map((h) => (h.weekday === 6 ? { ...h, end_time: "16:00:00" } : h)))).toBe(false);
    expect(looksLikeSeedHours(seedHours.slice(0, 5))).toBe(false);
    expect(looksLikeSeedHours([])).toBe(false);
  });
});

describe("fetchDatabaseReadiness", () => {
  it("godkänner bekräftade uppgifter och arbetstider", async () => {
    const result = await fetchDatabaseReadiness({
      env,
      fetchImpl: fakeFetch({ shop_settings: [settings()], working_hours: [{ weekday: 1, start_time: "09:00:00", end_time: "18:00:00" }] }),
    });
    expect(result).toEqual({ blockers: [], warnings: [] });
  });

  it("stoppar obekräftad kontaktinfo med seed-värden och namnger dem", async () => {
    const result = await fetchDatabaseReadiness({
      env,
      fetchImpl: fakeFetch({
        shop_settings: [settings({ phone: "072-192 68 49", address_line: "Folkungagatan 87", contact_confirmed_at: null })],
        working_hours: seedHours,
      }),
    });
    expect(result.blockers.join("\n")).toMatch(/Kontaktuppgifterna är inte bekräftade och innehåller fortfarande seed-värden/);
  });

  it("stoppar obekräftade seed-öppettider", async () => {
    const result = await fetchDatabaseReadiness({
      env,
      fetchImpl: fakeFetch({ shop_settings: [settings({ hours_confirmed_at: null })], working_hours: seedHours }),
    });
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toMatch(/Öppettiderna är inte bekräftade och är fortfarande seed-värdena/);
  });

  it("stoppar när arbetstider saknas, och varnar för saknat postnummer", async () => {
    const result = await fetchDatabaseReadiness({
      env,
      fetchImpl: fakeFetch({ shop_settings: [settings({ postal_code: null })], working_hours: [] }),
    });
    expect(result.blockers[0]).toMatch(/Inga arbetstider/);
    expect(result.warnings[0]).toMatch(/Postnummer/);
  });

  it("stoppar när konfiguration eller databas saknas eller svarar med fel", async () => {
    expect((await fetchDatabaseReadiness({ env: {} })).blockers[0]).toMatch(/saknas/);
    const failing = await fetchDatabaseReadiness({ env, fetchImpl: fakeFetch({}) });
    expect(failing.blockers[0]).toMatch(/Kunde inte läsa från Supabase/);
  });
});

describe("loadEnv", () => {
  it("läser .env-filer med prioritet och låter befintliga variabler vinna", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-"));
    fs.writeFileSync(path.join(dir, ".env.production.local"), 'A=prod-local\nQ="quoted value"\n');
    fs.writeFileSync(path.join(dir, ".env.production"), "A=prod\nB=2\n");
    const target = { B: "fromshell" };
    loadEnv(dir, target);
    expect(target).toEqual({ A: "prod-local", Q: "quoted value", B: "fromshell" });
  });
});
