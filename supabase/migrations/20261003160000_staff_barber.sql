-- Valfri koppling mellan en admin och en frisör. Personal (staff) med barber_id når bara den frisörens bokningar.
-- owner och admins utan barber_id når alla bokningar.
-- restrict: att ta bort en kopplad frisör får aldrig tyst ge personalen åtkomst till alla bokningar.
alter table admin_users add column barber_id uuid references barbers (id) on delete restrict;

create function can_access_barber(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid()
      and (a.role = 'owner' or a.barber_id is null or a.barber_id = target)
  );
$$;

drop policy bookings_admin_all on bookings;

-- with check hindrar även att en bokning flyttas till en frisör man inte har åtkomst till.
create policy bookings_admin_access on bookings for all
  using (can_access_barber(barber_id))
  with check (can_access_barber(barber_id));
