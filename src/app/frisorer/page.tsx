import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Frisörer" };

export default function FrisorerPage() {
  return <PagePlaceholder title="Frisörer" description="Presentation av frisörerna kommer i Fas 2." />;
}
