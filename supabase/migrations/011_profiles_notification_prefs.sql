-- Notification preferences for smart notifications (in-app toasts, email nudges).
alter table public.profiles
  add column if not exists streak_milestones boolean default true;
alter table public.profiles
  add column if not exists daily_reminder boolean default null;
