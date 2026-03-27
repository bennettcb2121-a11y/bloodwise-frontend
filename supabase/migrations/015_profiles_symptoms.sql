-- Optional comma-separated symptom ids (e.g. fatigue,low_energy) for contextual action priority.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS symptoms text;

COMMENT ON COLUMN public.profiles.symptoms IS 'Comma-separated symptom ids from onboarding/settings; drives biomarker priority ranking.';
