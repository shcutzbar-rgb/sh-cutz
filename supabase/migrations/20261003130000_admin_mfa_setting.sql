-- Låter ägaren kräva tvåstegsverifiering (TOTP) för alla admins.
alter table shop_settings add column require_admin_mfa boolean not null default false;
