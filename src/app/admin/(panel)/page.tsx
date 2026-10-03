import { Flash, first } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/admin-auth";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const sp = await searchParams;

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} denied={first(sp.denied) === "1"} />
      <h1 className="text-2xl font-bold tracking-tight">Översikt</h1>
    </>
  );
}
