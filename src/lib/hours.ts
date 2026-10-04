import { createAnonClient, isSupabaseConfigured } from "@/lib/supabase";
import type { OpeningHours } from "@/types/shop";

// Inga påhittade fallback-öppettider: saknas databasen eller arbetstider returneras en tom lista
// och sajten visar att öppettider meddelas separat i stället för falska tider.

export const weekdayNamesSv = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
export const weekdayNamesSchema = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type HoursRow = { weekday: number; start_time: string; end_time: string };

/** Öppet = tidigaste start till senaste slut bland aktiva frisörer; dagar utan arbetstid är stängda. */
export function deriveOpeningHours(rows: HoursRow[]): OpeningHours[] {
  return DISPLAY_ORDER.map((weekday) => {
    const day = rows.filter((r) => r.weekday === weekday);
    if (day.length === 0) return { weekday, opens: null, closes: null };
    const opens = day.map((r) => r.start_time.slice(0, 5)).sort()[0];
    const closes = day.map((r) => r.end_time.slice(0, 5)).sort().at(-1) as string;
    return { weekday, opens, closes };
  });
}

export async function getOpeningHours(): Promise<OpeningHours[]> {
  if (isSupabaseConfigured()) {
    try {
      // RLS döljer inaktiva frisörer, så inner join utesluter deras arbetstider.
      const { data, error } = await createAnonClient()
        .from("working_hours")
        .select("weekday,start_time,end_time,barbers!inner(is_active)")
        .eq("is_active", true);
      if (!error && data && data.length > 0) return deriveOpeningHours(data as HoursRow[]);
      if (error) console.error("Kunde inte läsa working_hours:", error.message);
    } catch (err) {
      console.error("Kunde inte läsa working_hours:", err);
    }
  }
  return [];
}
