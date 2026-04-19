-- Optional training / athlete focus for adaptive ranges and panels (with health goals).
alter table public.profiles
  add column if not exists training_focus text;

comment on column public.profiles.training_focus is
  'e.g. none | endurance_athlete | strength_hypertrophy_athlete — refines biomarker targets with health_goals';
