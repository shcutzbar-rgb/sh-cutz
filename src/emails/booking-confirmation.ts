import { siteConfig } from "@/lib/site";
import { cancelDeadlineHours } from "./shared";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export function renderBookingConfirmation(booking: EmailBooking, cancelUrl: string): RenderedEmail {
  const shopName = booking.shopName || siteConfig.name;
  const phone = booking.shopPhone || siteConfig.phone;
  const cancellationText = `Du kan avboka fram till ${cancelDeadlineHours} timmar före din tid. Efter det, ring ${phone}.`;

  const text = `Hej ${booking.customerName}!

Din tid hos ${shopName} är bokad.

${detailsText(booking)}

${cancellationText}
Avboka din tid: ${cancelUrl}

${footerText(booking)}`;

  const html = layoutHtml(
    "Din tid är bokad",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Din tid hos ${escapeHtml(shopName)} är bokad.</p>
${detailsHtml(booking)}
<p>${escapeHtml(cancellationText)}</p>
<p><a href="${escapeHtml(cancelUrl)}" style="display:inline-block;padding:12px 20px;background:#252b24;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600">Avboka tid</a></p>
<p style="font-size:12px;color:#666">Fungerar inte knappen? Öppna länken:<br><a href="${escapeHtml(cancelUrl)}">${escapeHtml(cancelUrl)}</a></p>`,
    booking,
  );

  return { subject: `Bokningsbekräftelse – ${shopName}`, text, html };
}
