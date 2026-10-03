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
      className="relative md:hidden"
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
        className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15"
      >
        <span aria-hidden className="text-xl leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>
      {open && (
        <ul
          id="mobile-menu"
          className="absolute right-0 top-12 w-56 rounded-lg border border-white/10 bg-background p-2 shadow-xl"
        >
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block rounded-md px-3 py-2 hover:bg-white/10">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
