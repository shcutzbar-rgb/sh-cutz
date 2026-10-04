import type { Metadata } from "next";
import { AdminNav, type AdminNavItem } from "@/components/admin/AdminNav";
import { ROLE_LABEL, requireAdminPage } from "@/server/admin-auth";
import { logout } from "../actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STAFF_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Översikt" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/bokningar", label: "Bokningar" },
  { href: "/admin/sakerhet", label: "Säkerhet" },
];

const OWNER_ITEMS: AdminNavItem[] = [
  { href: "/admin/tjanster", label: "Tjänster" },
  { href: "/admin/frisorer", label: "Frisörer" },
  { href: "/admin/installningar", label: "Inställningar" },
];

// Layouts renderas inte om vid klientnavigering: varje sida och action kontrollerar behörighet själv.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const items = admin.role === "owner" ? [...STAFF_ITEMS, ...OWNER_ITEMS] : STAFF_ITEMS;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <AdminNav items={items} />
        <form action={logout} className="flex items-center gap-3 text-sm">
          <span className="text-foreground/70">
            {admin.email} ({ROLE_LABEL[admin.role]})
          </span>
          <button type="submit" className="btn btn-secondary btn-sm">
            Logga ut
          </button>
        </form>
      </header>
      <div className="py-6">{children}</div>
    </div>
  );
}
