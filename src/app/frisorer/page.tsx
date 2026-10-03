import Link from "next/link";
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
    <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Frisörer</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {barbers.map((barber) => (
          <li key={barber.id} className="flex gap-4 rounded-xl border border-white/10 p-5">
            <div
              aria-hidden
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-black"
            >
              {barber.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{barber.name}</h2>
              <p className="mt-1 text-sm text-foreground/70">{barber.bio}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/boka"
        className="mt-8 inline-block rounded-full bg-accent px-8 py-3 font-semibold text-black hover:bg-accent/90"
      >
        Boka tid
      </Link>
    </section>
  );
}
