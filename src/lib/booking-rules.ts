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

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Väntar",
  confirmed: "Bekräftad",
  cancelled: "Avbokad",
  completed: "Genomförd",
  no_show: "No-show",
};

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as string[]).includes(value);
}

/** Tillåtna statusbyten i admin. Genomförd och no-show kräver att tiden har startat. */
export function canChangeStatus(
  from: BookingStatus,
  to: BookingStatus,
  startAt: Date,
  now: Date,
): { ok: true } | { ok: false; error: string } {
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, error: `Bokningen kan inte ändras från "${STATUS_LABEL[from]}" till "${STATUS_LABEL[to]}".` };
  }
  if ((to === "completed" || to === "no_show") && startAt.getTime() > now.getTime()) {
    return { ok: false, error: "Kan bara markeras efter att tiden har startat." };
  }
  return { ok: true };
}

export function isMovable(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}
export type BookingStats = {
  total: number;
  completed: number;
  noShow: number;
  cancelled: number;
  /** no_show / (completed + no_show); null utan avslutade bokningar. */
  noShowRate: number | null;
  /** cancelled / total; null utan bokningar. */
  cancelRate: number | null;
};

export function computeStats(statuses: string[]): BookingStats {
  const count = (s: string) => statuses.filter((x) => x === s).length;
  const completed = count("completed");
  const noShow = count("no_show");
  const cancelled = count("cancelled");
  const finished = completed + noShow;
  return {
    total: statuses.length,
    completed,
    noShow,
    cancelled,
    noShowRate: finished > 0 ? noShow / finished : null,
    cancelRate: statuses.length > 0 ? cancelled / statuses.length : null,
  };
}