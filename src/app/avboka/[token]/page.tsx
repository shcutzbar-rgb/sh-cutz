import type { Metadata } from "next";
import Link from "next/link";
import { CancelBooking } from "@/components/CancelBooking";
import { BOOKING_CONFIG } from "@/lib/booking-config";
import { evaluateCancellation } from "@/lib/booking-rules";
import { formatDateLongIn, formatTimeIn } from "@/lib/datetime";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { getTurnstileSiteKey } from "@/lib/turnstile";
import { findBookingByToken, type BookingByToken } from "@/server/cancellation";
import { BookingError } from "@/server/errors";

export const metadata: Metadata = {
  title: "Avboka tid",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Token i URL:en: sidan får aldrig cachas eller prerenderas.
export const dynamic = "force-dynamic";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="display text-4xl sm:text-5xl">{title}</h1>
      <div className="mt-4 leading-relaxed text-foreground/70">{children}</div>
      <Link href="/boka" className="btn btn-primary mt-8">
        Boka ny tid
      </Link>
    </section>
  );
}

function Summary({ booking }: { booking: BookingByToken }) {
  const tz = siteConfig.timezone;
  const rows: [string, string][] = [
    ["Tjänst", booking.serviceName],
    ["Frisör", booking.barberName],
    ["Datum", formatDateLongIn(booking.startAt, tz)],
    ["Tid", `${formatTimeIn(booking.startAt, tz)}–${formatTimeIn(booking.endAt, tz)}`],
    ["Pris", formatPrice(booking.priceSek)],
  ];
  return (
    <dl className="card mt-6 divide-y divide-line text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 p-4">
          <dt className="text-foreground/65">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AvbokaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let booking: BookingByToken | null;
  try {
    booking = await findBookingByToken(token);
  } catch (err) {
    if (err instanceof BookingError) {
      return <Notice title="Avbokning är tillfälligt otillgänglig">Försök igen om en stund eller ring {siteConfig.phone}.</Notice>;
    }
    throw err;
  }

  // Okänd token, redan avbokad eller passerad: samma svar så att inget läcker.
  const state = booking ? evaluateCancellation(booking.status, booking.startAt, new Date()) : "unavailable";
  if (!booking || state === "unavailable") {
    return (
      <Notice title="Länken kan inte användas">
        Länken är ogiltig eller har redan använts. Behöver du hjälp, ring {siteConfig.phone}.
      </Notice>
    );
  }

  if (state === "too_late") {
    return (
      <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
        <h1 className="display text-4xl sm:text-5xl">Det är för sent att avboka online</h1>
        <p className="mt-4 text-foreground/70">
          Online-avbokning är möjlig senast {BOOKING_CONFIG.cancelDeadlineMinutes / 60} timmar före din tid. Ring oss på{" "}
          <a href={siteConfig.phoneHref} className="text-accent underline underline-offset-4">
            {siteConfig.phone}
          </a>
          .
        </p>
        <Summary booking={booking} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <h1 className="display text-4xl sm:text-5xl">Avboka tid</h1>
      <p className="mt-2 text-foreground/70">Kontrollera att det är rätt tid och bekräfta avbokningen.</p>
      <Summary booking={booking} />
      <CancelBooking token={token} phone={siteConfig.phone} turnstileSiteKey={getTurnstileSiteKey()} />
    </section>
  );
}
