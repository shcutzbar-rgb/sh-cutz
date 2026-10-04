import { describe, expect, it } from "vitest";
import { renderBookingCancelled } from "./booking-cancelled";
import { renderBookingConfirmation } from "./booking-confirmation";
import { renderBookingMoved } from "./booking-moved";
import { renderBookingReminder } from "./booking-reminder";
import { escapeHtml, type EmailBooking } from "./shared";

const booking: EmailBooking = {
  customerName: "Anna Svensson",
  serviceName: "Fade & Skägg",
  barberName: "Shabir",
  startAt: "2026-10-12T08:00:00.000Z", // 10:00 CEST
  endAt: "2026-10-12T08:30:00.000Z",
  priceSek: 400,
};
const cancelUrl = "https://example.com/avboka/abc_DEF-123";

describe("e-postmallar", () => {
  it("bekräftelsen innehåller detaljer och avbokningslänk i text och HTML", () => {
    const mail = renderBookingConfirmation(booking, cancelUrl);
    expect(mail.text).toContain("Fade & Skägg");
    expect(mail.html).toContain("Fade &amp; Skägg");
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain("Shabir");
      expect(body).toContain("10:00–10:30");
      expect(body).toContain("400 kr");
      expect(body).toContain(cancelUrl);
    }
    expect(mail.subject).toMatch(/bekräftelse/i);
  });

  it("påminnelsen och avbokningsmailet saknar avbokningslänk men har detaljer", () => {
    for (const mail of [renderBookingReminder(booking), renderBookingCancelled(booking)]) {
      expect(mail.text).toContain("10:00–10:30");
      expect(mail.html).toContain("10:00–10:30");
      expect(mail.text).not.toContain("/avboka/");
      expect(mail.html).not.toContain("/avboka/");
    }
    expect(renderBookingReminder(booking).subject).toMatch(/påminnelse/i);
    expect(renderBookingCancelled(booking).subject).toMatch(/avbokning/i);
  });

  it("flyttmejlet visar ny tid, tidigare tid och saknar avbokningslänk", () => {
    const previous = { startAt: "2026-10-10T07:00:00.000Z", endAt: "2026-10-10T07:30:00.000Z", barberName: "Ali" };
    const mail = renderBookingMoved(booking, previous);
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain("10:00–10:30"); // ny tid
      expect(body).toContain("09:00–09:30"); // tidigare tid (CEST)
      expect(body).toContain("hos Ali");
      expect(body).toContain("Shabir");
      expect(body).not.toContain("/avboka/");
    }
    expect(mail.subject).toMatch(/flyttats/i);
  });

  it("flyttmejlet escapar namn i HTML", () => {
    const previous = { startAt: booking.startAt, endAt: booking.endAt, barberName: "<b>Ali</b>" };
    const mail = renderBookingMoved({ ...booking, customerName: "<i>A</i>" }, previous);
    expect(mail.html).not.toContain("<i>A</i>");
    expect(mail.html).not.toContain("<b>Ali</b>");
    expect(mail.html).toContain("&lt;b&gt;Ali&lt;/b&gt;");
  });

  it("escapar kundinmatning i HTML men inte i text", () => {
    const evil = { ...booking, customerName: `<script>alert("x")</script> & Co` };
    const mail = renderBookingConfirmation(evil, `https://example.com/?a="1"&b=2`);
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&quot;1&quot;");
    expect(mail.text).toContain(`<script>alert("x")</script> & Co`);
  });

  it("escapeHtml hanterar alla specialtecken", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
