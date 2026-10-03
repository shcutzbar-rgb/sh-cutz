import Link from "next/link";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { getOpeningHours } from "@/lib/hours";
import { pageMetadata } from "@/lib/seo";
import { getShopSettings } from "@/lib/shop-settings";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Kontakt",
  description: `Hitta till SH-Cutz på ${siteConfig.address.street}, ${siteConfig.address.area}. Ring ${siteConfig.phone} eller boka online.`,
  path: "/kontakt",
});

export const revalidate = 300;

export default async function KontaktPage() {
  const [shop, hours] = await Promise.all([getShopSettings(), getOpeningHours()]);
  const query = encodeURIComponent(`${shop.addressLine}, ${shop.city}`);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Kontakt</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div>
            <h2 className="font-semibold">Adress</h2>
            <address className="mt-2 not-italic text-foreground/70">
              {shop.shopName}
              <br />
              {shop.addressLine}
              <br />
              {siteConfig.address.area}, {shop.postalCode ? `${shop.postalCode} ` : ""}
              {shop.city}
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
            <a href={shop.phoneHref} className="mt-2 inline-block text-lg text-accent hover:underline">
              {shop.phone}
            </a>
            {shop.email && (
              <p className="mt-1">
                <a href={`mailto:${shop.email}`} className="text-accent hover:underline">
                  {shop.email}
                </a>
              </p>
            )}
          </div>

          <div>
            <h2 className="font-semibold">Öppettider</h2>
            <div className="mt-2">
              <OpeningHoursTable hours={hours} />
            </div>
          </div>

          {shop.cancellationPolicy && (
            <div>
              <h2 className="font-semibold">Avbokning</h2>
              <p className="mt-2 whitespace-pre-line text-foreground/70">{shop.cancellationPolicy}</p>
            </div>
          )}

          <Link
            href="/boka"
            className="inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
          >
            Boka tid
          </Link>
        </div>

        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 md:aspect-auto md:min-h-[420px]">
          <iframe
            title={`Karta över ${shop.shopName}, ${shop.addressLine}`}
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
