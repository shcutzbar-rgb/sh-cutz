import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Galleri" };

export default function GalleriPage() {
  return <PagePlaceholder title="Galleri" description="Bildgalleri kommer i Fas 2." />;
}
