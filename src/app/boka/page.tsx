import { BookingFlow } from "@/components/BookingFlow";
import { SectionHeading } from "@/components/SectionHeading";
import { BOOKING_CONFIG } from "@/lib/booking-config";
import { addDays, todayIn } from "@/lib/datetime";
import { getActiveBarbers } from "@/lib/barbers";
import { pageMetadata } from "@/lib/seo";
import { getActiveServices } from "@/lib/services";
import { getShopSettings } from "@/lib/shop-settings";
import { siteConfig } from "@/lib/site";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const metadata = pageMetadata({
  title: "Boka tid",
  description: "Boka tid hos SH-Cutz på Södermalm. Välj tjänst, frisör och tid direkt online.",
  path: "/boka",
});

// Datumgränserna beräknas per anrop och får inte prerenderas.
export const dynamic = "force-dynamic";

export default async function BokaPage() {
  const [services, barbers, shop] = await Promise.all([getActiveServices(), getActiveBarbers(), getShopSettings()]);
  const today = todayIn(siteConfig.timezone);
  const address = `${shop.addressLine}, ${siteConfig.address.area}, ${shop.city}`;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <SectionHeading eyebrow="Onlinebokning" as="h1">
        Boka din tid
      </SectionHeading>
      {shop.cancellationPolicy && (
        <p className="mt-4 max-w-2xl whitespace-pre-line text-sm text-foreground/70">{shop.cancellationPolicy}</p>
      )}
      <div className="mt-10">
        <BookingFlow
          services={services}
          barbers={barbers}
          timezone={siteConfig.timezone}
          minDate={today}
          maxDate={addDays(today, BOOKING_CONFIG.maxDaysAhead)}
          address={address}
          turnstileSiteKey={getTurnstileSiteKey()}
        />
      </div>
    </section>
  );
}
