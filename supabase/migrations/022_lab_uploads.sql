-- Lab PDF / image uploads + structured extraction storage.
-- Users upload multiple files per "lab session" (one blood draw can span pages / lab providers).
-- AI extracts biomarker values; normalized rows land in `lab_biomarker_values` for analysis.
-- Raw files are stored in the `lab-uploads` bucket and deleted immediately after user confirms
-- extraction, per retention policy (see 023_user_consents.sql).

-- ———————————————————————————————————————————————————————————————————————————————
-- Upload sessions: one row per "I uploaded my June 2026 labs" action, holds metadata.
-- ———————————————————————————————————————————————————————————————————————————————
create table if not exists public.lab_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default '',
  collected_at date,
  status text not null default 'uploading', -- uploading | extracting | confirming | confirmed | discarded
  file_count int not null default 0,
  extraction_model text default '',
  extraction_error text default '',
  consent_snapshot_id uuid, -- references user_consents row captured at upload time
  raw_deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists lab_upload_sessions_user_created
  on public.lab_upload_sessions(user_id, created_at desc);

-- ———————————————————————————————————————————————————————————————————————————————
-- Extractions: one row per file in a session. Stores raw AI output + confidence.
-- storage_path is path inside the `lab-uploads` bucket; set to null after deletion.
-- ———————————————————————————————————————————————————————————————————————————————
create table if not exists public.lab_extractions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lab_upload_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text default '',
  mime_type text default '',
  file_size_bytes int default 0,
  storage_path text, -- null once raw file is purged
  raw_extraction jsonb default '{}'::jsonb, -- { rows: [ { testName, value, unit, rangeMin, rangeMax, flag, confidence } ] }
  model text default '',
  extraction_confidence numeric, -- aggregate confidence 0..1
  error text default '',
  created_at timestamptz default now()
);

create index if not exists lab_extractions_session on public.lab_extractions(session_id);
create index if not exists lab_extractions_user on public.lab_extractions(user_id);

-- ———————————————————————————————————————————————————————————————————————————————
-- Normalized biomarker values: canonical name, canonical unit, confidence.
-- Populated after user confirms. Feeds analysis and trend charts alongside bloodwork_saves.
-- ———————————————————————————————————————————————————————————————————————————————
create table if not exists public.lab_biomarker_values (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.lab_upload_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  biomarker_key text not null, -- canonical key from biomarkerDatabase.ts (e.g. "Ferritin")
  value numeric not null,
  unit text default '',
  raw_name text default '',    -- what the lab report called it
  raw_value text default '',
  raw_unit text default '',
  range_low numeric,           -- what the lab's reference range said
  range_high numeric,
  flag text default '',        -- lab flag (L, H, HH, LL, etc.) if printed
  confidence numeric default 1,
  source text not null default 'ai_extracted', -- ai_extracted | user_edited | manual_entry
  collected_at date,
  created_at timestamptz default now()
);

create index if not exists lab_biomarker_values_user_created
  on public.lab_biomarker_values(user_id, created_at desc);
create index if not exists lab_biomarker_values_user_marker
  on public.lab_biomarker_values(user_id, biomarker_key);
create index if not exists lab_biomarker_values_session
  on public.lab_biomarker_values(session_id);

-- ———————————————————————————————————————————————————————————————————————————————
-- RLS: owner-only
-- ———————————————————————————————————————————————————————————————————————————————
alter table public.lab_upload_sessions enable row level security;
alter table public.lab_extractions enable row level security;
alter table public.lab_biomarker_values enable row level security;

create policy "users_select_own_lab_sessions"
  on public.lab_upload_sessions for select using (auth.uid() = user_id);
create policy "users_insert_own_lab_sessions"
  on public.lab_upload_sessions for insert with check (auth.uid() = user_id);
create policy "users_update_own_lab_sessions"
  on public.lab_upload_sessions for update using (auth.uid() = user_id);
create policy "users_delete_own_lab_sessions"
  on public.lab_upload_sessions for delete using (auth.uid() = user_id);

create policy "users_select_own_lab_extractions"
  on public.lab_extractions for select using (auth.uid() = user_id);
create policy "users_insert_own_lab_extractions"
  on public.lab_extractions for insert with check (auth.uid() = user_id);
create policy "users_update_own_lab_extractions"
  on public.lab_extractions for update using (auth.uid() = user_id);
create policy "users_delete_own_lab_extractions"
  on public.lab_extractions for delete using (auth.uid() = user_id);

create policy "users_select_own_lab_biomarker_values"
  on public.lab_biomarker_values for select using (auth.uid() = user_id);
create policy "users_insert_own_lab_biomarker_values"
  on public.lab_biomarker_values for insert with check (auth.uid() = user_id);
create policy "users_update_own_lab_biomarker_values"
  on public.lab_biomarker_values for update using (auth.uid() = user_id);
create policy "users_delete_own_lab_biomarker_values"
  on public.lab_biomarker_values for delete using (auth.uid() = user_id);

-- ———————————————————————————————————————————————————————————————————————————————
-- Storage bucket: `lab-uploads` (private). Paths must start with auth.uid()/.
-- Policies below enforce that PDFs/images are only visible to their owner.
-- Run the bucket create via Supabase dashboard or CLI before applying these policies:
--   insert into storage.buckets (id, name, public) values ('lab-uploads', 'lab-uploads', false)
--   on conflict (id) do nothing;
-- ———————————————————————————————————————————————————————————————————————————————
insert into storage.buckets (id, name, public)
  values ('lab-uploads', 'lab-uploads', false)
  on conflict (id) do nothing;

drop policy if exists "lab_uploads_select_own" on storage.objects;
create policy "lab_uploads_select_own"
  on storage.objects for select
  using (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lab_uploads_insert_own" on storage.objects;
create policy "lab_uploads_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lab_uploads_update_own" on storage.objects;
create policy "lab_uploads_update_own"
  on storage.objects for update
  using (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "lab_uploads_delete_own" on storage.objects;
create policy "lab_uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'lab-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
