import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCancelToken, hashToken } from "./tokens";

type Row = Record<string, unknown> | null;
const state = vi.hoisted(() => ({
  row: null as Row,
  updateRows: [] as unknown[],
  hashes: [] as string[],
  updates: [] as unknown[],
  dbCalls: 0,
}));

vi.mock("./db", () => ({
  failOnError: () => {},
  db: () => {
    state.dbCalls++;
    return {
      from: () => ({
        select: () => ({
          eq: (_col: string, hash: string) => {
            state.hashes.push(hash);
            return { maybeSingle: async () => ({ data: state.row, error: null }) };
          },
        }),
        update: (values: unknown) => {
          state.updates.push(values);
          const chain = {
            eq: () => chain,
            in: () => chain,
            gte: () => chain,
            select: async () => ({ data: state.updateRows, error: null }),
          };
          return chain;
        },
      }),
    };
  },
}));

import { cancelBookingByToken, findBookingByToken } from "./cancellation";

const now = new Date("2026-10-12T00:00:00Z");
const row = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  status: "confirmed",
  start_at: "2026-10-12T08:00:00Z",
  end_at: "2026-10-12T08:30:00Z",
  customer_name: "Anna",
  customer_email: "anna@example.com",
  services: { name: "Fade", price_sek: 350 },
  barbers: [{ name: "Shabir" }],
  ...over,
});

beforeEach(() => {
  Object.assign(state, { row: null, updateRows: [], hashes: [], updates: [], dbCalls: 0 });
});

describe("findBookingByToken", () => {
  it("rör inte databasen för ogiltigt tokenformat", async () => {
    expect(await findBookingByToken("kort")).toBeNull();
    expect(state.dbCalls).toBe(0);
  });

  it("slår upp med hash, aldrig rå token", async () => {
    const token = generateCancelToken();
    state.row = row();
    const booking = await findBookingByToken(token);
    expect(state.hashes).toEqual([await hashToken(token)]);
    expect(state.hashes[0]).not.toBe(token);
    expect(booking).toMatchObject({ serviceName: "Fade", barberName: "Shabir", priceSek: 350 });
  });

  it("ger null för okänd token", async () => {
    expect(await findBookingByToken(generateCancelToken())).toBeNull();
  });
});

describe("cancelBookingByToken", () => {
  it("avbokar en giltig bokning", async () => {
    state.row = row();
    state.updateRows = [{ id: "b1" }];
    const result = await cancelBookingByToken(generateCancelToken(), now);
    expect(result.ok).toBe(true);
    expect(state.updates).toEqual([{ status: "cancelled" }]);
  });

  it("nekar inom avbokningsgränsen utan att uppdatera", async () => {
    state.row = row({ start_at: "2026-10-12T01:00:00Z", end_at: "2026-10-12T01:30:00Z" });
    expect(await cancelBookingByToken(generateCancelToken(), now)).toEqual({ ok: false, reason: "too_late" });
    expect(state.updates).toHaveLength(0);
  });

  it("ger samma neutrala svar för okänd, redan avbokad och passerad bokning", async () => {
    const results = [];
    for (const r of [null, row({ status: "cancelled" }), row({ start_at: "2026-10-11T08:00:00Z" })]) {
      state.row = r;
      results.push(await cancelBookingByToken(generateCancelToken(), now));
    }
    expect(results).toEqual(Array(3).fill({ ok: false, reason: "invalid" }));
    expect(state.updates).toHaveLength(0);
  });

  it("hanterar race där en annan förfrågan redan avbokat (0 uppdaterade rader)", async () => {
    state.row = row();
    state.updateRows = [];
    expect(await cancelBookingByToken(generateCancelToken(), now)).toEqual({ ok: false, reason: "invalid" });
  });
});
