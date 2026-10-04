import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <PageHeader
        eyebrow="Prislista"
        title="Tjänster och priser"
        intro="Tydliga priser och tidsåtgång. Boka online när det passar dig."
      />
      <div className="mt-10">
        <ServiceList items={await getActiveServices()} headingLevel="h2" />
      </div>
      <Link href="/boka" className="btn btn-primary mt-12">
        Boka tid
      </Link>
    </section>
  );
}
