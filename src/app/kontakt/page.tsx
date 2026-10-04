import Link from "next/link";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { PageHeader } from "@/components/PageHeader";
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
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <PageHeader eyebrow="Hitta hit" title="Kontakt" />

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="eyebrow">Adress</h2>
            <address className="mt-4 text-lg not-italic leading-relaxed text-foreground/85">
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
              className="btn btn-secondary btn-sm mt-5"
            >
              Öppna i Google Maps (ny flik)
            </a>
          </div>

          <div className="card p-6">
            <h2 className="eyebrow">Telefon</h2>
            <a href={shop.phoneHref} className="mt-4 inline-block font-display text-3xl tracking-wide text-accent hover:underline">
              {shop.phone}
            </a>
            {shop.email && (
              <p className="mt-2">
                <a href={`mailto:${shop.email}`} className="text-foreground/80 hover:text-accent">
                  {shop.email}
                </a>
              </p>
            )}
          </div>

          <div className="card px-6 py-6">
            <h2 className="eyebrow">Öppettider</h2>
            <div className="mt-3">
              <OpeningHoursTable hours={hours} />
            </div>
          </div>

          {shop.dropInText && (
            <div className="border-l-2 border-accent bg-surface p-6">
              <h2 className="display text-xl text-accent">Dröppen</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/85">{shop.dropInText}</p>
            </div>
          )}

          {shop.cancellationPolicy && (
            <div className="card p-6">
              <h2 className="eyebrow">Avbokning</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/70">{shop.cancellationPolicy}</p>
            </div>
          )}

          <Link href="/boka" className="btn btn-primary">
            Boka tid
          </Link>
        </div>

        <div className="aspect-square overflow-hidden rounded-sm border border-line md:sticky md:top-28 md:aspect-auto md:h-[36rem]">
          <iframe
            title={`Karta över ${shop.shopName}, ${shop.addressLine}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0 [filter:invert(0.9)_hue-rotate(180deg)_grayscale(0.4)]"
          />
        </div>
      </div>
    </section>
  );
}
