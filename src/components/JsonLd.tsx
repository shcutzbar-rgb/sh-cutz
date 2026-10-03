import { weekdayNamesSchema } from "@/lib/hours";
import type { ShopSettings } from "@/lib/shop-settings";
import { siteConfig } from "@/lib/site";
import type { OpeningHours, Service } from "@/types/shop";

export function buildHairSalonJsonLd(services: Service[], openingHours: OpeningHours[], shop: ShopSettings) {
  const prices = services.map((s) => s.priceSek);

  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: shop.shopName,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: shop.phoneHref.replace("tel:", ""),
    priceRange: `${Math.min(...prices)}-${Math.max(...prices)} SEK`,
    address: {
      "@type": "PostalAddress",
      streetAddress: shop.addressLine,
      addressLocality: shop.city,
      ...(shop.postalCode ? { postalCode: shop.postalCode } : {}),
      addressCountry: "SE",
    },
    openingHoursSpecification: openingHours
      .filter((h) => h.opens && h.closes)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: weekdayNamesSchema[h.weekday],
        opens: h.opens,
        closes: h.closes,
      })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  // Escapa "<" så att data aldrig kan avsluta script-taggen.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
