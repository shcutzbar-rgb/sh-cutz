import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Boka tid" };

export default function BokaPage() {
  return <PagePlaceholder title="Boka tid" description="Bokningsflödet byggs i Fas 3." />;
}
