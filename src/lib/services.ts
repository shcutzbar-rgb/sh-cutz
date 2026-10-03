import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Service } from "@/types/shop";

// Fallback när Supabase saknas eller inte svarar. ID:n matchar seed-migreringen.
export const staticServices: Service[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Fade",
    description: "Klassisk fade med slutstyling.",
    priceSek: 350,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Skägg",
    description: "Trimning och formning av skägget.",
    priceSek: 180,
    durationMinutes: 15,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Fade & Skägg",
    description: "Fade och skäggtrimning i samma besök.",
    priceSek: 400,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Fade sidorna",
    description: "Fade på sidorna.",
    priceSek: 280,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 4,
  },
];

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  price_sek: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
};

export function mapServiceRow(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceSek: row.price_sek,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function getActiveServices(): Promise<Service[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await createAnonClient()
        .from("services")
        .select("id,name,description,price_sek,duration_minutes,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data && data.length > 0) return data.map(mapServiceRow);
      if (error) console.error("Kunde inte läsa services:", error.message);
    } catch (err) {
      console.error("Kunde inte läsa services:", err);
    }
  }
  return staticServices;
}
