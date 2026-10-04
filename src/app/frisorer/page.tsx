import Link from "next/link";
import { BarberAvatar } from "@/components/BarberAvatar";
import { PageHeader } from "@/components/PageHeader";
import { getActiveBarbers } from "@/lib/barbers";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Frisörer",
  description: "Möt barberaren på SH-Cutz på Södermalm i Stockholm.",
  path: "/frisorer",
});

export const revalidate = 300;

export default async function FrisorerPage() {
  const barbers = await getActiveBarbers();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <PageHeader eyebrow="Teamet" title="Frisörer" />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {barbers.map((barber) => (
          <li key={barber.id} className="card reveal flex items-start gap-5 p-6">
            <BarberAvatar name={barber.name} photoUrl={barber.photoUrl} size="lg" />
            <div>
              <h2 className="display text-2xl">{barber.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{barber.bio}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/boka" className="btn btn-primary mt-12">
        Boka tid
      </Link>
    </section>
  );
}
