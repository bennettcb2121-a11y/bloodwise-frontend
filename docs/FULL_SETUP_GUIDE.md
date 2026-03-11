# Clarion Labs – Full setup guide

One guide for **Google**, **Supabase**, **Stripe**, and your **app (Vercel + env)**. At the end: where to see **user data** and where you **get paid**.

---

# Part 1: Google (for “Sign in with Google”)

You need a Google Cloud project and OAuth credentials so Supabase can offer “Continue with Google”.

## 1.1 Create a Google Cloud project (if you don’t have one)

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Top bar: click the project dropdown → **New Project**.
3. Name it (e.g. “Clarion Labs”) → **Create**.

## 1.2 Configure the OAuth consent screen

1. In the left menu: **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (so any Google user can sign in) → **Create**.
3. Fill:
   - **App name**: Clarion Labs (or your app name).
   - **User support email**: your email.
   - **Developer contact**: your email.
4. **Save and Continue** through Scopes (default is fine) and Test users (skip for external).
5. **Back to Dashboard** when done.

## 1.3 Create OAuth client credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. **Application type**: **Web application**.
3. **Name**: e.g. “Clarion Web”.
4. **Authorized redirect URIs** – **Add URI** and paste your **Supabase** auth callback URL:
   - In Supabase: **Authentication** → **Providers** → **Google**. The redirect URL is shown there, or use: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
   - Example: `https://abcdefghijk.supabase.co/auth/v1/callback`
   - Replace the project ref with yours from Supabase **Settings** → **API** (it’s in the Project URL).
5. **Create** → copy the **Client ID** and **Client Secret**. Paste these into Supabase (Authentication → Providers → Google).

---

# Part 2: Supabase (database, auth, user data)

Supabase holds your app’s data and handles login (including Google).

## 2.1 Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. **New project** → pick org, name (e.g. “clarion”), database password, region.
3. Wait for the project to be ready.

## 2.2 Get your Supabase URLs and keys

1. In the project: **Settings** (gear) → **API**.
2. Note:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`) → you’ll use this as `NEXT_PUBLIC_SUPABASE_URL`.
   - **Project API keys**:
     - **anon public** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (safe in the browser).
     - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY` (secret; only in server env, never in the front end).

## 2.3 Enable Google sign-in in Supabase

1. **Authentication** → **Providers** → **Google** → **Enable**.
2. Paste the **Client ID** and **Client Secret** from Google (Part 1.3).
3. **Save**.

## 2.4 Set auth URLs (so redirects work)

1. **Authentication** → **URL Configuration**.
2. **Site URL**: your app’s public URL, e.g. `https://your-domain.com` or `https://your-project.vercel.app`.
3. **Redirect URLs**: add:
   - `https://your-domain.com/auth/callback`
   - `https://your-project.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev).
4. **Save**.

Use the **Site URL** domain when you add the redirect URI in Google (Part 1.3) if you use a custom domain; otherwise use the Vercel URL.

## 2.5 Run the database migrations

Your app expects these tables: `profiles`, `bloodwork_saves`, `subscriptions`, `unlock_redemptions`, plus extra columns on `profiles`. Run the migrations in order in the Supabase **SQL Editor**:

1. **SQL Editor** → **New query**.
2. Run each file in order (copy/paste the full contents of each file from your repo):
   - `supabase/migrations/001_bloodwise_schema.sql`
   - `supabase/migrations/002_bloodwork_score_patterns.sql`
   - `supabase/migrations/003_bloodwork_key_flagged.sql`
   - `supabase/migrations/004_subscriptions.sql`
   - `supabase/migrations/005_retest_reminders.sql`
   - `supabase/migrations/006_profiles_improvement_and_purchase.sql`
   - `supabase/migrations/007_unlock_codes.sql`
3. Click **Run** (or Execute) after each paste. “Column already exists” is usually safe if you ran parts before.

After this you have:
- **profiles** – one row per user (age, sex, goals, preferences, `analysis_purchased_at`, etc.).
- **bloodwork_saves** – saved labs and analysis (panel, inputs, step, stack, savings).
- **subscriptions** – Stripe subscription state (filled by webhook).
- **unlock_redemptions** – which free unlock codes have been used (one-time codes).

---

## ✅ "Migrations ran fine — what's next?"

1. **Supabase (finish setup)**  
   - **Settings** → **API**: copy **Project URL**, **anon** key, **service_role** key (you’ll need these in Vercel).  
   - **Authentication** → **Providers** → **Google**: Enable, add Client ID + Secret from Google (see Part 1).  
   - **Authentication** → **URL Configuration**: set **Site URL** (e.g. `https://clarionlabs.tech`) and **Redirect URLs**. You must add **both**:
     - `https://clarionlabs.tech/auth/callback` (production)
     - `http://localhost:3000/auth/callback` (local dev)
     If localhost is missing, Google sign-in on localhost will redirect to production instead of back to localhost. See `docs/LOCALHOST_GOOGLE_LOGIN.md` if that happens.

2. **Google (if using "Sign in with Google")**  
   - [Google Cloud Console](https://console.cloud.google.com) → OAuth consent screen + **Credentials** → **Create OAuth client ID** (Web application).  
   - **Authorized redirect URI**: `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback` (get the ref from Supabase **Settings** → **API** → Project URL).  
   - Copy Client ID and Secret into Supabase **Authentication** → **Providers** → **Google**.

3. **Stripe**  
   - [Stripe Dashboard](https://dashboard.stripe.com) (Live mode): **Developers** → **API keys** → copy **Secret key**.  
   - **Developers** → **Webhooks** → **Add endpoint**: URL `https://your-app.vercel.app/api/webhooks/stripe`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → copy **Signing secret**.

4. **Vercel (or .env.local)**  
   - Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.  
   - Optional: `CLARION_UNLOCK_CODES=code1,code2` for free unlock codes.  
   - Redeploy after changing env.

5. **Test**  
   - Open the app → Sign in (Google or email) → complete onboarding → paywall/lock should appear until you pay $49 or redeem a code; after that you see full analysis and dashboard.

---

# Part 3: Stripe (payments and where you get paid)

Stripe handles the $49 one-time analysis payment (and optional subscriptions). You get paid in the Stripe Dashboard (Balance → Payouts).

## 3.1 Get Stripe API keys (live)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com).
2. Turn **off** “Test mode” (top right) so you’re in **Live** mode.
3. **Developers** → **API keys**.
4. Copy:
   - **Publishable key** (starts with `pk_live_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - **Secret key** (starts with `sk_live_`) → `STRIPE_SECRET_KEY`.

## 3.2 Create the webhook (so the app knows when someone paid)

1. **Developers** → **Webhooks** → **Add endpoint** (still in Live).
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe` (or your Vercel URL).
3. **Events to send**: click **Select events** and add:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. **Add endpoint**.
5. Click the new endpoint → **Reveal** under **Signing secret** → copy it → `STRIPE_WEBHOOK_SECRET`.

## 3.3 Optional: 100% off coupon for testers

So testers can “pay” $0 at checkout and you stay in live mode:

1. **Products** → **Coupons** → **Create coupon**.
2. **Percentage off** → 100% → **Once** (or Forever).
3. **Create promotion code** from that coupon (e.g. code `CLARIONFRIENDS`).
4. Share the code; at checkout they enter it and total is $0.

## 3.4 Where you get paid (Stripe)

- **Payments**: **Home** or **Payments** in the sidebar. Every successful $49 (or subscription) charge appears here.
- **Balance**: **Balance** in the sidebar. Shows your available balance and pending payouts.
- **Payouts**: **Balance** → **Payouts**. Stripe sends money to your bank on the schedule you set (e.g. daily, weekly). You configure the bank account under **Settings** → **Business** → **Bank accounts**.

You get paid when Stripe sends a **payout** to your connected bank account. The $49 payments (and any subscription fees) show up in **Payments** first, then in **Balance**, then in **Payouts** when they’re sent.

**Summary – where you get paid:**
- **Stripe Dashboard** → **Payments**: see each charge ($49, etc.).
- **Stripe Dashboard** → **Balance**: see available and pending balance.
- **Stripe Dashboard** → **Balance** → **Payouts**: see money sent to your bank.
- **Bank account**: add under **Stripe** → **Settings** → **Business** → **Bank accounts**; payouts go there on your schedule (e.g. every 2 days).

---

# Part 4: Your app (Vercel + environment variables)

Your app runs on Vercel (or similar). All configuration is via environment variables.

## 4.1 Deploy the app

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com): **Add New** → **Project** → import the repo.
3. Deploy. Note the deployment URL (e.g. `https://clarion-xxx.vercel.app`).

## 4.2 Set environment variables (Vercel)

In the project: **Settings** → **Environment Variables**. Add these for **Production** (and **Preview** if you want):

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Required |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → anon public | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | Required for webhook + unlock-code redeem. **Keep secret.** |
| `NEXT_PUBLIC_APP_URL` | Your app URL | e.g. `https://your-domain.com` or Vercel URL. Used for Stripe redirects and emails. |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (live) | Required for checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your endpoint → Signing secret | Required for webhook |
| `STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY` | Same as `SUPABASE_SERVICE_ROLE_KEY` | Optional; if set, webhook uses this to update Supabase. Otherwise app uses `SUPABASE_SERVICE_ROLE_KEY`. |
| `CLARION_UNLOCK_CODES` | You make them up | Optional. Comma-separated one-time codes, e.g. `BETA01,FRIEND2025`. |
| `STRIPE_ANALYSIS_PRICE_ID` | Stripe Product → one-time $49 Price ID | Optional. If set, checkout uses this; otherwise the app uses inline $49. Create “Clarion Analysis” one-time $49 in Stripe to get it. |
| `STRIPE_PRICE_ID` | Stripe Product → recurring Price ID (e.g. $29.79 / 2 months) | Required for “Subscribe to Clarion+” (dashboard, charts, history). Create Clarion+ product + price in Stripe. |

**Product tiers:** (1) **$49 one-time** = unlock your analysis (score, insights, protocol, stack) on the main app. (2) **Clarion+ subscription** = access dashboard, trends, charts, history, retest reminders. Both are enforced in the app; Stripe webhook sets `analysis_purchased_at` and updates the `subscriptions` table.

Optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – Stripe publishable key (live), only if you add client-side Stripe.

Redeploy after changing env vars so they take effect.

## 4.3 Local development

Create a `.env.local` in the project root with the same variables (use the same Supabase project and Stripe live keys if you want, or Stripe test keys for local testing). Never commit `.env.local`.

---

# Part 5: Where you access user data

All app data (profiles, labs, who unlocked) lives in **Supabase**. **Stripe** holds payment and payout info.

## 5.1 Supabase – your main source of user data

In Supabase: **Table Editor**.

| Table | What’s in it |
|-------|----------------------|
| **profiles** | One row per user: age, sex, sport, goal, profile type, improvement preference, supplement spend, email, phone, retest weeks, **analysis_purchased_at** (set when they pay $49 or redeem a code). |
| **bloodwork_saves** | Saved labs: selected panel, biomarker inputs, current step, score, stack snapshot, savings snapshot, timestamps. You can see latest and history per user. |
| **subscriptions** | Stripe subscription state per user: customer ID, subscription ID, status, current period end (updated by webhook). |
| **unlock_redemptions** | Which unlock codes were used and by which user (one row per code). |

**Authentication** → **Users**: list of signed-up users (email, provider e.g. Google, created at). This is who has an account; detailed app data is in the tables above.

You can export data from the Table Editor or use SQL in the SQL Editor for reports. To see “which user is which”, join `profiles.user_id` with **Authentication** → **Users** (same `id`).

## 5.2 Stripe – payments and customers

- **Payments**: who paid, how much, when, and for which product (e.g. $49 analysis).
- **Customers**: if you create Stripe customers (e.g. for subscriptions), they appear here linked to payments.
- **Logs**: **Developers** → **Logs** for API and webhook activity.

---

# Part 6: Quick checklist

- [ ] **Google**: OAuth consent screen + Web application OAuth client + redirect URI = `https://<supabase-ref>.supabase.co/auth/v1/callback`
- [ ] **Supabase**: Project created; Google provider enabled with Client ID + Secret; URL Configuration (Site URL + Redirect URLs); all 7 migrations run; anon + service_role keys copied
- [ ] **Stripe**: Live mode; API keys (secret + optional publishable) in env; webhook added with `checkout.session.completed` (+ subscription events if needed); signing secret in env
- [ ] **Vercel**: Repo connected; env vars set; redeploy after any env change
- [ ] **Optional**: `CLARION_UNLOCK_CODES` for free one-time codes; Stripe 100% off coupon for testers

After this, sign-in (including Google), the $49 paywall, webhook updates to `profiles` and `subscriptions`, and unlock-code redemption should all work. You see **user data** in Supabase (Table Editor + Auth) and **payments / payouts** in Stripe (Payments, Balance, Payouts).
