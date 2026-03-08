# Clarion Labs: Website, Login & Stripe Subscription

This guide covers making Clarion Labs a live website with **Google/GitHub login** and **Stripe monthly subscription**.

---

## Quick start: Supabase + Stripe on Vercel (login, save data, pay)

You have Vercel running. Follow this order so people can log in, save data, and pay.

### Step 1: Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and **create a project** (or use an existing one).
2. Wait for it to finish provisioning, then go to **Settings** → **API**.
3. Copy:
   - **Project URL** → you’ll use this as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret; only for the Stripe webhook later)

### Step 2: Supabase database (profiles + bloodwork + subscriptions)

1. In Supabase: **SQL Editor** → **New query**.
2. Run the SQL from **`supabase/migrations/001_bloodwise_schema.sql`** (creates `profiles`, `bloodwork_saves`, RLS).
3. Run the SQL from **`supabase/migrations/004_subscriptions.sql`** (creates `subscriptions` for Stripe).

(If you use other migrations in that folder, run those too.)

### Step 3: Vercel environment variables (Supabase + app URL)

In **Vercel** → your project → **Settings** → **Environment Variables**, add:

| Name | Value | Notes |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase **Project URL** | From Step 1 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **anon public** key | From Step 1 |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your actual Vercel URL |

Redeploy (e.g. **Deployments** → … → **Redeploy**) so the new env vars are used. After this, **email sign up / log in** and **saving profile + bloodwork** will work.

### Step 4: Supabase redirect URLs (so OAuth and email links point to your app)

1. In Supabase: **Authentication** → **URL Configuration**.
2. **Site URL:** set to `https://your-app.vercel.app` (same as `NEXT_PUBLIC_APP_URL`).
3. **Redirect URLs:** add:
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

Save. Now email magic links and “Continue with Google/GitHub” will redirect back to your app correctly.

### Step 5 (optional): “Continue with Google” (or GitHub)

- **Supabase:** **Authentication** → **Providers** → enable **Google** (and **GitHub** if you want). You’ll need to paste a Client ID and Client Secret.
- **Google:** [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → **Create OAuth client ID** (Web). Set **Authorized redirect URIs** to the **Callback URL** shown in Supabase under Google provider. Copy Client ID and Secret into Supabase.
- Details are in **§2** below.

### Step 6: Stripe (monthly subscription + webhook)

1. **Stripe product:** [dashboard.stripe.com](https://dashboard.stripe.com) → **Products** → **Add product** → name it e.g. “Clarion Labs Monthly” → add a **recurring monthly** price → copy the **Price ID** (e.g. `price_...`).
2. **Stripe keys:** **Developers** → **API keys** → copy **Secret key**.
3. **Vercel env vars:** add  
   `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and (after Step 7) `STRIPE_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`.
4. **Stripe webhook:** **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** → put it in Vercel as `STRIPE_WEBHOOK_SECRET`.
5. **Service role in Vercel:** Add `SUPABASE_SERVICE_ROLE_KEY` (from Step 1) so the webhook can write to the `subscriptions` table.

Redeploy again. Users can click **Subscribe** in the app, pay via Stripe, and their subscription status is stored in Supabase.

---

## 0. Push to GitHub (if you get "repository not found")

Your folder might be pointing at a repo that doesn’t exist or a different account. Fix the remote and push:

1. **Create the repo on GitHub** (if needed): GitHub → New repository → name it `bloodwise-frontend` (or `bloodwise`) → don’t add README (you already have code).
2. **Set the correct remote** (use your real GitHub username and repo name):
   ```bash
   git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/bloodwise-frontend.git
   ```
   With username `bennettcb2121-a11y` (copy-paste):
   ```bash
   git remote set-url origin https://github.com/bennettcb2121-a11y/bloodwise-frontend.git
   ```
3. **Push:**
   ```bash
   git push -u origin main
   ```
   When prompted for password, use a [Personal Access Token](https://github.com/settings/tokens) (repo scope), not your GitHub password.

---

## 1. Deploy as a website (Vercel)

1. Push your repo to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. Set **Root Directory** to `.` and **Framework** to Next.js (auto-detected).
4. Add **Environment Variables** in the Vercel project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY` (from Stripe)
   - `STRIPE_PRICE_ID` (your monthly price ID)
   - `STRIPE_WEBHOOK_SECRET` (after creating the webhook)
   - `NEXT_PUBLIC_APP_URL` = `https://your-domain.vercel.app` (or your custom domain)
   - For webhook DB updates: `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY`
5. Deploy. Your app will be live at `https://your-project.vercel.app`.

---

## 2. Login with Google (and GitHub)

### Supabase

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers**.
2. Enable **Google** (and optionally **GitHub**).
3. For **Google**: you’ll need a **Client ID** and **Client Secret** from Google (see below). Paste them into Supabase and save.
4. Under **Authentication** → **URL Configuration**, set **Site URL** to your app URL (e.g. `https://your-app.vercel.app`) and add **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - For local dev: `http://localhost:3000/auth/callback`

### Google Cloud (for “Continue with Google”)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create project** (or pick one) → **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins**:  
   - `http://localhost:3000` (dev)  
   - `https://your-app.vercel.app` (prod)
5. **Authorized redirect URIs**:  
   - Supabase callback, e.g. `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`  
   - Find the exact URL in Supabase: **Authentication** → **Providers** → **Google** → “Callback URL”.
6. Create the OAuth client and copy **Client ID** and **Client Secret** into Supabase **Google** provider.

After this, **Continue with Google** and **Continue with GitHub** (if enabled) will work; users are redirected back to `/auth/callback` and then to your app.

---

## 3. Stripe monthly subscription

### Stripe Dashboard

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Products** → **Add product**.
2. Create a **monthly** product (e.g. “Clarion Labs Monthly”) and set a **recurring price** (monthly).
3. Copy the **Price ID** (starts with `price_...`) → use as `STRIPE_PRICE_ID` in env.

### Environment variables

- `STRIPE_SECRET_KEY` – Stripe Dashboard → **Developers** → **API keys** → **Secret key**.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – optional, for Stripe.js on the client.
- `STRIPE_PRICE_ID` – the **Price ID** of your monthly plan (e.g. `price_xxxx`).
- `NEXT_PUBLIC_APP_URL` – your app’s public URL (e.g. `https://your-app.vercel.app`).

### Webhook (so your DB stays in sync)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`.
3. Events to send:  
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the **Signing secret** (starts with `whsec_...`) → set as `STRIPE_WEBHOOK_SECRET` in env.

### Database (subscriptions table)

Run the subscription migration in Supabase so the webhook can store subscription status:

1. Supabase Dashboard → **SQL Editor**.
2. Run the SQL from `supabase/migrations/004_subscriptions.sql`.

The webhook needs to write to Supabase with elevated rights. Set one of:

- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard → **Settings** → **API** → **service_role**), or  
- `STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY` (same value; used only by the webhook).

**Never** expose the service role key to the client; use it only in the webhook API route (server-side).

---

## Summary

| Goal              | What you did |
|-------------------|--------------|
| **Live website**  | Deploy Next.js app on Vercel, set env vars. |
| **Google/GitHub login** | Enable providers in Supabase, add Google OAuth client, set redirect URLs. |
| **Monthly subscription** | Create product/price in Stripe, set `STRIPE_PRICE_ID` and `STRIPE_SECRET_KEY`, add webhook and run `004_subscriptions.sql`, set `STRIPE_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`. |

Users can sign in with Google (or GitHub), and **Subscribe** in the app sends them to Stripe Checkout; after payment, Stripe sends events to your webhook so the `subscriptions` table stays up to date.
