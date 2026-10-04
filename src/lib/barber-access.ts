/**
 * Personal kan vara kopplade till en frisör (admin_users.barber_id). Utan koppling ser och ändrar
 * personalen alla bokningar. Ägare är aldrig begränsade. Speglar SQL-funktionen can_access_barber().
 * Databasens RLS är den faktiska spärren; detta används för tydliga felmeddelanden och urval i gränssnittet.
 */
export type BarberScope = { role: "owner" | "staff"; barberId: string | null };

export function canAccessBarber(scope: BarberScope, barberId: string): boolean {
  if (scope.role === "owner") return true;
  return !scope.barberId || scope.barberId === barberId;
}

export function restrictBarbers<T extends { id: string }>(scope: BarberScope, barbers: T[]): T[] {
  return barbers.filter((b) => canAccessBarber(scope, b.id));
}
