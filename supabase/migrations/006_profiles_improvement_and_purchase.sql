-- Add improvement preference, profile type, and one-time analysis purchase timestamp to profiles
alter table public.profiles
  add column if not exists improvement_preference text default '',
  add column if not exists profile_type text default '',
  add column if not exists analysis_purchased_at timestamptz;

comment on column public.profiles.improvement_preference is 'How user prefers to improve biomarkers: Supplements, Diet, Lifestyle, Combination';
comment on column public.profiles.profile_type is 'Clarion profile type: e.g. endurance_athlete, fatigue_low_energy, general_health_adult';
comment on column public.profiles.analysis_purchased_at is 'Set when user completes one-time $49 Clarion analysis purchase via Stripe';
