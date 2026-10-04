/** Return a Monday-first grid of ISO dates, padded to complete weeks. */
export function buildMonthGrid(month: string): (string | null)[] {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || monthNumber < 1 || monthNumber > 12) return [];

  const weekdayOffset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const leadingBlanks = (weekdayOffset + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, dayIndex) => `${month}-${String(dayIndex + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7);
}