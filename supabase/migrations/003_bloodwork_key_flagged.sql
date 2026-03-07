-- Store key flagged biomarker names for display in Previous Reports
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS key_flagged_biomarkers jsonb DEFAULT '[]';
