import { siteConfig } from "@/lib/site";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingCancelled(booking: EmailBooking): RenderedEmail {
  const note = `Vill du boka en ny tid? Gå till ${siteConfig.url}/boka eller ring ${siteConfig.phone}.`;

  const text = `Hej ${booking.customerName}!

Din tid hos ${siteConfig.name} är avbokad.

${detailsText(booking)}

${note}

${footerText()}`;

  const html = layoutHtml(
    "Din tid är avbokad",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Din tid hos ${escapeHtml(siteConfig.name)} är avbokad.</p>
${detailsHtml(booking)}
<p>${escapeHtml(note)}</p>`,
  );

  return { subject: `Avbokning bekräftad – ${siteConfig.name}`, text, html };
}
