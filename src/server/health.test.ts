import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ mode: "ok" as "ok" | "dberror" | "throw" | "hang", calls: 0 }));

vi.mock("./db", () => ({
  db: () => {
    state.calls++;
    if (state.mode === "throw") throw new Error("SUPABASE_SERVICE_ROLE_KEY saknas");
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              state.mode === "hang"
                ? new Promise(() => {})
                : Promise.resolve({
                    data: null,
                    error: state.mode === "dberror" ? { message: "connection to 10.0.0.5 refused" } : null,
                  }),
          }),
        }),
      }),
    };
  },
}));

import { GET, HEAD } from "@/app/api/health/route";
import { isDatabaseHealthy } from "./health";

const request = (ip = "9.9.9.9") => new Request("https://sh-cutz.example/api/health", { headers: { "cf-connecting-ip": ip } });

beforeEach(() => {
  state.mode = "ok";
  state.calls = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("isDatabaseHealthy", () => {
  it("är true när databasen svarar utan fel", async () => {
    expect(await isDatabaseHealthy()).toBe(true);
  });

  it("är false vid databasfel och när konfiguration saknas", async () => {
    state.mode = "dberror";
    expect(await isDatabaseHealthy()).toBe(false);
    state.mode = "throw";
    expect(await isDatabaseHealthy()).toBe(false);
  });

  it("ger false efter timeout i stället för att hänga", async () => {
    vi.useFakeTimers();
    state.mode = "hang";
    const result = isDatabaseHealthy();
    await vi.advanceTimersByTimeAsync(3100);
    expect(await result).toBe(false);
    vi.useRealTimers();
  });
});

describe("GET /api/health", () => {
  it("svarar 200 och bara status när allt fungerar", async () => {
    const res = await GET(request("1.1.1.1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("svarar 503 utan att läcka felmeddelanden eller hostnamn", async () => {
    state.mode = "dberror";
    const res = await GET(request("2.2.2.2"));
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "degraded" });
    expect(text).not.toMatch(/10\.0\.0\.5|refused|SUPABASE/);
  });

  it("stöder HEAD", async () => {
    expect((await HEAD(request("3.3.3.3"))).status).toBe(200);
  });

  it("rate-limitar per IP utan att anropa databasen", async () => {
    for (let i = 0; i < 30; i++) await GET(request("4.4.4.4"));
    const callsBefore = state.calls;
    const res = await GET(request("4.4.4.4"));
    expect(res.status).toBe(429);
    expect(state.calls).toBe(callsBefore);
  });
});
