import type { Service } from "@/types/shop";

// Statisk data tills Supabase kopplas in (Fas 3).
export const services: Service[] = [
  {
    id: "fade",
    name: "Fade",
    description: "Klassisk fade med slutstyling.",
    priceSek: 350,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "skagg",
    name: "Skägg",
    description: "Trimning och formning av skägget.",
    priceSek: 180,
    durationMinutes: 15,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "fade-skagg",
    name: "Fade & Skägg",
    description: "Fade och skäggtrimning i samma besök.",
    priceSek: 400,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "fade-sidorna",
    name: "Fade sidorna",
    description: "Fade på sidorna.",
    priceSek: 280,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 4,
  },
];

export function getActiveServices(): Service[] {
  return services.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}
