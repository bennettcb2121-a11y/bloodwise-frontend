-- Add calculated score and detected patterns to bloodwork saves (step 5/6)
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS score integer;
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS detected_patterns jsonb DEFAULT '[]';
