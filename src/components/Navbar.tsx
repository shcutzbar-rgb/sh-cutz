import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { navLinks, siteConfig } from "@/lib/site";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur">
      <nav
        aria-label="Huvudmeny"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"
      >
        <Link href="/" className="text-lg font-bold tracking-tight">
          {siteConfig.name}
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-sm text-foreground/80 hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/boka"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent/90"
            >
              Boka tid
            </Link>
          </li>
        </ul>

        <MobileMenu links={navLinks} />
      </nav>
    </header>
  );
}
