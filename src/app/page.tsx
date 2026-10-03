import Link from "next/link";
import { JsonLd, buildHairSalonJsonLd } from "@/components/JsonLd";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { ServiceList } from "@/components/ServiceList";
import { getActiveServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "SH-Cutz – Barberare på Södermalm, Stockholm" },
  description:
    "Boka fade och skäggtrim hos SH-Cutz, barbershop på Folkungagatan 87 på Södermalm i Stockholm. Tydliga priser och enkel onlinebokning.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

export default async function Home() {
  const services = await getActiveServices();
  const featured = services.slice(0, 3);

  return (
    <>
      <JsonLd data={buildHairSalonJsonLd(services)} />

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <p className="text-sm uppercase tracking-widest text-accent">Södermalm, Stockholm</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Barberare på Södermalm
        </h1>
        <p className="mt-4 text-foreground/70">
          Precisa fades och välformade skägg hos {siteConfig.name}. Boka din tid online på någon minut.
        </p>
        <Link
          href="/boka"
          className="mt-8 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
        >
          Boka tid
        </Link>
      </section>

      <section aria-labelledby="services-heading" className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 id="services-heading" className="text-2xl font-bold tracking-tight">
            Tjänster
          </h2>
          <Link href="/tjanster" className="text-sm text-accent underline underline-offset-4">
            Se alla tjänster
          </Link>
        </div>
        <div className="mt-6">
          <ServiceList items={featured} />
        </div>
      </section>

      <section aria-labelledby="hours-heading" className="mx-auto max-w-3xl px-4 py-12">
        <h2 id="hours-heading" className="text-2xl font-bold tracking-tight">
          Öppettider
        </h2>
        <div className="mt-6 max-w-sm">
          <OpeningHoursTable />
        </div>
      </section>

      <section aria-labelledby="about-heading" className="mx-auto max-w-3xl px-4 py-12">
        <h2 id="about-heading" className="text-2xl font-bold tracking-tight">
          Din barbershop på Södermalm
        </h2>
        <p className="mt-4 text-foreground/70">
          Letar du efter en barberare på Södermalm? SH-Cutz ligger på {siteConfig.address.street} och
          erbjuder fade, skäggtrimning och kombinationen fade &amp; skägg. Oavsett om du vill ha en
          skarp fade i Stockholm eller bara få skägget i form är du välkommen in. Se våra{" "}
          <Link href="/tjanster" className="text-accent underline underline-offset-4">
            priser
          </Link>{" "}
          eller hitta hit via{" "}
          <Link href="/kontakt" className="text-accent underline underline-offset-4">
            kontaktsidan
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Redo för en ny look?</h2>
        <Link
          href="/boka"
          className="mt-6 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
        >
          Boka tid
        </Link>
      </section>
    </>
  );
}
