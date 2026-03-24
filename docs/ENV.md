# Environment variables (production checklist)

Set these in Vercel (or your host) project settings. Local development uses `.env.local` (not committed).

## Required for core app

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (browser) — alias `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also supported in code |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL — used in **Stripe** success/cancel URLs (API routes). For local dev use `http://localhost:3000` so checkouts return to localhost. **Google / OAuth** uses the browser’s current origin (`window.location.origin`), not this variable — you must still add `http://localhost:3000/auth/callback` (or `http://localhost:3000/**`) under Supabase → Authentication → Redirect URLs or sign-in will fall back to your production Site URL. See `docs/LOCALHOST_GOOGLE_LOGIN.md`. |

## Stripe (checkout & webhooks)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API (Checkout, session verify) |
| `STRIPE_WEBHOOK_SECRET` | Verify `/api/webhooks/stripe` signatures |
| `STRIPE_ANALYSIS_PRICE_ID` | Optional. Stripe **Price** ID for the **one-time** $49 analysis (Checkout `payment` mode). If unset, checkout uses inline `price_data` ($49). |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | **Recurring** Clarion+ price: **$29** with billing **every 2 months** in Stripe (`interval: month`, `interval_count: 2`). After a successful analysis payment, the webhook creates a subscription with **60-day trial** before the first charge. Falls back to `STRIPE_PRICE_ID` if unset. |

Ensure the Stripe webhook endpoint in the Dashboard points to your deployed `/api/webhooks/stripe` and uses the same signing secret.

**Pricing model:** Users pay **$49** once for analysis; the webhook then attaches **Clarion+** at **$29 / 2 months** with **60 days trial** (first two months free). Users who already have **active** or **trialing** subscriptions skip the analysis checkout when opening paywall (no second analysis fee for new labs).

**Webhook idempotency:** Run Supabase migration `014_stripe_webhook_events.sql` so duplicate Stripe deliveries are ignored safely. The handler records each `event.id` before processing; on failure it deletes the row so Stripe can retry.

## Sentry (errors & performance)

Optional but recommended for production. Set a DSN to enable client and server SDKs.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Enables Sentry in the browser and server (`sentry.*.config.ts`, `instrumentation.ts`). Without it, Sentry is disabled. |
| `SENTRY_ORG` | Sentry org slug — used by the Sentry webpack plugin for source maps (defaults to `_` if unset; set real values for upload). |
| `SENTRY_PROJECT` | Sentry project slug — same as above. |
| `SENTRY_AUTH_TOKEN` | (Optional) Upload source maps from CI; create in Sentry → Settings → Auth Tokens. |

## Optional features

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables **Ask Clarion** (`/api/chat`) and support chat LLM fallback. Without it, assistants return fallbacks or 503 where applicable. |
| `NEXT_PUBLIC_EVERLYWELL_AFFILIATE_URL` | Optional. When set to an `https://` Everlywell partner or affiliate link, the onboarding “Order online” step uses it for the Everlywell CTA instead of the default homepage. |
| `CLARION_UNLOCK_CODES` | Comma-separated one-time codes for **free Clarion analysis** unlock (e.g. `BETA2025,FRIEND01`). Requires `unlock_redemptions` table (see `supabase/migrations/007_unlock_codes.sql` or `docs/SUPABASE_SQL_TO_PASTE.md`). Uses **service role** to record redemptions. |
| `NEXT_PUBLIC_DEV_SKIP_PAYWALL` | Set to `1` **only in local dev** to bypass the analysis paywall (dashboard + home “paid” gates). Production: leave unset. |
| `NEXT_PUBLIC_ANALYSIS_PRICE_CENTS` | Optional. Integer cents for paywall display (e.g. `4900` for $49.00). Should match your Stripe analysis price / `create-analysis-checkout` default. |
| `NEXT_PUBLIC_SUBSCRIPTION_PRICE_CENTS` | Optional. Integer cents for Clarion+ display (e.g. `2900` for $29.00 / billing period). Should match `STRIPE_SUBSCRIPTION_PRICE_ID` amount. |

## CI / GitHub Actions

The `CI` workflow (`.github/workflows/ci.yml`) runs lint, TypeScript, unit tests, production build, and Playwright smoke tests. For the **build** step it only needs placeholder Supabase public vars (see workflow file).

Playwright in CI uses `npm run start` on port **4173** after `npm run build` so it does not collide with other processes on port 3000.

**Local E2E:** Run `npm run dev` in one terminal, then `npm run test:e2e` in another. Or run `npm run test:e2e:ci` for a full build + headless server + tests (sets `CI=true` via `cross-env`).

## Verification before launch

1. **Supabase**: Confirm RLS policies on `profiles`, `bloodwork_saves`, `user_protocol_purchases`, and any tables touched by the app. Apply migration `014_stripe_webhook_events.sql` for Stripe idempotency.
2. **Stripe**: Run a test-mode checkout for analysis unlock and a paid protocol; confirm rows update in Supabase where expected.
3. **Auth**: In Supabase → Authentication → URL Configuration, **Redirect URLs** must include production `https://<your-domain>/auth/callback` **and** local `http://localhost:3000/auth/callback` (or wildcard `http://localhost:3000/**`) so dev sign-in does not bounce to production.
