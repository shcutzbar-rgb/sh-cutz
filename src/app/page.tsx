import Image from "next/image";
import Link from "next/link";
import { BarberAvatar } from "@/components/BarberAvatar";
import { JsonLd, buildHairSalonJsonLd } from "@/components/JsonLd";
import { OpeningHoursTable } from "@/components/OpeningHoursTable";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceList } from "@/components/ServiceList";
import { getActiveBarbers } from "@/lib/barbers";
import { galleryImages } from "@/lib/gallery";
import { heroImage } from "@/lib/hero";
import { getOpeningHours } from "@/lib/hours";
import { pageMetadata } from "@/lib/seo";
import { getActiveServices } from "@/lib/services";
import { getShopSettings } from "@/lib/shop-settings";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata({
  title: "SH-Cutz – Barberare på Södermalm, Stockholm",
  absoluteTitle: true,
  description:
    "Boka fade och skäggtrim hos SH-Cutz, barbershop på Folkungagatan 87 på Södermalm i Stockholm. Tydliga priser och enkel onlinebokning.",
  path: "/",
});

export const revalidate = 300;

const promises = [
  { title: "Boka dygnet runt", text: "Välj tjänst, frisör och tid på någon minut, när det passar dig." },
  { title: "Tydliga priser", text: "Pris och tidsåtgång syns innan du bokar." },
  { title: "Påminnelse", text: "Lämna din e-post så skickar vi bekräftelse och en påminnelse." },
];

export default async function Home() {
  const [services, hours, shop, barbers] = await Promise.all([
    getActiveServices(),
    getOpeningHours(),
    getShopSettings(),
    getActiveBarbers(),
  ]);
  const featured = services.slice(0, 3);
  const mapQuery = encodeURIComponent(`${shop.addressLine}, ${shop.city}`);

  return (
    <>
      <JsonLd data={buildHairSalonJsonLd(services, hours, shop)} />

      {/* Hero: ligger under den transparenta headern */}
      <section className="grain texture-grid relative -mt-16 flex min-h-[92svh] items-center overflow-hidden pt-16 sm:-mt-20 sm:pt-20">
        {heroImage && (
          <>
            <Image src={heroImage.src} alt={heroImage.alt} fill priority sizes="100vw" className="-z-20 object-cover" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/40" />
          </>
        )}
        {!heroImage && (
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_15%,rgb(212_175_55/0.18),transparent_55%)]"
          />
        )}
        <span
          aria-hidden
          className="stroke-text pointer-events-none absolute -bottom-6 -right-4 -z-10 select-none font-display text-[42vw] font-bold leading-none sm:text-[24rem]"
        >
          SH
        </span>

        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <p className="eyebrow">Södermalm, Stockholm</p>
          <h1 className="display mt-6 text-[clamp(3.25rem,12vw,8rem)]">
            Barberare på
            <br />
            <span className="text-accent">Södermalm</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/75">
            Precisa fades och välformade skägg hos {siteConfig.name}. Boka din tid online på någon minut.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/boka" className="btn btn-primary">
              Boka tid
            </Link>
            <Link href="/tjanster" className="btn btn-secondary">
              Se priser
            </Link>
          </div>
          <p className="mt-12 text-sm text-foreground/60">
            {shop.addressLine}, {siteConfig.address.area}
          </p>
        </div>
      </section>

      <section aria-label="Därför boka hos oss" className="border-y border-line bg-surface">
        <ul className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-3">
          {promises.map((p, i) => (
            <li key={p.title} className="bg-surface px-6 py-8">
              <p className="font-display text-sm tracking-[0.3em] text-accent">0{i + 1}</p>
              <p className="display mt-2 text-xl">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="services-heading" className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Tjänster" id="services-heading">
            Tjänster och priser
          </SectionHeading>
          <Link href="/tjanster" className="btn btn-secondary btn-sm">
            Se alla tjänster
          </Link>
        </div>
        <div className="mt-10">
          <ServiceList items={featured} />
        </div>
      </section>

      {barbers.length > 0 && (
        <section aria-labelledby="barbers-heading" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <SectionHeading eyebrow="Teamet" id="barbers-heading">
              {barbers.length === 1 ? "Din barberare" : "Frisörerna"}
            </SectionHeading>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {barbers.map((barber) => (
                <li key={barber.id} className="card reveal flex items-start gap-5 p-6">
                  <BarberAvatar name={barber.name} photoUrl={barber.photoUrl} size="lg" />
                  <div>
                    <h3 className="display text-2xl">{barber.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">{barber.bio}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section aria-labelledby="gallery-heading" className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Galleri" id="gallery-heading">
              Resultatet
            </SectionHeading>
            <Link href="/galleri" className="btn btn-secondary btn-sm">
              Hela galleriet
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {galleryImages.slice(0, 4).map((image) => (
              <li key={image.id} className="reveal aspect-[4/5] overflow-hidden rounded-sm border border-line bg-surface">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="hours-heading" className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Öppettider" id="hours-heading">
              När vi har öppet
            </SectionHeading>
            <div className="card mt-8 max-w-md px-6 py-3">
              <OpeningHoursTable hours={hours} />
            </div>
            {shop.dropInText && (
              <div className="mt-6 max-w-md border-l-2 border-accent bg-surface-2 p-5">
                <h3 className="display text-xl text-accent">Dröppen</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{shop.dropInText}</p>
              </div>
            )}
          </div>

          <div>
            <SectionHeading eyebrow="Hitta hit" as="h2">
              Hos oss på Söder
            </SectionHeading>
            <address className="mt-8 text-lg not-italic leading-relaxed text-foreground/80">
              {shop.addressLine}
              <br />
              {siteConfig.address.area}, {shop.postalCode ? `${shop.postalCode} ` : ""}
              {shop.city}
            </address>
            <p className="mt-3">
              <a href={shop.phoneHref} className="font-display text-2xl tracking-wide text-accent hover:underline">
                {shop.phone}
              </a>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Öppna i Google Maps (ny flik)
              </a>
              <Link href="/kontakt" className="btn btn-secondary btn-sm">
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-heading" className="mx-auto max-w-3xl px-4 py-20">
        <h2 id="about-heading" className="display text-3xl">
          Din barbershop på Södermalm
        </h2>
        <p className="mt-4 leading-relaxed text-foreground/70">
          Letar du efter en barberare på Södermalm? SH-Cutz ligger på {shop.addressLine} och erbjuder fade,
          skäggtrimning och kombinationen fade &amp; skägg. Oavsett om du vill ha en skarp fade i Stockholm eller bara
          få skägget i form är du välkommen in. Se våra{" "}
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

      <section className="grain border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h2 className="display text-5xl sm:text-7xl">
            Redo för en <span className="text-accent">ny look</span>?
          </h2>
          <Link href="/boka" className="btn btn-primary mt-10">
            Boka tid
          </Link>
        </div>
      </section>
    </>
  );
}
