import Link from "next/link";
import { HeaderShell } from "@/components/HeaderShell";
import { MobileMenu } from "@/components/MobileMenu";
import { navLinks, siteConfig } from "@/lib/site";

export function Navbar() {
  return (
    <HeaderShell>
      <nav aria-label="Huvudmeny" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20">
        <Link href="/" className="font-display text-2xl font-bold uppercase tracking-[0.12em]">
          {siteConfig.name}
          <span aria-hidden className="text-accent">
            .
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-display text-sm uppercase tracking-[0.18em] text-foreground/75 transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/boka" className="btn btn-primary btn-sm">
              Boka tid
            </Link>
          </li>
        </ul>

        <MobileMenu links={navLinks} />
      </nav>
    </HeaderShell>
  );
}
