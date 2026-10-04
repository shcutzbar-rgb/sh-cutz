import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative mx-auto max-w-xl overflow-hidden px-4 py-24 text-center">
      <p aria-hidden className="stroke-text font-display text-[9rem] font-bold leading-none sm:text-[12rem]">
        404
      </p>
      <h1 className="display -mt-6 text-4xl sm:text-5xl">Sidan hittades inte</h1>
      <p className="mt-4 text-foreground/70">Länken kan vara felaktig eller sidan har flyttats.</p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn btn-secondary">
          Till startsidan
        </Link>
        <Link href="/boka" className="btn btn-primary">
          Boka tid
        </Link>
      </div>
    </section>
  );
}
