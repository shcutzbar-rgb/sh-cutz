import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Sidan hittades inte</h1>
      <p className="mt-4 text-foreground/70">Länken kan vara felaktig eller sidan har flyttats.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-full border border-white/20 px-6 py-3 font-medium hover:bg-white/10">
          Till startsidan
        </Link>
        <Link href="/boka" className="rounded-full bg-accent px-6 py-3 font-semibold text-black hover:bg-accent/90">
          Boka tid
        </Link>
      </div>
    </section>
  );
}
