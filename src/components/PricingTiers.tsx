"use client"

import React from "react"
import Link from "next/link"
import {
  getAnalysisPriceDisplayDollars,
  getSubscriptionPriceDisplayDollars,
} from "@/src/lib/analysisPricing"

export type PricingTiersVariant = "paywall" | "marketing"

export type PricingTiersProps = {
  variant: PricingTiersVariant
  /** Called when Tier 1 (free survey) CTA is clicked. Overrides `tier1Href`. */
  onTier1Click?: () => void
  /** Called when the single paid CTA is clicked. Overrides `paidHref`. */
  onPaidClick?: () => void
  /** Loading state for the paid CTA. */
  paidLoading?: boolean
  tier1Href?: string
  paidHref?: string
  /** Optional extra className on the wrapper. */
  className?: string

  // ── Deprecated 3-tier props. Retained so existing callers (paywall,
  // OnboardingFlow) keep working — we used to have a middle "one-time
  // analysis" card, but the underlying Stripe offer is identical to the
  // monthly tier (see app/api/create-analysis-checkout/route.ts: `tier` was
  // purely a funnel-attribution tag). Collapsing removes the redundancy the
  // user flagged as "misleading" on the homepage.
  /** @deprecated use onPaidClick. */
  onTier2Click?: () => void
  /** @deprecated use onPaidClick. */
  onTier3Click?: () => void
  /** @deprecated use paidLoading. */
  tier2Loading?: boolean
  /** @deprecated use paidLoading. */
  tier3Loading?: boolean
  /** @deprecated use paidHref. */
  tier2Href?: string
  /** @deprecated use paidHref. */
  tier3Href?: string
}

const DEFAULT_TIER1_HREF = "/login?next=%2F%3Fstep%3Dsurvey"
const DEFAULT_PAID_HREF = "/login?next=%2Fpaywall"

export function PricingTiers({
  variant,
  onTier1Click,
  onPaidClick,
  paidLoading,
  tier1Href = DEFAULT_TIER1_HREF,
  paidHref,
  className,

  onTier2Click,
  onTier3Click,
  tier2Loading,
  tier3Loading,
  tier2Href,
  tier3Href,
}: PricingTiersProps) {
  const analysisPrice = getAnalysisPriceDisplayDollars()
  const subPrice = getSubscriptionPriceDisplayDollars()

  // Resolve the single paid CTA from the new-or-deprecated props. Tier 3
  // always took precedence because it was the "fuller" offer; same rule here.
  const resolvedPaidClick = onPaidClick ?? onTier3Click ?? onTier2Click
  const resolvedPaidLoading = Boolean(paidLoading ?? tier3Loading ?? tier2Loading)
  const resolvedPaidHref = paidHref ?? tier3Href ?? tier2Href ?? DEFAULT_PAID_HREF

  const rootClass = ["pricing-tiers", `pricing-tiers--${variant}`, className].filter(Boolean).join(" ")

  return (
    <section className={rootClass} aria-label="Pricing">
      <div className="pricing-tiers-grid">
        {/* TIER 1 — Free survey. No labs required. */}
        <article className="pricing-tier pricing-tier--free">
          <div className="pricing-tier-eyebrow">Free</div>
          <h3 className="pricing-tier-headline">Take the Clarion survey</h3>
          <p className="pricing-tier-sub">See how textbook lab ranges miss you.</p>
          <div className="pricing-tier-price">
            <span className="pricing-tier-amount">$0</span>
            <span className="pricing-tier-period">forever</span>
          </div>
          <ul className="pricing-tier-features">
            <li>Personalized biomarker panel suggestion</li>
            <li>Goals, sex, age, training context captured</li>
            <li>Saved to your account for later</li>
          </ul>
          {onTier1Click ? (
            <button type="button" className="pricing-tier-cta pricing-tier-cta--ghost" onClick={onTier1Click}>
              Start the survey
            </button>
          ) : (
            <Link href={tier1Href} className="pricing-tier-cta pricing-tier-cta--ghost">
              Start the survey
            </Link>
          )}
          <p className="pricing-tier-fine">No card required.</p>
        </article>

        {/* TIER 2 — Clarion+. Single paid offer. $49 today unlocks the analysis
            + 2 free months of Clarion+. After that it auto-continues at
            $29 every 2 months, or the user can cancel during the trial and
            keep the analysis forever. This was previously split into two
            cards ("one-time analysis" vs "Clarion Monthly") with the same
            underlying Stripe checkout — the split read as redundant. */}
        <article className="pricing-tier pricing-tier--paid">
          <div className="pricing-tier-badge">Most complete</div>
          <div className="pricing-tier-eyebrow">Clarion+</div>
          <h3 className="pricing-tier-headline">Your labs, read and kept on track</h3>
          <p className="pricing-tier-sub">
            Upload your results. Clarion calibrates every marker to your goals, sex, age, and training — then keeps your stack, bottles, and trends tuned to those ranges.
          </p>
          <div className="pricing-tier-price">
            <span className="pricing-tier-amount">${analysisPrice}</span>
            <span className="pricing-tier-period">today</span>
          </div>
          <p className="pricing-tier-price-note">
            Then <strong>${subPrice} every 2 months</strong> after your 2 free months. Cancel anytime — you keep your analysis report forever.
          </p>
          <ul className="pricing-tier-features">
            <li>Personalized range for every marker you upload</li>
            <li>Root-cause summary across your panel</li>
            <li>Printable report you can share with your doctor</li>
            <li>Smart supplement stack, adapted to your labs and goals</li>
            <li>Bottle-drain tracking + &ldquo;running low&rdquo; alerts</li>
            <li>Reorder with one tap (Clarion picks or your own link)</li>
            <li>New lab upload every quarter — plan evolves</li>
          </ul>
          {resolvedPaidClick ? (
            <button
              type="button"
              className="pricing-tier-cta pricing-tier-cta--primary"
              onClick={resolvedPaidClick}
              disabled={resolvedPaidLoading}
            >
              {resolvedPaidLoading ? "Taking you to checkout…" : `Start Clarion+ — $${analysisPrice} today`}
            </button>
          ) : (
            <Link href={resolvedPaidHref} className="pricing-tier-cta pricing-tier-cta--primary">
              Start Clarion+ — ${analysisPrice} today
            </Link>
          )}
          <p className="pricing-tier-fine">
            You&apos;re charged ${analysisPrice} today for the analysis. Clarion+ is free for 2 months, then ${subPrice} auto-bills every 2 months. Just want the one-time analysis? Cancel during the free trial and the report is still yours.
          </p>
        </article>
      </div>

      <style jsx>{`
        .pricing-tiers {
          width: 100%;
        }
        .pricing-tiers-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
          max-width: 820px;
          margin: 0 auto;
        }
        @media (max-width: 760px) {
          .pricing-tiers-grid {
            grid-template-columns: 1fr;
          }
        }
        .pricing-tier {
          position: relative;
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          padding: 22px 20px 20px;
          text-align: left;
          min-height: 100%;
        }
        .pricing-tier--paid {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-sm);
        }
        .pricing-tier-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .pricing-tier-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 8px;
        }
        .pricing-tier-headline {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
          margin: 0 0 8px;
          line-height: 1.25;
        }
        .pricing-tier-sub {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 18px;
        }
        .pricing-tier-price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 10px;
        }
        .pricing-tier-amount {
          font-size: 32px;
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
        }
        .pricing-tier-period {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .pricing-tier-price-note {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin: 0 0 16px;
        }
        .pricing-tier-price-note strong {
          color: var(--color-text-primary);
          font-weight: 600;
        }
        .pricing-tier-features {
          list-style: none;
          margin: 0 0 20px;
          padding: 0;
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.6;
          flex-grow: 1;
        }
        .pricing-tier-features li {
          position: relative;
          padding-left: 20px;
          margin-bottom: 6px;
        }
        .pricing-tier-features li::before {
          content: "✓";
          position: absolute;
          left: 0;
          top: 0;
          color: var(--color-success);
          font-weight: 700;
        }
        .pricing-tier-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px 18px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          border: 1px solid var(--color-border-strong);
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .pricing-tier-cta:hover:not(:disabled) {
          background: var(--clarion-card-hover-bg);
        }
        .pricing-tier-cta:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .pricing-tier-cta--ghost {
          background: transparent;
        }
        .pricing-tier-cta--primary {
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          border-color: var(--color-accent);
        }
        .pricing-tier-cta--primary:hover:not(:disabled) {
          background: var(--color-accent-hover);
          border-color: var(--color-accent-hover);
        }
        .pricing-tier-fine {
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.45;
          margin: 10px 0 0;
        }
      `}</style>
    </section>
  )
}
