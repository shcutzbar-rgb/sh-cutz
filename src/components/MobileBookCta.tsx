"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Fast bokningsknapp på mobil. Dold i bokningsflödet där flödet självt har sina knappar. */
export function MobileBookCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/boka") || pathname.startsWith("/avboka")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 p-3 backdrop-blur md:hidden">
      <Link href="/boka" className="btn btn-primary w-full">
        Boka tid
      </Link>
    </div>
  );
}
