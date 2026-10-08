import { BrevoClient } from "@getbrevo/brevo";
import { loadEnv } from "./launch-status.mjs";

loadEnv();

const recipientIndex = process.argv.indexOf("--to");
const positionalRecipient = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
const recipient = recipientIndex >= 0 ? process.argv[recipientIndex + 1] : positionalRecipient;
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  console.error("Ange en egen testmottagare: npm run email:test -- --to din-adress@example.com");
  process.exit(2);
}

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
if (!apiKey || !senderEmail) {
  console.error("BREVO_API_KEY eller BREVO_SENDER_EMAIL saknas i .env.local.");
  process.exit(2);
}

const senderName = process.env.BREVO_SENDER_NAME || "SH-Cutz";
try {
  const result = await new BrevoClient({ apiKey }).transactionalEmails.sendTransacEmail({
    sender: { name: senderName, email: senderEmail },
    to: [{ email: recipient }],
    subject: "SH-Cutz – test av e-post",
    textContent: "Det här är ett test av Brevo från SH-Cutz. Ingen bokning har skapats.",
    htmlContent: "<p>Det här är ett test av Brevo från <strong>SH-Cutz</strong>.</p><p>Ingen bokning har skapats.</p>",
  });
  console.log(`Brevo accepterade testmejlet till ${recipient}. Message ID: ${result.messageId ?? "mottaget"}`);
} catch (error) {
  console.error("Brevo kunde inte skicka testmejlet.");
  if (error && typeof error === "object" && "statusCode" in error) console.error(`HTTP-status: ${error.statusCode}`);
  if (error instanceof Error) console.error(error.message);
  process.exit(1);
}
