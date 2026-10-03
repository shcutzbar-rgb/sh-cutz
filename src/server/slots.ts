import { zonedTime } from "@/lib/datetime";

export type Interval = { start: Date; end: Date };
export type WorkingWindow = { startTime: string; endTime: string };

export type ComputeSlotsInput = {
  /** "YYYY-MM-DD" i butikens tidszon */
  date: string;
  timezone: string;
  durationMinutes: number;
  stepMinutes: number;
  workingWindows: WorkingWindow[];
  /** Upptagna intervall (time_off och pending/confirmed-bokningar). */
  busy: Interval[];
  now: Date;
  minNoticeMinutes: number;
};

const MINUTE_MS = 60_000;

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Lediga starttider (absoluta tidpunkter) för ett datum, sorterade stigande. */
export function computeSlots(input: ComputeSlotsInput): Date[] {
  const { date, timezone, durationMinutes, stepMinutes, workingWindows, busy, now, minNoticeMinutes } = input;
  const earliest = now.getTime() + minNoticeMinutes * MINUTE_MS;
  const starts = new Map<number, Date>();

  for (const window of workingWindows) {
    const windowStart = zonedTime(date, window.startTime, timezone).getTime();
    const windowEnd = zonedTime(date, window.endTime, timezone).getTime();

    for (let t = windowStart; t + durationMinutes * MINUTE_MS <= windowEnd; t += stepMinutes * MINUTE_MS) {
      if (t < earliest) continue;
      const slot: Interval = { start: new Date(t), end: new Date(t + durationMinutes * MINUTE_MS) };
      if (busy.some((b) => overlaps(slot, b))) continue;
      starts.set(t, slot.start);
    }
  }

  return [...starts.entries()].sort((a, b) => a[0] - b[0]).map(([, d]) => d);
}
