-- Add diet_preference to profiles for contextual biomarker insights (e.g. vegetarian, vegan).
alter table public.profiles
  add column if not exists diet_preference text default null;
