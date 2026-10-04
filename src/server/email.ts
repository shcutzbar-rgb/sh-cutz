import { BrevoClient } from "@getbrevo/brevo";
import type { RenderedEmail } from "@/emails/shared";

/** Skickar transaktionsmejl via Brevo. Returnerar false vid fel så att bokningen inte påverkas. */
export async function sendEmail(to: string, mail: RenderedEmail): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    console.warn("E-post hoppades över: BREVO_API_KEY eller BREVO_SENDER_EMAIL saknas.");
    return false;
  }

  const senderName = process.env.BREVO_SENDER_NAME || "SH-Cutz";
  try {
    const result = await new BrevoClient({ apiKey }).transactionalEmails.sendTransacEmail({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: mail.subject,
      textContent: mail.text,
      htmlContent: mail.html,
    });
    console.info("Brevo accepterade transaktionsmejl", { messageId: result.messageId ?? null });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "okänt fel";
    const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    console.error("Brevo kunde inte skicka e-post:", { statusCode, message });
    return false;
  }
}
