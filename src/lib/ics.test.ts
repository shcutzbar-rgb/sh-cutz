import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

const base = {
  uid: "abc@sh-cutz",
  start: "2026-10-12T08:00:00.000Z",
  end: "2026-10-12T08:30:00.000Z",
  summary: "Fade hos SH-Cutz",
  now: new Date("2026-10-04T10:00:00.000Z"),
};

describe("buildIcs", () => {
  it("skriver tider i UTC och använder CRLF", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART:20261012T080000Z");
    expect(ics).toContain("DTEND:20261012T083000Z");
    expect(ics).toContain("DTSTAMP:20261004T100000Z");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("escapar kommatecken, semikolon, backslash och radbrytningar", () => {
    const ics = buildIcs({ ...base, location: "Folkungagatan 87, Södermalm; Stockholm", description: "a\\b\nc" });
    expect(ics).toContain("LOCATION:Folkungagatan 87\\, Södermalm\\; Stockholm");
    expect(ics).toContain("DESCRIPTION:a\\\\b\\nc");
  });

  it("utelämnar valfria fält och viker långa rader", () => {
    expect(buildIcs(base)).not.toContain("LOCATION");
    const long = buildIcs({ ...base, description: "x".repeat(200) });
    for (const line of long.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"x".repeat(200)}`);
  });
});
