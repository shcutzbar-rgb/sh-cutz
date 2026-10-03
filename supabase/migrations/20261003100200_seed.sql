-- Seed: fasta UUID:n matchar den statiska fallbackdatan i src/lib.
insert into shop_settings (id, shop_name, phone, email, address_line, city, postal_code, booking_interval_minutes, cancellation_policy, timezone)
values (1, 'SH-Cutz', '072-192 68 49', null, 'Folkungagatan 87', 'Stockholm', null, 15, '', 'Europe/Stockholm')
on conflict (id) do nothing;

insert into services (id, name, description, price_sek, duration_minutes, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Fade', 'Klassisk fade med slutstyling.', 350, 30, 1),
  ('00000000-0000-4000-8000-000000000002', 'Skägg', 'Trimning och formning av skägget.', 180, 15, 2),
  ('00000000-0000-4000-8000-000000000003', 'Fade & Skägg', 'Fade och skäggtrimning i samma besök.', 400, 30, 3),
  ('00000000-0000-4000-8000-000000000004', 'Fade sidorna', 'Fade på sidorna.', 280, 30, 4)
on conflict (id) do nothing;

insert into barbers (id, name, bio) values
  ('00000000-0000-4000-8000-0000000000b1', 'Shabir', 'Barberare på SH-Cutz på Södermalm. Specialiserad på fades och skäggtrimning.')
on conflict (id) do nothing;

-- UTKAST: samma öppettider som i src/lib/hours.ts. Verifiera med kunden före launch.
insert into working_hours (barber_id, weekday, start_time, end_time)
select '00000000-0000-4000-8000-0000000000b1', d, '10:00', '19:00' from generate_series(1, 5) as d;
insert into working_hours (barber_id, weekday, start_time, end_time)
values ('00000000-0000-4000-8000-0000000000b1', 6, '10:00', '17:00');
