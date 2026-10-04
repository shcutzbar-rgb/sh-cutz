import { formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { siteConfig } from "@/lib/site";
import { detailsHtml, detailsText, escapeHtml, footerText, layoutHtml, type EmailBooking, type RenderedEmail } from "./shared";

export type PreviousSlot = { startAt: string; endAt: string; barberName: string };

function previousLine(previous: PreviousSlot): string {
  const tz = siteConfig.timezone;
  return `${formatDateLongIn(previous.startAt, tz)}, ${formatTimeIn(previous.startAt, tz)}–${formatTimeIn(previous.endAt, tz)} hos ${previous.barberName}`;
}

/** Mejl till kunden när admin flyttat en bokning. `booking` är den nya tiden. */
export function renderBookingMoved(booking: EmailBooking, previous: PreviousSlot): RenderedEmail {
  const before = `Tidigare tid: ${previousLine(previous)}`;
  const note = `Passar inte den nya tiden? Ring ${siteConfig.phone} eller boka en ny tid på ${siteConfig.url}/boka.`;

  const text = `Hej ${booking.customerName}!

Din tid hos ${siteConfig.name} har flyttats. Detta är din nya tid:

${detailsText(booking)}

${before}

${note}

${footerText()}`;

  const html = layoutHtml(
    "Din tid har flyttats",
    `<p>Hej ${escapeHtml(booking.customerName)}!</p>
<p>Din tid hos ${escapeHtml(siteConfig.name)} har flyttats. Detta är din nya tid:</p>
${detailsHtml(booking)}
<p style="color:#666">${escapeHtml(before)}</p>
<p>${escapeHtml(note)}</p>`,
  );

  return { subject: `Din tid har flyttats – ${siteConfig.name}`, text, html };
}
