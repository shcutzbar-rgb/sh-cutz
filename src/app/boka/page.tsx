import type { Metadata } from "next";
import { BookingFlow } from "@/components/BookingFlow";
import { BOOKING_CONFIG } from "@/lib/booking-config";
import { addDays, todayIn } from "@/lib/datetime";
import { getActiveBarbers } from "@/lib/barbers";
import { getActiveServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Boka tid",
  description: "Boka tid hos SH-Cutz på Södermalm. Välj tjänst, frisör och tid direkt online.",
  alternates: { canonical: "/boka" },
};

// Datumgränserna beräknas per anrop och får inte prerenderas.
export const dynamic = "force-dynamic";

export default async function BokaPage() {
  const [services, barbers] = await Promise.all([getActiveServices(), getActiveBarbers()]);
  const today = todayIn(siteConfig.timezone);

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Boka tid</h1>
      <div className="mt-6">
        <BookingFlow
          services={services}
          barbers={barbers}
          timezone={siteConfig.timezone}
          minDate={today}
          maxDate={addDays(today, BOOKING_CONFIG.maxDaysAhead)}
        />
      </div>
    </section>
  );
}
