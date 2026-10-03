export const BOOKING_CONFIG = {
  slotStepMinutes: 15,
  minNoticeMinutes: 120,
  maxDaysAhead: 30,
  /** Senaste tid före starten som kunden själv får avboka online. */
  cancelDeadlineMinutes: 120,
  /** Påminnelse skickas när starten ligger inom så här många timmar. */
  reminderLeadHours: 24,
} as const;
