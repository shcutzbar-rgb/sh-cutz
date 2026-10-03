import { BOOKING_CONFIG } from "@/lib/booking-config";

const ACTIVE_STATUSES = ["pending", "confirmed"];
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

// 32 slumpbytes som base64url, se server/tokens.ts.
export function isValidCancelToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export type CancellationState = "ok" | "too_late" | "unavailable";

export function evaluateCancellation(
  status: string,
  startAt: Date,
  now: Date,
  deadlineMinutes: number = BOOKING_CONFIG.cancelDeadlineMinutes,
): CancellationState {
  if (!ACTIVE_STATUSES.includes(status)) return "unavailable";
  if (startAt.getTime() <= now.getTime()) return "unavailable";
  if (startAt.getTime() - now.getTime() < deadlineMinutes * MINUTE_MS) return "too_late";
  return "ok";
}

export type ReminderCandidate = {
  status: string;
  startAt: Date;
  createdAt: Date;
  reminderSentAt: Date | null;
  email: string | null;
};

/** Påminn bara om bokningen gjordes i god tid; annars är bekräftelsen färsk nog. */
export function isReminderDue(
  b: ReminderCandidate,
  now: Date,
  leadHours: number = BOOKING_CONFIG.reminderLeadHours,
): boolean {
  if (!b.email || b.reminderSentAt) return false;
  if (!ACTIVE_STATUSES.includes(b.status)) return false;
  const start = b.startAt.getTime();
  if (start <= now.getTime()) return false;
  if (start - now.getTime() > leadHours * HOUR_MS) return false;
  return b.createdAt.getTime() <= start - leadHours * HOUR_MS;
}
