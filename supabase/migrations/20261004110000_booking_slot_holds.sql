create table booking_slot_holds (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  barber_id uuid not null references barbers (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  expires_at timestamptz not null,
  active boolean not null default true,
  check (end_at > start_at),
  constraint booking_slot_holds_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (active)
);

create index booking_slot_holds_expiry_idx on booking_slot_holds (expires_at) where active;
alter table booking_slot_holds enable row level security;

create or replace function claim_booking_slot(
  p_token_hash text,
  p_barber_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_expires_at timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_end_at <= p_start_at or p_expires_at <= now() then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_barber_id::text, 0));
  update booking_slot_holds set active = false where barber_id = p_barber_id and active and expires_at <= now();

  if exists (
    select 1 from bookings b
    where b.barber_id = p_barber_id and b.status in ('pending', 'confirmed')
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) then return false; end if;

  if exists (
    select 1 from booking_slot_holds h
    where h.barber_id = p_barber_id and h.active and h.expires_at > now()
      and h.token_hash <> p_token_hash
      and tstzrange(h.start_at, h.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) then return false; end if;

  insert into booking_slot_holds (token_hash, barber_id, start_at, end_at, expires_at, active)
  values (p_token_hash, p_barber_id, p_start_at, p_end_at, p_expires_at, true)
  on conflict (token_hash) do update
    set barber_id = excluded.barber_id,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        expires_at = excluded.expires_at,
        active = true;

  return true;
exception when exclusion_violation then
  return false;
end;
$$;

create or replace function release_booking_slot(p_token_hash text) returns void
language sql security definer set search_path = public as $$
  update booking_slot_holds set active = false where token_hash = p_token_hash;
$$;

create or replace function protect_booking_slot_hold() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_admin_user boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.barber_id::text, 0));
  select exists (select 1 from admin_users where id = auth.uid()) into is_admin_user;

  if is_admin_user then
    update booking_slot_holds set active = false
    where barber_id = new.barber_id and active
      and tstzrange(start_at, end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)');
    return new;
  end if;

  if new.slot_hold_token_hash is not null then
    if exists (
      select 1 from booking_slot_holds h
      where h.token_hash = new.slot_hold_token_hash and h.barber_id = new.barber_id
        and h.active and h.expires_at > now()
        and h.start_at = new.start_at and h.end_at = new.end_at
    ) then
      update booking_slot_holds set active = false where token_hash = new.slot_hold_token_hash;
      return new;
    end if;
  end if;

  if exists (
    select 1 from booking_slot_holds h
    where h.barber_id = new.barber_id and h.active and h.expires_at > now()
      and (new.slot_hold_token_hash is null or h.token_hash <> new.slot_hold_token_hash)
      and tstzrange(h.start_at, h.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then
    raise exclusion_violation using message = 'Booking slot is temporarily held';
  end if;

  return new;
end;
$$;

alter table bookings add column slot_hold_token_hash text;
create trigger bookings_protect_slot_hold
before insert or update of barber_id, start_at, end_at on bookings
for each row execute function protect_booking_slot_hold();

revoke all on booking_slot_holds from anon, authenticated;
revoke all on function claim_booking_slot(text, uuid, timestamptz, timestamptz, timestamptz) from public;
revoke all on function release_booking_slot(text) from public;
grant execute on function claim_booking_slot(text, uuid, timestamptz, timestamptz, timestamptz) to anon, authenticated, service_role;
grant execute on function release_booking_slot(text) to anon, authenticated, service_role;