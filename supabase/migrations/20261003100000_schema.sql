-- Schema för SH-Cutz (se PLAN.md, datamodell).
create extension if not exists btree_gist;

create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
create type admin_role as enum ('owner', 'staff');

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_sek integer not null check (price_sek >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text not null default '',
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- weekday: 0 = söndag ... 6 = lördag. Tider tolkas i shop_settings.timezone.
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  check (end_time > start_time)
);
create index working_hours_barber_weekday_idx on working_hours (barber_id, weekday);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  check (end_at > start_at)
);
create index time_off_barber_range_idx on time_off (barber_id, start_at, end_at);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id),
  barber_id uuid not null references barbers (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  status booking_status not null default 'confirmed',
  -- SHA-256 (hex) av avbokningstoken. Rå token sparas aldrig.
  cancel_token_hash text not null unique,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  -- Förhindrar dubbelbokning även vid samtidiga anrop.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index bookings_start_at_idx on bookings (start_at);

create table admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  role admin_role not null default 'staff'
);

create table shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null,
  phone text not null,
  email text,
  address_line text not null,
  city text not null,
  postal_code text,
  booking_interval_minutes integer not null default 15 check (booking_interval_minutes > 0),
  cancellation_policy text not null default '',
  timezone text not null default 'Europe/Stockholm'
);

create trigger services_updated_at before update on services
  for each row execute function set_updated_at();
create trigger barbers_updated_at before update on barbers
  for each row execute function set_updated_at();
create trigger bookings_updated_at before update on bookings
  for each row execute function set_updated_at();
