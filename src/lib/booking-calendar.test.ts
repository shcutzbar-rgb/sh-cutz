import { describe, expect, it } from "vitest";
import { buildMonthGrid, shiftMonth } from "./booking-calendar";

describe("booking calendar", () => {
  it("builds a Monday-first grid with complete weeks", () => {
    const days = buildMonthGrid("2026-10");
    expect(days).toHaveLength(35);
    expect(days.slice(0, 3)).toEqual([null, null, null]);
    expect(days[3]).toBe("2026-10-01"); // Thursday
    expect(days.at(-1)).toBeNull();
    expect(days.filter(Boolean)).toHaveLength(31);
  });

  it("handles leap February and months starting Sunday", () => {
    const leap = buildMonthGrid("2028-02");
    expect(leap.filter(Boolean)).toHaveLength(29);
    expect(leap[0]).toBeNull(); // February 1, 2028 is Tuesday
    const november = buildMonthGrid("2026-11");
    expect(november.slice(0, 6)).toEqual([null, null, null, null, null, null]); // starts Sunday
  });

  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});