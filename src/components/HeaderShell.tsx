"use client";

import { useEffect, useState } from "react";

/** Transparent överst på sidan, solid med oskärpa efter lite scroll. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
