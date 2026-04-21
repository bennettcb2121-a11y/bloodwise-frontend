-- User consents: version-pinned, affirmative opt-in records for MHMDA + FTC HBNR compliance.
-- Every sensitive action (lab upload, AI processing, retention choice) captures a signed row here.
-- Revocation marks `revoked_at` and triggers downstream deletion of anything derived from that consent.

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,    -- lab_processing | ai_processing | retention_default | health_data_privacy_v1
  version text not null,          -- e.g. "2026-04-21" or "v1"
  accepted boolean not null,      -- true = affirmative consent; false = declined / revoked record
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip_hash text default '',        -- sha256(ip + salt); never store raw IP
  user_agent_hash text default '',
  context jsonb default '{}'::jsonb, -- { flow: "lab_upload", sessionId: ..., notes: ... }
  created_at timestamptz default now()
);

create index if not exists user_consents_user_type on public.user_consents(user_id, consent_type);
create index if not exists user_consents_user_active
  on public.user_consents(user_id, consent_type, version)
  where revoked_at is null and accepted = true;

alter table public.user_consents enable row level security;

-- DROP before CREATE so this migration is safe to re-run (idempotent). Policies raise 42710
-- on CREATE if they already exist; DROP IF EXISTS is the standard Postgres idiom for this.
drop policy if exists "users_select_own_consents" on public.user_consents;
create policy "users_select_own_consents"
  on public.user_consents for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own_consents" on public.user_consents;
create policy "users_insert_own_consents"
  on public.user_consents for insert with check (auth.uid() = user_id);

drop policy if exists "users_update_own_consents" on public.user_consents;
create policy "users_update_own_consents"
  on public.user_consents for update using (auth.uid() = user_id);
-- intentionally NO delete policy: consent history is a legal record.
-- Revocation is done by updating `revoked_at`, not by deleting the row.

-- Helper: fetch active consents for a user & type (any non-revoked row).
create or replace function public.user_has_active_consent(
  p_user_id uuid,
  p_consent_type text,
  p_version text default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_consents
    where user_id = p_user_id
      and consent_type = p_consent_type
      and accepted = true
      and revoked_at is null
      and (p_version is null or version = p_version)
  );
$$;

grant execute on function public.user_has_active_consent(uuid, text, text) to authenticated;
