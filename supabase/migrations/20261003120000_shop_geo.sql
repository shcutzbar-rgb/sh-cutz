-- Koordinater för JSON-LD (geo). Valfria; båda eller ingen.
alter table shop_settings
  add column latitude numeric(9, 6) check (latitude between -90 and 90),
  add column longitude numeric(9, 6) check (longitude between -180 and 180),
  add constraint shop_settings_geo_pair check ((latitude is null) = (longitude is null));
