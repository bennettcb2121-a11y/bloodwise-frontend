-- Supplement inventory: pills per bottle, dose per day, opened_at → run-out date for reorder reminders.
create table if not exists public.supplement_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_name text not null,
  pills_per_bottle int not null default 60,
  dose_per_day numeric not null default 1,
  opened_at date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, supplement_name)
);

create index if not exists supplement_inventory_user_id on public.supplement_inventory(user_id);

alter table public.supplement_inventory enable row level security;

create policy "Users can read own supplement_inventory"
  on public.supplement_inventory for select
  using (auth.uid() = user_id);

create policy "Users can insert own supplement_inventory"
  on public.supplement_inventory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own supplement_inventory"
  on public.supplement_inventory for update
  using (auth.uid() = user_id);

create policy "Users can delete own supplement_inventory"
  on public.supplement_inventory for delete
  using (auth.uid() = user_id);

-- Notify user when to reorder (email / in-app; SMS optional later).
alter table public.profiles
  add column if not exists notify_reorder_email boolean default true;
alter table public.profiles
  add column if not exists notify_reorder_days int default 7;
