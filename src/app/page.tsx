import Link from "next/link";
import { siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">Södermalm, Stockholm</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{siteConfig.name}</h1>
      <p className="mt-4 text-foreground/70">{siteConfig.description}</p>
      <Link
        href="/boka"
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
      >
        Boka tid
      </Link>
    </section>
  );
}
