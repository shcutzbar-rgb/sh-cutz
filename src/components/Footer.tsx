import Link from "next/link";
import { navLinks, siteConfig } from "@/lib/site";

export function Footer() {
  const { address } = siteConfig;

  return (
    <footer className="border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-bold tracking-[0.04em]">
            {siteConfig.name}
            <span aria-hidden className="text-accent">
              .
            </span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-foreground/70">{siteConfig.description}</p>
          <Link href="/boka" className="btn btn-primary btn-sm mt-6">
            Boka tid
          </Link>
        </div>

        <div>
          <p className="eyebrow">Hitta hit</p>
          <address className="mt-4 text-sm not-italic leading-relaxed text-foreground/75">
            {address.street}
            <br />
            {address.area}, {address.city}
            <br />
            <a href={siteConfig.phoneHref} className="mt-2 inline-block text-accent hover:underline">
              {siteConfig.phone}
            </a>
          </address>
        </div>

        <nav aria-label="Sidor">
          <p className="eyebrow">Sidor</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/75">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <hr className="gold-rule" />
      <p className="py-5 text-center text-xs text-foreground/55">
        © {new Date().getFullYear()} {siteConfig.name}. Alla rättigheter förbehållna.{" "}
        <Link href="/integritet" className="underline underline-offset-2 hover:text-foreground">
          Integritetspolicy
        </Link>
      </p>
    </footer>
  );
}
