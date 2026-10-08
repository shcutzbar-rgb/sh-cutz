import { BOOKING_CONFIG } from "@/lib/booking-config";
import { formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export type EmailBooking = {
  customerName: string;
  serviceName: string;
  barberName: string;
  startAt: string;
  endAt: string;
  priceSek: number;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  bookingUrl?: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const cancelDeadlineHours = BOOKING_CONFIG.cancelDeadlineMinutes / 60;

export function detailRows(b: EmailBooking): [string, string][] {
  const tz = siteConfig.timezone;
  return [
    ["Tjänst", b.serviceName],
    ["Frisör", b.barberName],
    ["Datum", formatDateLongIn(b.startAt, tz)],
    ["Tid", `${formatTimeIn(b.startAt, tz)}–${formatTimeIn(b.endAt, tz)}`],
    ["Pris", formatPrice(b.priceSek)],
    ["Adress", b.shopAddress || `${siteConfig.address.street}, ${siteConfig.address.area}, ${siteConfig.address.city}`],
  ];
}

export function detailsText(b: EmailBooking): string {
  return detailRows(b)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

export function detailsHtml(b: EmailBooking): string {
  const rows = detailRows(b)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#666">${escapeHtml(label)}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");
  return `<table role="presentation" style="border-collapse:collapse;margin:16px 0">${rows}</table>`;
}

export function footerText(b?: EmailBooking): string {
  const name = b?.shopName || siteConfig.name;
  const address = b?.shopAddress || `${siteConfig.address.street}, ${siteConfig.address.city}`;
  const phone = b?.shopPhone || siteConfig.phone;
  return `${name}\n${address}\nTelefon: ${phone}`;
}

export function layoutHtml(heading: string, bodyHtml: string, booking?: EmailBooking): string {
  const name = booking?.shopName || siteConfig.name;
  const address = booking?.shopAddress || `${siteConfig.address.street}, ${siteConfig.address.city}`;
  const phone = booking?.shopPhone || siteConfig.phone;
  return `<!doctype html>
<html lang="sv">
<body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:24px;border-radius:8px">
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(heading)}</h1>
${bodyHtml}
<p style="margin:24px 0 0;font-size:13px;color:#666">${escapeHtml(name)}<br>${escapeHtml(address)}<br>Telefon: ${escapeHtml(phone)}</p>
</div>
</body>
</html>`;
}
