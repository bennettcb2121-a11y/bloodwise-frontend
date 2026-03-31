# Stripe setup for Clarion Labs

Follow these steps in order. Use **test mode** (toggle in Stripe Dashboard) until you’re ready to go live.

---

## 1. Stripe account

- Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign in (or create an account).
- In the top-right, make sure you’re in **Test mode** (toggle says “Test mode”).

---

## 2. Create a product and price

1. In the left sidebar: **Product catalog** → **Products**.
2. Click **+ Add product**.
3. **Name:** e.g. `Clarion Labs Monthly`.
4. **Description:** optional (e.g. “Monthly access to insights and retest reminders”).
5. Under **Pricing:**
   - Choose **Recurring**.
   - Set amount (e.g. `9.99`) and currency (e.g. USD).
   - Billing period: **Monthly**.
6. Click **Save product**.
7. On the product page, open the **Pricing** section and find the price you just created.
8. Click the price row and copy the **Price ID** (starts with `price_...`).  
   **→ You’ll use this as `STRIPE_PRICE_ID` in Vercel.**

---

## 3. Get your Secret key

1. In the left sidebar: **Developers** → **API keys**.
2. Under **Standard keys**, find **Secret key**.
3. Click **Reveal** and copy it (starts with `sk_test_...` in test mode).  
   **→ You’ll use this as `STRIPE_SECRET_KEY` in Vercel.**  
   Keep it private; never commit it or expose it in the browser.

---

## 4. Add env vars in Vercel (checkout)

1. Open [Vercel Dashboard](https://vercel.com) → your **Clarion Labs** project → **Settings** → **Environment Variables**.
2. Add:

   | Name                 | Value                    | Environment   |
   |----------------------|--------------------------|---------------|
   | `STRIPE_SECRET_KEY`  | (paste Secret key)       | Production (and Preview if you want) |
   | `STRIPE_PRICE_ID`    | (paste Price ID, e.g. `price_1ABC...`) | Production (and Preview) |

3. Save. Redeploy the project so the new variables are picked up (Deployments → … on latest → Redeploy).

---

## 5. Create the webhook (so subscriptions sync to Supabase)

1. In Stripe: **Developers** → **Webhooks**.
2. Click **+ Add endpoint**.
3. **Endpoint URL:**  
   `https://YOUR_VERCEL_APP.vercel.app/api/webhooks/stripe`  
   Replace `YOUR_VERCEL_APP` with your actual Vercel project URL (e.g. `clarion-labs` or whatever your *.vercel.app domain is).
4. **Events to send:** click **Select events** and choose:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**.
6. Open the new webhook → **Signing secret** → **Reveal** and copy it (starts with `whsec_...`).  
   **→ You’ll use this as `STRIPE_WEBHOOK_SECRET` in Vercel.**

---

## 6. Add webhook env vars in Vercel

The webhook route needs to update Supabase, so it must have the Stripe signing secret and Supabase’s service role key.

1. Vercel → same project → **Settings** → **Environment Variables**.
2. Add:

   | Name                          | Value                          | Environment   |
   |-------------------------------|--------------------------------|---------------|
   | `STRIPE_WEBHOOK_SECRET`       | (paste webhook signing secret) | Production (and Preview if you test webhooks) |
   | `SUPABASE_SERVICE_ROLE_KEY`   | (from Supabase, see below)     | Production (and Preview) |

3. **Supabase service role key:**  
   Supabase Dashboard → **Project Settings** (gear) → **API** → under **Project API keys** copy the **service_role** key (secret). Paste it as `SUPABASE_SERVICE_ROLE_KEY`.  
   **Never** use this key in client-side code; it’s only for the webhook (server-side).

4. Save and **redeploy** again.

---

## 7. Subscriptions table in Supabase

The webhook writes subscription status to a `subscriptions` table. If you haven’t run the migration yet:

1. Supabase Dashboard → **SQL Editor**.
2. Run the contents of `supabase/migrations/004_subscriptions.sql` (or your full schema that creates `subscriptions`).

---

## 8. Test the flow

1. Redeploy the app on Vercel so all env vars are loaded.
2. Open your live app and sign in.
3. Click **Subscribe** (or “Subscribe — monthly”). You should be sent to Stripe Checkout.
4. In test mode, use card `4242 4242 4242 4242`, any future expiry, any CVC, any billing details.
5. Complete checkout. You should be redirected to `/dashboard?subscription=success`.
6. In Stripe: **Developers** → **Webhooks** → your endpoint → **Recent deliveries**. The last event should be `checkout.session.completed` with a 200 response.
7. In Supabase: **Table Editor** → `subscriptions`. There should be a row for your user with `stripe_subscription_id` and `status` (e.g. `active`).

If the webhook returns 4xx/5xx, check Vercel **Functions** logs for the `/api/webhooks/stripe` route; fix any missing env vars or Supabase errors.

---

## Summary of env vars

| Variable                     | Where it’s used        | Where to get it |
|-----------------------------|------------------------|-----------------|
| `STRIPE_SECRET_KEY`        | Checkout + webhook     | Stripe → Developers → API keys → Secret key |
| `STRIPE_PRICE_ID`          | Checkout (Clarion+ recurring) | Stripe → Products → your Clarion+ price → Price ID |
| `STRIPE_LITE_PRICE_ID`     | Optional: Clarion Lite checkout (`/api/create-lite-checkout`) | Separate recurring Price (lower tier); webhook sets `profiles.plan_tier` to `lite` |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | Analysis bundle webhook (Clarion+ trial) | Same as Clarion+ price if used; falls back to `STRIPE_PRICE_ID` |
| `STRIPE_WEBHOOK_SECRET`    | Webhook verification   | Stripe → Developers → Webhooks → endpoint → Signing secret |
| `SUPABASE_SERVICE_ROLE_KEY`| Webhook (writes to DB) | Supabase → Settings → API → service_role |
| `NEXT_PUBLIC_APP_URL`      | Success/cancel URLs    | Your app URL, e.g. `https://clarionlabs.vercel.app` (optional; app has a fallback) |

Once these are set and the webhook is working, Stripe is fully set up for monthly subscriptions and your app will keep the `subscriptions` table in sync.
