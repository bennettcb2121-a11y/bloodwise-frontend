-- Protocol tracker: daily check-ins per user (syncs across devices)
create table if not exists public.protocol_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  checks jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, log_date)
);

create index if not exists protocol_log_user_date on public.protocol_log(user_id, log_date desc);

alter table public.protocol_log enable row level security;

create policy "Users can read own protocol_log"
  on public.protocol_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own protocol_log"
  on public.protocol_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own protocol_log"
  on public.protocol_log for update
  using (auth.uid() = user_id);
