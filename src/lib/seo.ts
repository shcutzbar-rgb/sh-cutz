import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  /** Använd titeln som den är, utan " | SH-Cutz"-suffix. */
  absoluteTitle?: boolean;
};

const OG_ALT = `${siteConfig.name}, barbershop på Södermalm i Stockholm`;

/** Title, description, canonical samt Open Graph och Twitter för en publik sida. */
export function pageMetadata({ title, description, path, absoluteTitle }: PageMeta): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${siteConfig.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    // Bilderna anges här eftersom sidans openGraph ersätter filkonventionens bilder.
    openGraph: {
      type: "website",
      locale: "sv_SE",
      siteName: siteConfig.name,
      url: path,
      title: fullTitle,
      description,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [{ url: "/twitter-image.png", alt: OG_ALT }],
    },
  };
}

/** Sidor som visas i sitemap.xml. */
export const publicPaths = ["/", "/boka", "/tjanster", "/frisorer", "/galleri", "/kontakt", "/integritet"] as const;
