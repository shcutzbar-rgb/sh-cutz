import Link from "next/link";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Flash, first, ui } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/admin-auth";
import { deleteBarber, saveBarber } from "./actions";

export const metadata = { title: "Frisörer" };

type BarberRow = { id: string; name: string; bio: string; photo_url: string | null; is_active: boolean };

function BarberFields({ b, prefix }: { b?: BarberRow; prefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${prefix}-name`} className={ui.label}>
          Namn
        </label>
        <input id={`${prefix}-name`} name="name" defaultValue={b?.name} required maxLength={100} className={ui.input} />
      </div>
      <div>
        <label htmlFor={`${prefix}-photo`} className={ui.label}>
          Bild-URL (https, valfri)
        </label>
        <input id={`${prefix}-photo`} name="photoUrl" type="url" defaultValue={b?.photo_url ?? ""} maxLength={500} className={ui.input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-bio`} className={ui.label}>
          Beskrivning
        </label>
        <textarea id={`${prefix}-bio`} name="bio" rows={2} defaultValue={b?.bio} maxLength={1000} className={ui.input} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={b?.is_active ?? true} className="h-5 w-5 accent-[#d4af37]" />
        Aktiv (kan bokas)
      </label>
    </div>
  );
}

export default async function BarbersAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("owner");
  const sp = await searchParams;

  const { data } = await admin.supabase.from("barbers").select("id,name,bio,photo_url,is_active").order("name");
  const barbers = (data ?? []) as BarberRow[];

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <h1 className="text-2xl font-bold tracking-tight">Frisörer</h1>

      <section className={`${ui.card} mt-6`} aria-labelledby="new-heading">
        <h2 id="new-heading" className="font-semibold">
          Ny frisör
        </h2>
        <form action={saveBarber} className="mt-3 space-y-3">
          <BarberFields prefix="new" />
          <button type="submit" className={ui.primary}>
            Lägg till
          </button>
        </form>
      </section>

      <ul className="mt-6 space-y-4">
        {barbers.map((b) => (
          <li key={b.id} className={ui.card}>
            <form action={saveBarber} className="space-y-3">
              <input type="hidden" name="id" value={b.id} />
              <BarberFields b={b} prefix={b.id} />
              <button type="submit" className={ui.primary}>
                Spara
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/frisorer/${b.id}`} className={ui.secondary}>
                Arbetstider och frånvaro
              </Link>
              <form action={deleteBarber}>
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton message={`Ta bort ${b.name}? Arbetstider och frånvaro tas också bort.`} className={ui.danger}>
                  Ta bort
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
