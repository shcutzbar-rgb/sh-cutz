import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { galleryImages } from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Galleri",
  description: "Se exempel på fades och skäggtrimningar från SH-Cutz på Södermalm.",
  path: "/galleri",
});

export default function GalleriPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <PageHeader eyebrow="Galleri" title="Resultatet" />
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {galleryImages.map((image, index) => (
          <li
            key={image.id}
            className={`reveal overflow-hidden rounded-sm border border-line bg-surface ${
              image.width > image.height ? "col-span-2 aspect-video md:col-span-3" : "aspect-4/5"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes={image.width > image.height ? "(min-width: 1152px) 1120px, 100vw" : "(min-width: 1152px) 365px, (min-width: 768px) 33vw, 50vw"}
              loading={index < 2 ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </li>
        ))}
      </ul>
      <Link href="/boka" className="btn btn-primary mt-12">
        Boka tid
      </Link>
    </section>
  );
}
