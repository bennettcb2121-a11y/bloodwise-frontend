-- Reorder reminder prefs on profiles (idempotent; also defined in 013_supplement_inventory.sql).
alter table public.profiles
  add column if not exists notify_reorder_email boolean default true;
alter table public.profiles
  add column if not exists notify_reorder_days int default 7;
