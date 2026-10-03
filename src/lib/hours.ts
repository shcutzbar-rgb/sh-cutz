import type { OpeningHours } from "@/types/shop";

// UTKAST: exakta öppettider är inte bekräftade av kunden (PLAN.md, fråga 1). Verifiera före launch.
export const openingHours: OpeningHours[] = [
  { weekday: 1, opens: "10:00", closes: "19:00" },
  { weekday: 2, opens: "10:00", closes: "19:00" },
  { weekday: 3, opens: "10:00", closes: "19:00" },
  { weekday: 4, opens: "10:00", closes: "19:00" },
  { weekday: 5, opens: "10:00", closes: "19:00" },
  { weekday: 6, opens: "10:00", closes: "17:00" },
  { weekday: 0, opens: null, closes: null },
];

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
