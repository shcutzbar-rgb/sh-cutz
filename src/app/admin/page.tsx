import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <PagePlaceholder title="Admin" description="Adminpanel med inloggning byggs i Fas 5." />;
}
