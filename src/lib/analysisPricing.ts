/**
 * Display prices for paywall (must match Stripe Prices / checkout defaults).
 * Analysis: app/api/create-analysis-checkout/route.ts
 * Subscription: STRIPE_SUBSCRIPTION_PRICE_ID — recurring $29.79 every 2 months in Stripe.
 *
 * Defaults below mirror the live Stripe Prices exactly so the app displays
 * $49.79 / $29.79 without any env-var configuration. If you change the
 * Stripe Prices later, either update these constants or override with
 * NEXT_PUBLIC_ANALYSIS_PRICE_CENTS / NEXT_PUBLIC_SUBSCRIPTION_PRICE_CENTS.
 */

export const ANALYSIS_DEFAULT_PRICE_CENTS = 4979
/** Clarion+ subscription: first bill after trial; must match STRIPE subscription price amount. */
export const SUBSCRIPTION_DEFAULT_PRICE_CENTS = 2979
/** Clarion Lite (symptom-based plan; optional product in Stripe). */
export const LITE_DEFAULT_PRICE_CENTS = 999
/** Trial days for Clarion+ before first recurring bill (bundled with analysis signup). */
export const CLARION_SUBSCRIPTION_TRIAL_DAYS = 60

/** Display string like "49.00" for UI (paywall, marketing). */
export function getAnalysisPriceDisplayDollars(): string {
  const raw = process.env.NEXT_PUBLIC_ANALYSIS_PRICE_CENTS
  const cents =
    raw != null && raw !== "" ? Number.parseInt(String(raw), 10) : ANALYSIS_DEFAULT_PRICE_CENTS
  if (!Number.isFinite(cents) || cents < 0) return (ANALYSIS_DEFAULT_PRICE_CENTS / 100).toFixed(2)
  return (cents / 100).toFixed(2)
}

/** e.g. "29" for $29.00 / 2 months */
export function getSubscriptionPriceDisplayDollars(): string {
  const raw = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_CENTS
  const cents =
    raw != null && raw !== ""
      ? Number.parseInt(String(raw), 10)
      : SUBSCRIPTION_DEFAULT_PRICE_CENTS
  if (!Number.isFinite(cents) || cents < 0) return (SUBSCRIPTION_DEFAULT_PRICE_CENTS / 100).toFixed(2)
  return (cents / 100).toFixed(2)
}

/** e.g. "9.99" for Lite monthly — set NEXT_PUBLIC_LITE_PRICE_CENTS to match Stripe Lite Price. */
export function getLitePriceDisplayDollars(): string {
  const raw = process.env.NEXT_PUBLIC_LITE_PRICE_CENTS
  const cents =
    raw != null && raw !== "" ? Number.parseInt(String(raw), 10) : LITE_DEFAULT_PRICE_CENTS
  if (!Number.isFinite(cents) || cents < 0) return (LITE_DEFAULT_PRICE_CENTS / 100).toFixed(2)
  return (cents / 100).toFixed(2)
}
