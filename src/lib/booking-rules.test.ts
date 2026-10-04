import { describe, expect, it } from "vitest";
import { evaluateCancellation, isReminderDue, isValidCancelToken } from "./booking-rules";
import { generateCancelToken } from "@/server/tokens";

const start = new Date("2026-10-12T08:00:00Z");
const minutesBefore = (m: number) => new Date(start.getTime() - m * 60_000);

describe("evaluateCancellation", () => {
  it("tillåter avbokning före gränsen", () => {
    expect(evaluateCancellation("confirmed", start, minutesBefore(181))).toBe("ok");
    expect(evaluateCancellation("pending", start, minutesBefore(24 * 60))).toBe("ok");
  });

  it("tillåter avbokning exakt på gränsen (3 h)", () => {
    expect(evaluateCancellation("confirmed", start, minutesBefore(180))).toBe("ok");
  });

  it("nekar inom gränsen", () => {
    expect(evaluateCancellation("confirmed", start, minutesBefore(179))).toBe("too_late");
    expect(evaluateCancellation("confirmed", start, minutesBefore(1))).toBe("too_late");
  });

  it("behandlar passerade och inaktiva bokningar som otillgängliga", () => {
    expect(evaluateCancellation("confirmed", start, start)).toBe("unavailable");
    expect(evaluateCancellation("confirmed", start, minutesBefore(-30))).toBe("unavailable");
    for (const status of ["cancelled", "completed", "no_show"]) {
      expect(evaluateCancellation(status, start, minutesBefore(600))).toBe("unavailable");
    }
  });

  it("respekterar anpassad gräns", () => {
    expect(evaluateCancellation("confirmed", start, minutesBefore(250), 300)).toBe("too_late");
  });
});

describe("isValidCancelToken", () => {
  it("accepterar genererade tokens", () => {
    expect(isValidCancelToken(generateCancelToken())).toBe(true);
  });

  it("avvisar fel format", () => {
    expect(isValidCancelToken("kort")).toBe(false);
    expect(isValidCancelToken("a".repeat(44))).toBe(false);
    expect(isValidCancelToken(`${"a".repeat(42)}!`)).toBe(false);
    expect(isValidCancelToken(undefined)).toBe(false);
    expect(isValidCancelToken(123)).toBe(false);
  });
});

describe("isReminderDue", () => {
  const now = new Date("2026-10-11T08:30:00Z"); // 23,5 h före start
  const base = {
    status: "confirmed",
    startAt: start,
    createdAt: new Date("2026-10-05T10:00:00Z"),
    reminderSentAt: null,
    email: "anna@example.com",
  };

  it("påminner inom 24 h före start", () => {
    expect(isReminderDue(base, now)).toBe(true);
  });

  it("väntar tills fönstret öppnas", () => {
    expect(isReminderDue(base, new Date("2026-10-11T07:59:00Z"))).toBe(false);
    expect(isReminderDue(base, new Date("2026-10-11T08:00:00Z"))).toBe(true);
  });

  it("hoppar över redan påminda, utan e-post, avbokade och passerade", () => {
    expect(isReminderDue({ ...base, reminderSentAt: now }, now)).toBe(false);
    expect(isReminderDue({ ...base, email: null }, now)).toBe(false);
    expect(isReminderDue({ ...base, status: "cancelled" }, now)).toBe(false);
    expect(isReminderDue(base, new Date("2026-10-12T08:00:00Z"))).toBe(false);
  });

  it("hoppar över bokningar gjorda mindre än 24 h före start", () => {
    expect(isReminderDue({ ...base, createdAt: new Date("2026-10-11T20:00:00Z") }, now)).toBe(false);
  });
});
