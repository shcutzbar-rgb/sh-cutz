import Link from "next/link";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Hitta till SH-Cutz på ${siteConfig.address.street}, ${siteConfig.address.area}. Ring ${siteConfig.phone} eller boka online.`,
  alternates: { canonical: "/kontakt" },
};

export default function KontaktPage() {
  const { address, phone, phoneHref } = siteConfig;
  const query = encodeURIComponent(`${address.street}, ${address.city}`);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Kontakt</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div>
            <h2 className="font-semibold">Adress</h2>
            <address className="mt-2 not-italic text-foreground/70">
              {siteConfig.name}
              <br />
              {address.street}
              <br />
              {address.area}, {address.city}
            </address>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${query}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-accent underline underline-offset-4"
            >
              Öppna i Google Maps (ny flik)
            </a>
          </div>

          <div>
            <h2 className="font-semibold">Telefon</h2>
            <a href={phoneHref} className="mt-2 inline-block text-lg text-accent hover:underline">
              {phone}
            </a>
          </div>

          <div>
            <h2 className="font-semibold">Öppettider</h2>
            <div className="mt-2">
              <OpeningHoursTable />
            </div>
          </div>

          <Link
            href="/boka"
            className="inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
          >
            Boka tid
          </Link>
        </div>

        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 md:aspect-auto md:min-h-[420px]">
          <iframe
            title={`Karta över ${siteConfig.name}, ${address.street}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}
