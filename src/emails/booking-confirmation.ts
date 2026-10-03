import { siteConfig } from "@/lib/site";
import { cancelDeadlineHours, detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingConfirmation(booking: EmailBooking, cancelUrl: string): RenderedEmail {
  const policy = `Du kan avboka fram till ${cancelDeadlineHours} timmar före din tid via länken nedan. Därefter, ring ${siteConfig.phone}.`;

  const text = `Hej ${booking.customerName}!

Din tid hos ${siteConfig.name} är bokad.

${detailsText(booking)}

${policy}
Avboka: ${cancelUrl}

${footerText()}`;

  const html = layoutHtml(
    "Din tid är bokad",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Din tid hos ${escapeHtml(siteConfig.name)} är bokad.</p>
${detailsHtml(booking)}
<p>${escapeHtml(policy)}</p>
<p><a href="${escapeHtml(cancelUrl)}" style="display:inline-block;padding:10px 18px;background:#171717;color:#ffffff;text-decoration:none;border-radius:6px">Avboka tid</a></p>`,
  );

  return { subject: `Bokningsbekräftelse – ${siteConfig.name}`, text, html };
}
