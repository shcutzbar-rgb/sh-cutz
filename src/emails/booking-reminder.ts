import { siteConfig } from "@/lib/site";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingReminder(booking: EmailBooking): RenderedEmail {
  const shopName = booking.shopName || siteConfig.name;
  const note = `Behöver du avboka? Använd länken i din bokningsbekräftelse eller ring ${booking.shopPhone || siteConfig.phone}.`;

  const text = `Hej ${booking.customerName}!

Påminnelse om din tid hos ${shopName}.

${detailsText(booking)}

${note}

${footerText(booking)}`;

  const html = layoutHtml(
    "Påminnelse om din tid",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Påminnelse om din tid hos ${escapeHtml(shopName)}.</p>
${detailsHtml(booking)}
<p>${escapeHtml(note)}</p>`,
    booking,
  );

  return { subject: `Påminnelse: din tid hos ${shopName}`, text, html };
}
