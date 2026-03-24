/**
 * Display prices for paywall (must match Stripe Prices / checkout defaults).
 * Analysis: app/api/create-analysis-checkout/route.ts
 * Subscription: STRIPE_SUBSCRIPTION_PRICE_ID — recurring $29 every 2 months in Stripe.
 */

export const ANALYSIS_DEFAULT_PRICE_CENTS = 4900
/** Clarion+ subscription: first bill after trial; must match STRIPE subscription price amount. */
export const SUBSCRIPTION_DEFAULT_PRICE_CENTS = 2900
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
