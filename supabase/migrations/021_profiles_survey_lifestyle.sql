-- Onboarding lifestyle step (activity, sleep band, exercise, alcohol) — persisted with profile.
alter table public.profiles
  add column if not exists activity_level text default null;

alter table public.profiles
  add column if not exists sleep_hours_band text default null;

alter table public.profiles
  add column if not exists exercise_regularly text default null;

alter table public.profiles
  add column if not exists alcohol_frequency text default null;
