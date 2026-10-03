const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifierar Turnstile-token mot Cloudflare. Utan TURNSTILE_SECRET_KEY hoppas kontrollen över i
 * utveckling men blockerar allt i produktion, så att en missad konfiguration inte öppnar formulären.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY saknas: formulär blockeras tills bot-skyddet är konfigurerat.");
      return false;
    }
    return true;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile-verifiering misslyckades:", err);
    return false;
  }
}

export const CAPTCHA_ERROR = "Verifieringen misslyckades. Ladda om sidan och försök igen.";
