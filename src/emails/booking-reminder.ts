import { siteConfig } from "@/lib/site";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingReminder(booking: EmailBooking): RenderedEmail {
  const note = `Behöver du avboka? Använd länken i din bokningsbekräftelse eller ring ${siteConfig.phone}.`;

  const text = `Hej ${booking.customerName}!

Påminnelse om din tid hos ${siteConfig.name}.

${detailsText(booking)}

${note}

${footerText()}`;

  const html = layoutHtml(
    "Påminnelse om din tid",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Påminnelse om din tid hos ${escapeHtml(siteConfig.name)}.</p>
${detailsHtml(booking)}
<p>${escapeHtml(note)}</p>`,
  );

  return { subject: `Påminnelse: din tid hos ${siteConfig.name}`, text, html };
}
