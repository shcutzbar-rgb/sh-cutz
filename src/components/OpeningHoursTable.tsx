import { weekdayNamesSv } from "@/lib/hours";
import type { OpeningHours } from "@/types/shop";

export function OpeningHoursTable({ hours }: { hours: OpeningHours[] }) {
  if (hours.length === 0) {
    return <p className="text-sm text-foreground/70">Öppettider meddelas separat. Kontakta oss för aktuella tider.</p>;
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Öppettider</caption>
      <tbody className="divide-y divide-line">
        {hours.map((day) => (
          <tr key={day.weekday}>
            <th scope="row" className="py-3 pr-4 text-left font-display text-base font-medium tracking-[0.02em]">
              {weekdayNamesSv[day.weekday]}
            </th>
            <td className="py-3 text-right tabular-nums text-foreground/75">
              {day.opens && day.closes ? `${day.opens}–${day.closes}` : "Stängt"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
