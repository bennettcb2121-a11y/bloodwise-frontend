# Get Clarion Labs live: login + save data + Stripe (simple steps)

Do these in order. Replace **your-vercel-app** with your real Vercel URL (e.g. `bloodwise-frontend-xyz`).

---

## Part A: Supabase (so people can sign up and save data)

### A1. Create a Supabase project

1. Open: **https://supabase.com/dashboard**
2. Click **"New project"**.
3. Pick an organization (or create one), name the project (e.g. "Clarion Labs"), set a database password and save it somewhere safe.
4. Click **"Create new project"** and wait until it says "Ready" (1–2 minutes).

### A2. Get your Supabase keys

1. In the left sidebar click **"Project Settings"** (gear icon at the bottom).
2. Click **"API"** in the left menu.
3. You’ll see:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`) — copy it.
   - **Project API keys**: copy the **anon public** key (long string under "anon public").
   - Under "Project API keys" you also see **service_role** — copy that too (you’ll use it later for Stripe; keep it secret).

### A3. Create the database tables (copy-paste SQL)

1. In the left sidebar click **"SQL Editor"**.
2. Click **"New query"**.
3. Copy the **entire block below** (from `-- Bloodwise` to the last `auth.uid() = user_id);`), paste into the editor, then click **"Run"** (or Ctrl/Cmd+Enter).

```sql
-- Profiles and bloodwork saves
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

4. Click **"New query"** again, then copy the **next block** below, paste, and **Run**:

```sql
-- Subscriptions (for Stripe later)
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

### A4. Tell Supabase your app URL (redirects)

1. In Supabase left sidebar: **Authentication** → **URL Configuration**.
2. **Site URL:** put your live app URL, e.g. `https://your-vercel-app.vercel.app` (use your real Vercel URL).
3. Under **Redirect URLs**, click **"Add URL"** and add:  
   `https://your-vercel-app.vercel.app/auth/callback`  
   (again, use your real Vercel URL).
4. Click **Save**.

### A5. Add Supabase keys to Vercel

1. Open **https://vercel.com** → your Clarion Labs project.
2. Go to **Settings** → **Environment Variables**.
3. Add three variables (click "Add" for each):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | (paste your Supabase **Project URL** from A2) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (paste the **anon public** key from A2) |
| `NEXT_PUBLIC_APP_URL` | `https://your-vercel-app.vercel.app` (your real Vercel URL) |

4. Go to **Deployments** → click the **⋯** on the latest deployment → **Redeploy**.

After this, **email sign up and login** and **saving profile + bloodwork** should work on your live site.

---

## Part B: Stripe (so people can pay)

Do this when you’re ready to take payments.

### B1. Create a product and price in Stripe

1. Open **https://dashboard.stripe.com**
2. Go to **Product catalog** → **Add product**.
3. Name: e.g. **Clarion Labs Monthly**. Add a **recurring** price (monthly), set the amount, then **Save**.
4. Open the price you just created and copy the **Price ID** (looks like `price_1ABC...`).

### B2. Get your Stripe secret key

1. In Stripe: **Developers** → **API keys**.
2. Copy the **Secret key** (starts with `sk_`). Keep it secret.

### B3. Add Stripe keys to Vercel

In Vercel → your project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|--------|
| `STRIPE_SECRET_KEY` | (paste your Stripe **Secret key** from B2) |
| `STRIPE_PRICE_ID` | (paste the **Price ID** from B1, e.g. `price_1ABC...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (paste the **service_role** key from Supabase A2 — so the webhook can save subscriptions) |

### B4. Create the Stripe webhook

1. In Stripe: **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://your-vercel-app.vercel.app/api/webhooks/stripe` (your real Vercel URL).
3. Click **Select events** and add:  
   `checkout.session.completed`  
   `customer.subscription.updated`  
   `customer.subscription.deleted`
4. Click **Add endpoint**.
5. On the new webhook page, click **Reveal** under "Signing secret" and copy it (starts with `whsec_`).
6. In Vercel → **Settings** → **Environment Variables**, add:
   - Name: `STRIPE_WEBHOOK_SECRET`  
   - Value: (paste the signing secret)

### B5. Redeploy

Vercel → **Deployments** → **⋯** on latest → **Redeploy**.

After this, the **Subscribe** button on your site will send users to Stripe Checkout, and paid subscriptions will be stored in Supabase.

---

## Checklist

- [ ] A1–A3: Supabase project + tables
- [ ] A4: Supabase Site URL + Redirect URL
- [ ] A5: Vercel env vars (Supabase + app URL) + redeploy
- [ ] B1–B2: Stripe product/price + secret key
- [ ] B3–B4: Vercel Stripe + webhook env vars
- [ ] B5: Redeploy

If something doesn’t work, double-check that every URL uses your **real** Vercel domain (no "your-vercel-app" left in).
