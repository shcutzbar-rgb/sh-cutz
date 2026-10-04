"use client";

import { siteConfig } from "@/lib/site";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">Oväntat fel</p>
      <h1 className="display mt-4 text-4xl sm:text-5xl">Något gick fel</h1>
      <p className="mt-4 text-foreground/70">
        Försök igen om en stund. Om felet kvarstår, ring oss på{" "}
        <a href={siteConfig.phoneHref} className="text-accent underline underline-offset-4">
          {siteConfig.phone}
        </a>
        .
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-10">
        Försök igen
      </button>
    </section>
  );
}
