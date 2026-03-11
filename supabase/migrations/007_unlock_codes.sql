-- One-time unlock codes for free access (family/friends/testing).
-- Valid codes are listed in env CLARION_UNLOCK_CODES (comma-separated); each code can be redeemed once.
create table if not exists public.unlock_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create index if not exists unlock_redemptions_user_id on public.unlock_redemptions(user_id);
comment on table public.unlock_redemptions is 'One-time free unlock codes; each code can only be used once.';

-- RLS: users can insert their own redemption (to redeem a code) and read their own.
alter table public.unlock_redemptions enable row level security;

create policy "Users can insert own redemption"
  on public.unlock_redemptions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own redemptions"
  on public.unlock_redemptions for select
  using (auth.uid() = user_id);
