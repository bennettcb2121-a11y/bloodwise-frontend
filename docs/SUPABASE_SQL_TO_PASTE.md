# What to paste into Supabase SQL Editor (in order)

Run these **one at a time** in Supabase: **SQL Editor** → **New query** → paste the block → **Run**. Then do the next. Order matters.

---

## 1. Profiles and bloodwork tables + RLS

Paste this into the first new query, then click **Run**.

```sql
-- Bloodwise: profiles (1:1 with auth.users) and bloodwork_saves (latest + history)
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

create index if not exists bloodwork_saves_user_updated on public.bloodwork_saves(user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.bloodwork_saves enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users can read own bloodwork_saves" on public.bloodwork_saves for select using (auth.uid() = user_id);
create policy "Users can insert own bloodwork_saves" on public.bloodwork_saves for insert with check (auth.uid() = user_id);
create policy "Users can update own bloodwork_saves" on public.bloodwork_saves for update using (auth.uid() = user_id);
create policy "Users can delete own bloodwork_saves" on public.bloodwork_saves for delete using (auth.uid() = user_id);
```

---

## 2. Bloodwork: score and detected patterns

New query → paste → Run.

```sql
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS score integer;
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS detected_patterns jsonb DEFAULT '[]';
```

---

## 3. Bloodwork: key flagged biomarkers

New query → paste → Run.

```sql
ALTER TABLE public.bloodwork_saves ADD COLUMN IF NOT EXISTS key_flagged_biomarkers jsonb DEFAULT '[]';
```

---

## 4. Subscriptions table (Stripe)

New query → paste → Run.

```sql
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
```

---

## 5. Profiles: email, phone, retest weeks

New query → paste → Run.

```sql
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists retest_weeks int not null default 8;
```

---

## 6. Profiles: improvement preference, profile type, analysis_purchased_at

New query → paste → Run.

```sql
alter table public.profiles
  add column if not exists improvement_preference text default '',
  add column if not exists profile_type text default '',
  add column if not exists analysis_purchased_at timestamptz;
```

---

## 7. Unlock redemptions (free codes)

New query → paste → Run.

```sql
create table if not exists public.unlock_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create index if not exists unlock_redemptions_user_id on public.unlock_redemptions(user_id);
alter table public.unlock_redemptions enable row level security;
create policy "Users can insert own redemption" on public.unlock_redemptions for insert with check (auth.uid() = user_id);
create policy "Users can read own redemptions" on public.unlock_redemptions for select using (auth.uid() = user_id);
```

---

## 8. Results flow completed (post-payment guided flow)

New query → paste → Run.

```sql
alter table public.profiles
  add column if not exists results_flow_completed_at timestamptz;
comment on column public.profiles.results_flow_completed_at is 'Set when user completes the post-payment guided flow and clicks Go to Dashboard';
```

---

## 9. Protocol log (dashboard daily tracker sync)

New query → paste → Run.

```sql
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
```

---

## 10. User protocol purchases (paid protocols, e.g. Iron, Gut health)

New query → paste → Run.

```sql
create table if not exists public.user_protocol_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  protocol_slug text not null,
  stripe_payment_id text,
  purchased_at timestamptz not null default now(),
  unique(user_id, protocol_slug)
);

create index if not exists user_protocol_purchases_user on public.user_protocol_purchases(user_id);
alter table public.user_protocol_purchases enable row level security;
create policy "Users can read own purchases" on public.user_protocol_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own purchases" on public.user_protocol_purchases for insert with check (auth.uid() = user_id);
```

---

## 11. Profiles: height, weight, supplement form preference

New query → paste → Run.

```sql
alter table public.profiles
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists supplement_form_preference text default 'any';
comment on column public.profiles.supplement_form_preference is 'any | no_pills: when no_pills we recommend gummies, powder, drinks';
```

---

## 12. Stripe webhook idempotency (event deduplication)

New query → paste → Run. Required for production-safe `/api/webhooks/stripe` (prevents double-processing when Stripe retries).

```sql
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
```

The webhook uses the **service role**, which bypasses RLS. No policies are required for anon/authenticated users (they should not access this table).

---

## 13. `plan_tier` (Clarion Lite vs full subscription)

New query → paste → Run if you use Clarion Lite (`017_profiles_plan_tier.sql`).

```sql
alter table public.profiles
  add column if not exists plan_tier text not null default 'none';

comment on column public.profiles.plan_tier is 'Subscription tier: none | lite | full — from Stripe price (STRIPE_LITE_PRICE_ID vs Clarion+ price). Lab unlock remains analysis_purchased_at.';
```

---

## Done

After running 1–13 in order you should have:

- **profiles** (with email, phone, retest_weeks, improvement_preference, profile_type, analysis_purchased_at, results_flow_completed_at, height_cm, weight_kg, supplement_form_preference, **plan_tier**)
- **bloodwork_saves** (with score, detected_patterns, key_flagged_biomarkers)
- **subscriptions**
- **unlock_redemptions**
- **protocol_log** (daily protocol check-ins, synced across devices)
- **user_protocol_purchases** (paid protocol unlocks: iron, gut-health, etc.)
- **stripe_webhook_events** (Stripe event ids for idempotent webhooks)

If you already ran some of these before, “column already exists” or “relation already exists” is normal; you can ignore and continue with the next block.
