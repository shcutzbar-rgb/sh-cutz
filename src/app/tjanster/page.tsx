import Link from "next/link";
import { ServiceList } from "@/components/ServiceList";
import { getActiveServices } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tjänster och priser",
  description:
    "Prislista hos SH-Cutz på Södermalm: fade, skägg och fade & skägg med tydliga priser och tider. Boka online.",
  path: "/tjanster",
});

export const revalidate = 300;

export default async function TjansterPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Tjänster och priser</h1>
      <p className="mt-3 text-foreground/70">
        Tydliga priser och tidsåtgång. Boka online när det passar dig.
      </p>
      <div className="mt-8">
        <ServiceList items={await getActiveServices()} headingLevel="h2" />
      </div>
      <Link
        href="/boka"
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
      >
        Boka tid
      </Link>
    </section>
  );
}
