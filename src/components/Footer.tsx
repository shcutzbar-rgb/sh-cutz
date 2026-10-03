import Link from "next/link";
import { navLinks, siteConfig } from "@/lib/site";

export function Footer() {
  const { address } = siteConfig;

  return (
    <footer className="border-t border-white/10 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-foreground/70">{siteConfig.description}</p>
        </div>

        <div>
          <p className="font-semibold">Hitta hit</p>
          <address className="mt-2 text-sm not-italic text-foreground/70">
            {address.street}
            <br />
            {address.area}, {address.city}
            <br />
            <a href={siteConfig.phoneHref} className="hover:text-foreground">
              {siteConfig.phone}
            </a>
          </address>
        </div>

        <div>
          <p className="font-semibold">Sidor</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground/70">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} {siteConfig.name}. Alla rättigheter förbehållna.
      </p>
    </footer>
  );
}
