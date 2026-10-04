type Props = { name: string; photoUrl: string | null; size?: "md" | "lg" };

const SIZE = { md: "h-14 w-14 text-2xl", lg: "h-24 w-24 text-4xl" } as const;
const PIXELS = { md: 56, lg: 96 } as const;

/** Frisörens foto, eller en guldmonogram när foto saknas. */
export function BarberAvatar({ name, photoUrl, size = "md" }: Props) {
  if (photoUrl) {
    return (
      // Admin anger godtycklig bild-URL, så next/image (som kräver kända domäner) kan inte användas.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`Foto på ${name}`}
        width={PIXELS[size]}
        height={PIXELS[size]}
        loading="lazy"
        className={`${SIZE[size]} shrink-0 rounded-full border border-accent/60 object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZE[size]} flex shrink-0 items-center justify-center rounded-full border border-accent/60 bg-surface-2 font-display font-bold text-accent`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
