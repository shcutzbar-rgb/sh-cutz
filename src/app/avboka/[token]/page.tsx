import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Avboka tid",
  robots: { index: false, follow: false },
};

export default async function AvbokaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  void token; // Valideras mot cancel_token_hash i Fas 4.

  return <PagePlaceholder title="Avboka tid" description="Avbokning via unik länk byggs i Fas 4." />;
}
