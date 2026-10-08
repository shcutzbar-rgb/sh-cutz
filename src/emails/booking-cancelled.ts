import { siteConfig } from "@/lib/site";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingCancelled(booking: EmailBooking): RenderedEmail {
  const shopName = booking.shopName || siteConfig.name;
  const bookingUrl = booking.bookingUrl || siteConfig.url;
  const note = `Vill du boka en ny tid? Gå till ${bookingUrl}/boka eller ring ${booking.shopPhone || siteConfig.phone}.`;

  const text = `Hej ${booking.customerName}!

Din tid hos ${shopName} är avbokad.

${detailsText(booking)}

${note}

${footerText(booking)}`;

  const html = layoutHtml(
    "Din tid är avbokad",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Din tid hos ${escapeHtml(shopName)} är avbokad.</p>
${detailsHtml(booking)}
<p>${escapeHtml(note)}</p>`,
    booking,
  );

  return { subject: `Avbokning bekräftad – ${shopName}`, text, html };
}
