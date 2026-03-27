-- Optional daily self-reported metrics (activity, sun, hydration, weight, etc.) for trends between labs.
alter table public.protocol_log
  add column if not exists metrics jsonb not null default '{}'::jsonb;

comment on column public.protocol_log.metrics is 'Daily check-in: activity, sun_min, hydration_cups, sleep_hours, weight_kg, notes — merged client-side with checks.';
