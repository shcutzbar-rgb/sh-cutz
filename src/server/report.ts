import * as Sentry from "@sentry/cloudflare";
import { scrubString } from "@/lib/sentry-scrub";

/** Rapporterar ett oväntat fel till Sentry (no-op utan SENTRY_DSN) och loggar det. */
export function reportError(error: unknown, context?: Record<string, string>): void {
  console.error(error instanceof Error ? scrubString(error.message) : error);
  try {
    Sentry.captureException(error, context ? { tags: context } : undefined);
  } catch {
    // Felrapportering får aldrig orsaka nya fel.
  }
}
