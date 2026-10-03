import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Barber } from "@/types/shop";

// Fallback när Supabase saknas eller inte svarar. ID:t matchar seed-migreringen.
export const staticBarbers: Barber[] = [
  {
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Shabir",
    bio: "Barberare på SH-Cutz på Södermalm. Specialiserad på fades och skäggtrimning.",
    photoUrl: null,
    isActive: true,
  },
];

type BarberRow = {
  id: string;
  name: string;
  bio: string;
  photo_url: string | null;
  is_active: boolean;
};

export async function getActiveBarbers(): Promise<Barber[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await createAnonClient()
        .from("barbers")
        .select("id,name,bio,photo_url,is_active")
        .eq("is_active", true)
        .order("name");
      if (!error && data && data.length > 0) {
        return (data as BarberRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          bio: row.bio,
          photoUrl: row.photo_url,
          isActive: row.is_active,
        }));
      }
      if (error) console.error("Kunde inte läsa barbers:", error.message);
    } catch (err) {
      console.error("Kunde inte läsa barbers:", err);
    }
  }
  return staticBarbers;
}
