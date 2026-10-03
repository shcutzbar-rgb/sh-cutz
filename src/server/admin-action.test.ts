import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/supabase-server", () => ({ createSessionClient: async () => ({}) }));

import { computeStats } from "@/lib/booking-rules";
import { done, fail, safeAdminPath } from "./admin-action";

describe("safeAdminPath", () => {
  it("släpper igenom interna adminsökvägar", () => {
    expect(safeAdminPath("/admin/bokningar", "/admin")).toBe("/admin/bokningar");
    expect(safeAdminPath("/admin/bokningar?status=confirmed&q=anna", "/admin")).toBe(
      "/admin/bokningar?status=confirmed&q=anna",
    );
    expect(safeAdminPath("/admin", "/x")).toBe("/admin");
  });

  it("faller tillbaka för externa och manipulerade värden", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/admin//evil.example",
      "/administrator",
      "/admin/../etc",
      "/admin\\evil",
      "javascript:alert(1)",
      "/boka",
      "",
      undefined,
      42,
    ]) {
      expect(safeAdminPath(bad, "/admin/bokningar")).toBe("/admin/bokningar");
    }
  });
});

describe("done/fail", () => {
  it("lägger meddelandet som kodad query-parameter", () => {
    expect(() => done("/admin/tjanster", "Sparat & klart")).toThrow("REDIRECT:/admin/tjanster?ok=Sparat%20%26%20klart");
    expect(() => fail("/admin/bokningar?status=x", "Fel")).toThrow("REDIRECT:/admin/bokningar?status=x&error=Fel");
  });
});

describe("computeStats", () => {
  it("räknar status och andelar", () => {
    const s = computeStats(["completed", "completed", "completed", "no_show", "cancelled", "confirmed"]);
    expect(s).toMatchObject({ total: 6, completed: 3, noShow: 1, cancelled: 1 });
    expect(s.noShowRate).toBeCloseTo(0.25);
    expect(s.cancelRate).toBeCloseTo(1 / 6);
  });

  it("ger null utan underlag", () => {
    expect(computeStats([])).toMatchObject({ total: 0, noShowRate: null, cancelRate: null });
    expect(computeStats(["confirmed"]).noShowRate).toBeNull();
  });
});
