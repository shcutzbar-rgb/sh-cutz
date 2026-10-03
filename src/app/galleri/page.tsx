import Image from "next/image";
import { galleryImages } from "@/lib/gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galleri",
  description: "Se exempel på fades och skäggtrimningar från SH-Cutz på Södermalm.",
  alternates: { canonical: "/galleri" },
};

export default function GalleriPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Galleri</h1>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {galleryImages.map((image, index) => (
          <li key={image.id} className="overflow-hidden rounded-xl bg-white/5">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 33vw, 50vw"
              loading={index < 2 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
