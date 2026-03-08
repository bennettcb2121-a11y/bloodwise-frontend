-- Retest reminders: store email (for notifications), phone (optional SMS), and retest interval
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists retest_weeks int not null default 8;

comment on column public.profiles.email is 'User email for retest reminder emails (synced from auth)';
comment on column public.profiles.phone is 'Optional phone for SMS retest reminders (e.g. E.164)';
comment on column public.profiles.retest_weeks is 'Weeks after last test to send retest reminder (default 8)';
