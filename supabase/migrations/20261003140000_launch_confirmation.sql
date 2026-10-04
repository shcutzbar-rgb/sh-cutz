-- Ägaren bekräftar kontaktuppgifter och öppettider innan launch; null = ej bekräftat (utkast).
-- Driftsättningskontrollen (scripts/check-launch-ready.mjs) och check:live stoppar utkast.
alter table shop_settings
  add column contact_confirmed_at timestamptz,
  add column hours_confirmed_at timestamptz;
