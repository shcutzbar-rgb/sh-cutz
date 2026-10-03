import { Resend } from "resend";
import type { RenderedEmail } from "@/emails/shared";

/** Skickar e-post via Resend. Kastar aldrig: returnerar false vid fel eller saknad konfiguration. */
export async function sendEmail(to: string, mail: RenderedEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("E-post hoppades över: RESEND_API_KEY eller EMAIL_FROM saknas.");
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (error) {
      console.error("Resend avvisade e-post:", error.name, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Kunde inte skicka e-post:", err);
    return false;
  }
}
