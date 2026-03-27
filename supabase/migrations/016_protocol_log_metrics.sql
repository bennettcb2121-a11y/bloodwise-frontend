-- Optional daily self-reported metrics (activity, sun, hydration, weight, etc.) for trends between labs.
ALTER TABLE public.protocol_log
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.protocol_log.metrics IS 'Daily check-in: activity, sun_min, hydration_cups, sleep_hours, weight_kg, notes — merged client-side with checks.';
