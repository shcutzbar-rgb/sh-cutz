import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Kontakt" };

export default function KontaktPage() {
  return <PagePlaceholder title="Kontakt" description="Karta, telefon och adress kommer i Fas 2." />;
}
