-- =============================================================================
-- Clarion Labs: full Supabase setup (run this ONCE in SQL Editor → New query)
-- =============================================================================
-- Copy this entire file into Supabase → SQL Editor → New query → Run
-- =============================================================================

-- 1. Profiles (one per user)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  age text default '',
  sex text default '',
  sport text default '',
  goal text default '',
  current_supplement_spend text default '',
  current_supplements text default '',
  shopping_preference text default 'Best value',
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 2. Bloodwork saves (panel, biomarkers, stack, savings)
create table if not exists public.bloodwork_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_panel jsonb default '[]',
  biomarker_inputs jsonb default '{}',
  current_step int default 1,
  stack_snapshot jsonb default '{}',
  savings_snapshot jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bloodwork_saves add column if not exists score integer;
alter table public.bloodwork_saves add column if not exists detected_patterns jsonb default '[]';
alter table public.bloodwork_saves add column if not exists key_flagged_biomarkers jsonb default '[]';

create index if not exists bloodwork_saves_user_updated on public.bloodwork_saves(user_id, updated_at desc);

-- 3. RLS: profiles
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- 4. RLS: bloodwork_saves
alter table public.bloodwork_saves enable row level security;
create policy "Users can read own bloodwork_saves" on public.bloodwork_saves for select using (auth.uid() = user_id);
create policy "Users can insert own bloodwork_saves" on public.bloodwork_saves for insert with check (auth.uid() = user_id);
create policy "Users can update own bloodwork_saves" on public.bloodwork_saves for update using (auth.uid() = user_id);
create policy "Users can delete own bloodwork_saves" on public.bloodwork_saves for delete using (auth.uid() = user_id);

-- 5. Subscriptions (for Stripe)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists subscriptions_user_id on public.subscriptions(user_id);
create index if not exists subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);
alter table public.subscriptions enable row level security;
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- Done. Tables: profiles, bloodwork_saves, subscriptions. All RLS in place.
