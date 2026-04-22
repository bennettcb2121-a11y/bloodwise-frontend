# Stripe (live) + free codes for testing

Use **live** Stripe keys so the app is ready for real payments, while giving family and friends free access via **unlock codes** or **Stripe promo codes**. No test-mode switching.

---

## 1. Stripe live keys

1. In [Stripe Dashboard](https://dashboard.stripe.com) go to **Developers → API keys**.
2. Use **Live** (not Test) keys:
   - **Secret key** → `STRIPE_SECRET_KEY` (the publishable key isn't needed — we redirect to Stripe-hosted Checkout instead of loading Stripe.js on the client)
3. In **Developers → Webhooks** (live), add an endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`
4. In Vercel (or your host), set the same env vars for production.

The app already uses these for the $49 analysis checkout. Promo codes are enabled at checkout so testers can use a 100% off coupon (see below).

---

## 2. Option A: Stripe 100% off coupon (testers “pay” $0)

Good if you want testers to go through real Stripe checkout with no charge.

1. In Stripe Dashboard go to **Products → Coupons** (or **Coupons** in the left menu).
2. **Create coupon**:
   - **Type**: Percentage discount → **100%**
   - **Duration**: Once (one-time) or Forever (if you prefer).
   - **Name** (e.g. `Clarion Friends & Family`).
   - **ID**: optional; you’ll create a **Promotion code** from this.
3. **Create promotion code** from that coupon:
   - **Code**: e.g. `CLARIONFRIENDS` or `BETA2025` (what testers type at checkout).
   - Save.
4. Give testers:
   - The paywall link (or they click “Unlock for $49”).
   - At Stripe Checkout they enter the code; total becomes **$0** and they complete the flow.

You stay in **live** mode; no payments are processed when the code is used.

---

## 3. Option B: Unlock codes (no Stripe, one-time codes)

Testers redeem a code on the paywall and get access **without** going through Stripe. Each code can be used **once**.

### Setup

1. **Run the migration** (if not already applied):
   - In Supabase: **SQL Editor** → run the contents of `supabase/migrations/007_unlock_codes.sql`.
   - Or with Supabase CLI: `supabase db push`.

2. **Configure codes** in your env (Vercel / `.env.local`):
   ```bash
   CLARION_UNLOCK_CODES=CLARION_BETA_01,FRIEND2025,MOM_CODE
   ```
   - Comma-separated list.
   - Codes are **case-insensitive** (e.g. `friend2025` = `FRIEND2025`).
   - Each code can be redeemed **once** by any user; after that it returns “This code has already been used”.

3. **Service role key** (required for redeem API):
   - Supabase **Settings → API** → copy **service_role** (secret).
   - Set as `STRIPE_WEBHOOK_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in your env.
   - Never expose this in the browser; it’s only used in the `/api/redeem-unlock-code` route.

### Generating one-time codes for people

- **By hand**: Add new codes to `CLARION_UNLOCK_CODES` and redeploy (e.g. `FAMILY_JANE,FAMILY_JOHN`).
- **Convention**: e.g. `CLARION_FRIEND_01`, `CLARION_FRIEND_02`; give each person one code.
- After a code is redeemed it cannot be used again; add a new code to the env for the next person.

### Where testers redeem

- **Paywall**: “Have a free unlock code?” → enter code → **Redeem**.
- On success they’re redirected to the dashboard and their account is marked as having purchased the analysis (`analysis_purchased_at` set).

---

## 4. Summary

| Goal                         | Approach                                      |
|-----------------------------|-----------------------------------------------|
| Live Stripe, no real $ yet  | Use live keys + Option A (coupon) or B (codes). |
| Testers pay $0 at checkout  | Option A: create 100% off coupon + promo code. |
| Testers skip Stripe entirely| Option B: set `CLARION_UNLOCK_CODES`, run migration, use “Have a code?” on paywall. |
| One code per person         | Option B: each code in the list is one-time.   |

You can use **both**: some people use a Stripe promo code at checkout, others use an unlock code on the paywall. Both set `analysis_purchased_at` (Stripe via webhook, codes via redeem API).
