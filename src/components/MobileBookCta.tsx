import Link from "next/link";

export function MobileBookCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/boka"
        className="block rounded-full bg-accent py-3 text-center font-semibold text-black"
      >
        Boka tid
      </Link>
    </div>
  );
}
