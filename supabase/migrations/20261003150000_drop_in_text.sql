-- Fri text om drop-in, visas på startsida och kontaktsida när den inte är tom.
alter table shop_settings add column drop_in_text text not null default '' check (char_length(drop_in_text) <= 500);
