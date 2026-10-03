import Link from "next/link";
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

        <details className="group relative md:hidden">
          <summary
            aria-label="Meny"
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-white/15 [&::-webkit-details-marker]:hidden"
          >
            <span aria-hidden className="text-xl leading-none group-open:hidden">
              ☰
            </span>
            <span aria-hidden className="hidden text-xl leading-none group-open:block">
              ✕
            </span>
          </summary>
          <ul className="absolute right-0 top-12 w-56 rounded-lg border border-white/10 bg-background p-2 shadow-xl">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block rounded-md px-3 py-2 hover:bg-white/10">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}
