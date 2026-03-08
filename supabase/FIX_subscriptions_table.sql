-- Fix "column user_id does not exist" on subscriptions
-- Run this in Supabase SQL Editor if subscriptions was created without user_id.
-- (Drops the table and recreates it correctly. Any existing rows in subscriptions will be lost.)

drop policy if exists "Users can read own subscription" on public.subscriptions;
drop table if exists public.subscriptions;

create table public.subscriptions (
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

create index subscriptions_user_id on public.subscriptions(user_id);
create index subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);
alter table public.subscriptions enable row level security;
create policy "Users can read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
