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
  /** Called when Tier 1 (free survey) CTA is clicked. Overrides `tier1Href` when set. */
  onTier1Click?: () => void
  /** Called when Tier 2 (one-time analysis) CTA is clicked. Overrides `tier2Href` when set. */
  onTier2Click?: () => void
  /** Called when Tier 3 (Clarion Monthly) CTA is clicked. Overrides `tier3Href` when set. */
  onTier3Click?: () => void
  tier2Loading?: boolean
  tier3Loading?: boolean
  tier1Href?: string
  tier2Href?: string
  tier3Href?: string
  /** Optional extra className on the wrapper. */
  className?: string
}

const DEFAULT_TIER1_HREF = "/login?next=%2F%3Fstep%3Dsurvey"
const DEFAULT_TIER2_HREF = "/login?next=%2Fpaywall"
const DEFAULT_TIER3_HREF = "/login?next=%2Fpaywall"

export function PricingTiers({
  variant,
  onTier1Click,
  onTier2Click,
  onTier3Click,
  tier2Loading,
  tier3Loading,
  tier1Href = DEFAULT_TIER1_HREF,
  tier2Href = DEFAULT_TIER2_HREF,
  tier3Href = DEFAULT_TIER3_HREF,
  className,
}: PricingTiersProps) {
  const analysisPrice = getAnalysisPriceDisplayDollars()
  const subPrice = getSubscriptionPriceDisplayDollars()

  const rootClass = ["pricing-tiers", `pricing-tiers--${variant}`, className].filter(Boolean).join(" ")

  return (
    <section className={rootClass} aria-label="Pricing">
      <div className="pricing-tiers-grid">
        {/* TIER 1 — Free */}
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

        {/* TIER 2 — One-time analysis */}
        <article className="pricing-tier pricing-tier--analysis">
          <div className="pricing-tier-eyebrow">One-time analysis</div>
          <h3 className="pricing-tier-headline">Your labs, read for your body</h3>
          <p className="pricing-tier-sub">
            Upload your results. Get ranges calibrated to your goals, sex, age, and training. Stop guessing what &ldquo;normal&rdquo; means for you.
          </p>
          <div className="pricing-tier-price">
            <span className="pricing-tier-amount">${analysisPrice}</span>
            <span className="pricing-tier-period">one-time</span>
          </div>
          <ul className="pricing-tier-features">
            <li>Personalized range for every marker you upload</li>
            <li>Root-cause summary across your panel</li>
            <li>Printable report you can share with your doctor</li>
          </ul>
          {onTier2Click ? (
            <button
              type="button"
              className="pricing-tier-cta"
              onClick={onTier2Click}
              disabled={Boolean(tier2Loading)}
            >
              {tier2Loading ? "Taking you to checkout…" : `Get my analysis — $${analysisPrice}`}
            </button>
          ) : (
            <Link href={tier2Href} className="pricing-tier-cta">
              Get my analysis — ${analysisPrice}
            </Link>
          )}
          <p className="pricing-tier-fine">
            One-time ${analysisPrice} analysis. Your report is yours forever. Includes 2 free months of Clarion+; $
            {subPrice} every 2 months after. Cancel anytime.
          </p>
        </article>

        {/* TIER 3 — Clarion Monthly */}
        <article className="pricing-tier pricing-tier--monthly">
          <div className="pricing-tier-badge">Most complete</div>
          <div className="pricing-tier-eyebrow">Clarion Monthly</div>
          <h3 className="pricing-tier-headline">Never run out. Never overpay.</h3>
          <p className="pricing-tier-sub">
            Track your stack daily. We watch your bottles drain and reorder before you run out — tuned to the ranges that matter for you.
          </p>
          <div className="pricing-tier-price">
            <span className="pricing-tier-amount">${subPrice}</span>
            <span className="pricing-tier-period">/ 2 months</span>
          </div>
          <ul className="pricing-tier-features">
            <li>Everything in the one-time analysis</li>
            <li>Smart supplement stack, adapted to your labs and goals</li>
            <li>Bottle-drain tracking + &ldquo;running low&rdquo; alerts</li>
            <li>Reorder with one tap (Clarion picks or your own link)</li>
            <li>New lab upload every quarter — plan evolves</li>
          </ul>
          {onTier3Click ? (
            <button
              type="button"
              className="pricing-tier-cta pricing-tier-cta--primary"
              onClick={onTier3Click}
              disabled={Boolean(tier3Loading)}
            >
              {tier3Loading ? "Taking you to checkout…" : `Start Clarion — $${subPrice} / 2 months`}
            </button>
          ) : (
            <Link href={tier3Href} className="pricing-tier-cta pricing-tier-cta--primary">
              Start Clarion — ${subPrice} / 2 months
            </Link>
          )}
          <p className="pricing-tier-fine">
            First 2 months free, then ${subPrice} every 2 months. Cancel anytime. Includes the one-time ${analysisPrice} analysis.
          </p>
        </article>
      </div>

      <style jsx>{`
        .pricing-tiers {
          width: 100%;
        }
        .pricing-tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
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
        .pricing-tier--monthly {
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
          margin-bottom: 16px;
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
