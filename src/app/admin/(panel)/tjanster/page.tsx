import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Flash, first, ui } from "@/components/admin/ui";
import { mapServiceRow } from "@/lib/services";
import { requireAdminPage } from "@/server/admin-auth";
import type { Service } from "@/types/shop";
import { deleteService, saveService } from "./actions";

export const metadata = { title: "Tjänster" };

function ServiceFields({ s, prefix }: { s?: Service; prefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <label htmlFor={`${prefix}-name`} className={ui.label}>
          Namn
        </label>
        <input id={`${prefix}-name`} name="name" defaultValue={s?.name} required maxLength={100} className={ui.input} />
      </div>
      <div>
        <label htmlFor={`${prefix}-price`} className={ui.label}>
          Pris (kr)
        </label>
        <input id={`${prefix}-price`} name="priceSek" type="number" min={0} defaultValue={s?.priceSek ?? 0} required className={ui.input} />
      </div>
      <div>
        <label htmlFor={`${prefix}-duration`} className={ui.label}>
          Tid (min)
        </label>
        <input id={`${prefix}-duration`} name="durationMinutes" type="number" min={5} step={5} defaultValue={s?.durationMinutes ?? 30} required className={ui.input} />
      </div>
      <div>
        <label htmlFor={`${prefix}-sort`} className={ui.label}>
          Ordning
        </label>
        <input id={`${prefix}-sort`} name="sortOrder" type="number" min={0} defaultValue={s?.sortOrder ?? 0} required className={ui.input} />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={s?.isActive ?? true} className="h-5 w-5 accent-[#d4af37]" />
          Aktiv
        </label>
      </div>
      <div className="sm:col-span-2 lg:col-span-6">
        <label htmlFor={`${prefix}-desc`} className={ui.label}>
          Beskrivning
        </label>
        <textarea id={`${prefix}-desc`} name="description" rows={2} defaultValue={s?.description} maxLength={500} className={ui.input} />
      </div>
    </div>
  );
}

export default async function ServicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminPage("owner");
  const sp = await searchParams;

  const { data } = await admin.supabase
    .from("services")
    .select("id,name,description,price_sek,duration_minutes,is_active,sort_order")
    .order("sort_order");
  const services = (data ?? []).map(mapServiceRow);

  return (
    <>
      <Flash ok={first(sp.ok)} error={first(sp.error)} />
      <h1 className="text-2xl font-bold tracking-tight">Tjänster</h1>

      <section className={`${ui.card} mt-6`} aria-labelledby="new-heading">
        <h2 id="new-heading" className="font-semibold">
          Ny tjänst
        </h2>
        <form action={saveService} className="mt-3 space-y-3">
          <ServiceFields prefix="new" />
          <button type="submit" className={ui.primary}>
            Lägg till
          </button>
        </form>
      </section>

      <ul className="mt-6 space-y-4">
        {services.map((s) => (
          <li key={s.id} className={ui.card}>
            <form action={saveService} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <ServiceFields s={s} prefix={s.id} />
              <button type="submit" className={ui.primary}>
                Spara
              </button>
            </form>
            <form action={deleteService} className="mt-2">
              <input type="hidden" name="id" value={s.id} />
              <ConfirmButton message={`Ta bort "${s.name}"?`} className={ui.danger}>
                Ta bort
              </ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
