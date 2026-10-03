-- RLS på alla tabeller. Publik får bara läsa katalogdata; bokningar skapas via serverns service role.
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

alter table services enable row level security;
alter table barbers enable row level security;
alter table working_hours enable row level security;
alter table time_off enable row level security;
alter table bookings enable row level security;
alter table admin_users enable row level security;
alter table shop_settings enable row level security;

-- Publik läsning av aktiv katalogdata
create policy services_public_read on services for select using (is_active);
create policy barbers_public_read on barbers for select using (is_active);
create policy working_hours_public_read on working_hours for select using (is_active);
create policy shop_settings_public_read on shop_settings for select using (true);

-- Admin: full åtkomst
create policy services_admin_all on services for all using (is_admin()) with check (is_admin());
create policy barbers_admin_all on barbers for all using (is_admin()) with check (is_admin());
create policy working_hours_admin_all on working_hours for all using (is_admin()) with check (is_admin());
create policy time_off_admin_all on time_off for all using (is_admin()) with check (is_admin());
create policy bookings_admin_all on bookings for all using (is_admin()) with check (is_admin());
create policy shop_settings_admin_all on shop_settings for all using (is_admin()) with check (is_admin());

-- Användare kan läsa sin egen adminpost; ändringar görs med service role.
create policy admin_users_self_read on admin_users for select using (id = auth.uid());

-- time_off och bookings saknar publika policies: anon/authenticated utan admin ser inget.
