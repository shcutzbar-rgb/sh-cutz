/** Publik sajtnyckel för Turnstile, läst vid körning (inte inbakad vid bygge). */
export function getTurnstileSiteKey(): string | undefined {
  return process.env.TURNSTILE_SITE_KEY || undefined;
}
