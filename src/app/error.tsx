"use client";

import { siteConfig } from "@/lib/site";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Något gick fel</h1>
      <p className="mt-4 text-foreground/70">
        Försök igen om en stund. Om felet kvarstår, ring oss på{" "}
        <a href={siteConfig.phoneHref} className="text-accent underline underline-offset-4">
          {siteConfig.phone}
        </a>
        .
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-accent px-6 py-3 font-semibold text-black hover:bg-accent/90"
      >
        Försök igen
      </button>
    </section>
  );
}
