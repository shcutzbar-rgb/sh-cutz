import type { Barber } from "@/types/shop";

export const barbers: Barber[] = [
  {
    id: "shabir",
    name: "Shabir",
    bio: "Barberare på SH-Cutz på Södermalm. Specialiserad på fades och skäggtrimning.",
    photoUrl: null,
    isActive: true,
  },
];

export function getActiveBarbers(): Barber[] {
  return barbers.filter((b) => b.isActive);
}
