import { openingHours, weekdayNamesSv } from "@/lib/hours";

export function OpeningHoursTable() {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Öppettider</caption>
      <tbody className="divide-y divide-white/10">
        {openingHours.map((day) => (
          <tr key={day.weekday}>
            <th scope="row" className="py-2 pr-4 text-left font-medium">
              {weekdayNamesSv[day.weekday]}
            </th>
            <td className="py-2 text-right text-foreground/70">
              {day.opens && day.closes ? `${day.opens}–${day.closes}` : "Stängt"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
