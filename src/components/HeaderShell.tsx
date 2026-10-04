"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > 12;

/** Transparent överst på sidan, solid med oskärpa efter lite scroll. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled ? "border-line bg-background/90 backdrop-blur" : "border-transparent bg-transparent"
      }`}
    >
      {children}
    </header>
  );
}
