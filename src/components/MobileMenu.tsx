"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavLink = { href: string; label: string };

export function MobileMenu({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();
  // Menyn är öppen bara på den sida den öppnades på, så den stängs av sig själv vid navigering.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div
      className="md:hidden"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpenPath(null);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Stäng meny" : "Öppna meny"}
        onClick={() => setOpenPath(open ? null : pathname)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-sm border border-line"
      >
        <span
          aria-hidden
          className={`h-px w-5 bg-foreground transition-transform duration-200 ${open ? "translate-y-[6px] rotate-45" : ""}`}
        />
        <span aria-hidden className={`h-px w-5 bg-foreground transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
        <span
          aria-hidden
          className={`h-px w-5 bg-foreground transition-transform duration-200 ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
        />
      </button>
      {open && (
        <ul
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-line bg-background/98 px-4 pb-6 pt-2 backdrop-blur"
        >
          {links.map((link) => (
            <li key={link.href} className="border-b border-line last:border-0">
              <Link
                href={link.href}
                className={`block py-4 font-display text-xl uppercase tracking-[0.12em] ${
                  pathname === link.href ? "text-accent" : "text-foreground"
                }`}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="pt-4">
            <Link href="/boka" className="btn btn-primary w-full">
              Boka tid
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
