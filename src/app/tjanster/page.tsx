import Link from "next/link";
import { ServiceList } from "@/components/ServiceList";
import { getActiveServices } from "@/lib/services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tjänster och priser",
  description:
    "Prislista hos SH-Cutz på Södermalm: fade 350 kr, skägg 180 kr, fade & skägg 400 kr och fade sidorna 280 kr.",
  alternates: { canonical: "/tjanster" },
};

export const revalidate = 300;

export default async function TjansterPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Tjänster och priser</h1>
      <p className="mt-3 text-foreground/70">
        Tydliga priser och tidsåtgång. Boka online när det passar dig.
      </p>
      <div className="mt-8">
        <ServiceList items={await getActiveServices()} />
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
