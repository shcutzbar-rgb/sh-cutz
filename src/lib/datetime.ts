import { TZDate } from "@date-fns/tz";

/** Datum som "YYYY-MM-DD" i butikens tidszon. */
export function isValidDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Tidpunkten "HH:mm" (eller "HH:mm:ss") på ett datum i given tidszon, som absolut Date. */
export function zonedTime(date: string, time: string, timezone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, ss, timezone).getTime());
}

/** 0 = söndag ... 6 = lördag för datumet i given tidszon. */
export function weekdayOf(date: string, timezone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new TZDate(y, m - 1, d, 12, 0, 0, timezone).getDay();
}

/** [start, end) för hela dygnet i given tidszon. */
export function dayRange(date: string, timezone: string): { start: Date; end: Date } {
  return {
    start: zonedTime(date, "00:00", timezone),
    end: zonedTime(addDays(date, 1), "00:00", timezone),
  };
}

export function todayIn(timezone: string, now: Date = new Date()): string {
  return dateIn(timezone, now);
}

/** Kalenderdatum "YYYY-MM-DD" för en tidpunkt i given tidszon. */
export function dateIn(timezone: string, value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatTimeIn(value: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function formatDateLongIn(value: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
