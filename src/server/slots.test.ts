import { describe, expect, it } from "vitest";
import { addDays, dayRange, isValidDateString, todayIn, weekdayOf, zonedTime } from "@/lib/datetime";
import { computeSlots, type ComputeSlotsInput } from "./slots";

const TZ = "Europe/Stockholm";

function at(date: string, time: string) {
  return zonedTime(date, time, TZ);
}

function base(overrides: Partial<ComputeSlotsInput> = {}): ComputeSlotsInput {
  return {
    date: "2026-10-12", // måndag, CEST (UTC+2)
    timezone: TZ,
    durationMinutes: 30,
    stepMinutes: 15,
    workingWindows: [{ startTime: "10:00", endTime: "12:00" }],
    busy: [],
    now: at("2026-10-01", "09:00"),
    minNoticeMinutes: 120,
    ...overrides,
  };
}

const iso = (slots: Date[]) => slots.map((s) => s.toISOString());

describe("computeSlots", () => {
  it("ger 15-minuterssteg som får plats inom arbetstiden", () => {
    const slots = computeSlots(base());
    expect(slots).toHaveLength(7); // 10:00 ... 11:30
    expect(iso(slots)[0]).toBe("2026-10-12T08:00:00.000Z"); // 10:00 CEST
    expect(iso(slots).at(-1)).toBe("2026-10-12T09:30:00.000Z"); // 11:30 CEST
  });

  it("tar hänsyn till tjänstens längd", () => {
    expect(computeSlots(base({ durationMinutes: 15 }))).toHaveLength(8);
    expect(computeSlots(base({ durationMinutes: 120 }))).toHaveLength(1);
    expect(computeSlots(base({ durationMinutes: 135 }))).toHaveLength(0);
  });

  it("använder vintertid (UTC+1) efter sommartidens slut", () => {
    const slots = computeSlots(base({ date: "2026-10-26", now: at("2026-10-01", "09:00") }));
    expect(iso(slots)[0]).toBe("2026-10-26T09:00:00.000Z");
  });

  it("blockerar slots som överlappar en bokning", () => {
    const busy = [{ start: at("2026-10-12", "10:30"), end: at("2026-10-12", "11:00") }];
    const times = iso(computeSlots(base({ busy })));
    // 10:15 (slutar 10:45) och 10:30 krockar; 10:00 slutar exakt när bokningen börjar
    expect(times).toContain(at("2026-10-12", "10:00").toISOString());
    expect(times).not.toContain(at("2026-10-12", "10:15").toISOString());
    expect(times).not.toContain(at("2026-10-12", "10:30").toISOString());
    expect(times).not.toContain(at("2026-10-12", "10:45").toISOString());
    expect(times).toContain(at("2026-10-12", "11:00").toISOString());
  });

  it("blockerar slots som överlappar frånvaro", () => {
    const busy = [{ start: at("2026-10-12", "09:00"), end: at("2026-10-12", "11:00") }];
    const slots = computeSlots(base({ busy }));
    expect(iso(slots)[0]).toBe(at("2026-10-12", "11:00").toISOString());
    expect(slots).toHaveLength(3);
  });

  it("döljer tider närmare än minsta framförhållning", () => {
    const now = at("2026-10-12", "08:30");
    const slots = computeSlots(base({ now }));
    // tidigast 10:30
    expect(iso(slots)[0]).toBe(at("2026-10-12", "10:30").toISOString());
  });

  it("tillåter en slot exakt på framförhållningsgränsen", () => {
    const now = at("2026-10-12", "08:00");
    expect(iso(computeSlots(base({ now })))[0]).toBe(at("2026-10-12", "10:00").toISOString());
  });

  it("ger inga slots för datum i det förflutna", () => {
    expect(computeSlots(base({ now: at("2026-10-13", "09:00") }))).toHaveLength(0);
  });

  it("returnerar tomt utan arbetstid (t.ex. ledig dag)", () => {
    expect(computeSlots(base({ workingWindows: [] }))).toEqual([]);
  });

  it("hanterar flera arbetspass och tar bort dubbletter", () => {
    const slots = computeSlots(
      base({
        workingWindows: [
          { startTime: "10:00", endTime: "11:00" },
          { startTime: "10:30", endTime: "12:00" },
        ],
        durationMinutes: 30,
      }),
    );
    const unique = new Set(iso(slots));
    expect(unique.size).toBe(slots.length);
    expect(iso(slots)).toEqual([...iso(slots)].sort());
  });
});

describe("datetime", () => {
  it("validerar datumsträngar", () => {
    expect(isValidDateString("2026-10-12")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("12/10/2026")).toBe(false);
  });

  it("beräknar veckodag i tidszonen", () => {
    expect(weekdayOf("2026-10-12", TZ)).toBe(1);
    expect(weekdayOf("2026-10-11", TZ)).toBe(0);
  });

  it("räknar dygnsgränser korrekt över sommartidsbyte", () => {
    const { start, end } = dayRange("2026-10-25", TZ); // klockan går bakåt: 25 timmar
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("ger dagens datum i tidszonen, inte UTC", () => {
    const now = new Date("2026-10-12T22:30:00Z"); // 00:30 nästa dag i Stockholm
    expect(todayIn(TZ, now)).toBe("2026-10-13");
  });
});
