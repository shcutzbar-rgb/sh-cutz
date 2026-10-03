import { openingHours, weekdayNamesSchema } from "@/lib/hours";
import { getActiveServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export function buildHairSalonJsonLd() {
  const prices = getActiveServices().map((s) => s.priceSek);

  return {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phoneHref.replace("tel:", ""),
    priceRange: `${Math.min(...prices)}-${Math.max(...prices)} SEK`,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
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
