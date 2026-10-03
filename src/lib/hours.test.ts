import { describe, expect, it } from "vitest";
import { deriveOpeningHours } from "./hours";
import { toTelHref } from "./shop-settings";

describe("deriveOpeningHours", () => {
  const rows = [
    { weekday: 1, start_time: "10:00:00", end_time: "14:00:00" },
    { weekday: 1, start_time: "09:30:00", end_time: "19:00:00" },
    { weekday: 6, start_time: "10:00:00", end_time: "17:00:00" },
  ];

  it("tar tidigaste start och senaste slut per dag, måndag först", () => {
    const hours = deriveOpeningHours(rows);
    expect(hours.map((h) => h.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(hours[0]).toEqual({ weekday: 1, opens: "09:30", closes: "19:00" });
    expect(hours[5]).toEqual({ weekday: 6, opens: "10:00", closes: "17:00" });
  });

  it("markerar dagar utan arbetstid som stängda", () => {
    const hours = deriveOpeningHours(rows);
    expect(hours[1]).toEqual({ weekday: 2, opens: null, closes: null });
    expect(hours[6]).toEqual({ weekday: 0, opens: null, closes: null });
  });
});

describe("toTelHref", () => {
  it("normaliserar svenska nummer", () => {
    expect(toTelHref("072-192 68 49")).toBe("tel:+46721926849");
    expect(toTelHref("+46 72 192 68 49")).toBe("tel:+46721926849");
    expect(toTelHref("0046721926849")).toBe("tel:+46721926849");
  });
});
