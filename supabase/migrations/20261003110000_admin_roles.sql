-- Rollstyrning: alla admins får läsa allt och hantera bokningar; bara owner ändrar katalog och inställningar.
create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where id = auth.uid() and role = 'owner');
$$;

do $$
declare
  t text;
begin
  foreach t in array array['services', 'barbers', 'working_hours', 'time_off', 'shop_settings'] loop
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for select using (is_admin())', t || '_admin_read', t);
    execute format('create policy %I on %I for insert with check (is_owner())', t || '_owner_insert', t);
    execute format('create policy %I on %I for update using (is_owner()) with check (is_owner())', t || '_owner_update', t);
    execute format('create policy %I on %I for delete using (is_owner())', t || '_owner_delete', t);
  end loop;
end;
$$;

-- bookings_admin_all (alla admins) och admin_users_self_read ligger kvar från 20261003100100_rls.sql.
