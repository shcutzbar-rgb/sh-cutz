import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Tjänster" };

export default function TjansterPage() {
  return <PagePlaceholder title="Tjänster" description="Tjänster med pris och tidsåtgång kommer i Fas 2." />;
}
