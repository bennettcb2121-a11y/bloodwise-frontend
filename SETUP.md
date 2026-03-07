# Clarion Labs: Website, Login & Stripe Subscription

This guide covers making Clarion Labs a live website with **Google/GitHub login** and **Stripe monthly subscription**.

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
