-- Streak toasts + daily reminder prefs (idempotent; also in 011_profiles_notification_prefs.sql).
alter table public.profiles
  add column if not exists streak_milestones boolean default true;
alter table public.profiles
  add column if not exists daily_reminder boolean default null;
