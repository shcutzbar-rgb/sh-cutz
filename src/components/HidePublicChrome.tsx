"use client";

import { usePathname } from "next/navigation";

/** Dölj publik navbar/footer/CTA i adminpanelen. */
export function HidePublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : children;
}
