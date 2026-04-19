"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { getSubscription, loadSavedState } from "@/src/lib/bloodwiseDb"
import {
  hasActiveStripeSubscription,
  hasClarionAnalysisAccess,
  isDevPaywallBypass,
} from "@/src/lib/accessGate"
import { getLitePriceDisplayDollars } from "@/src/lib/analysisPricing"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { SupportContactHint } from "@/src/components/SupportContactHints"
import { PricingTiers } from "@/src/components/PricingTiers"
import { ComplianceFooter } from "@/src/components/ComplianceFooter"

export default function PaywallPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [liteCheckoutLoading, setLiteCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liteError, setLiteError] = useState<string | null>(null)
  const [unlockCode, setUnlockCode] = useState("")
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  /** loading = checking access; subscribed = recurring Clarion access; paywall = needs purchase */
  const [accessView, setAccessView] = useState<"loading" | "subscribed" | "paywall" | "redirect">("loading")
  /** Optional ?showLite=1 query param surfaces the legacy Clarion Lite compare/CTA for testing. */
  const [showLite, setShowLite] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setShowLite(new URLSearchParams(window.location.search).get("showLite") === "1")
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  const litePrice = getLitePriceDisplayDollars()

  // In dev: only skip paywall when NEXT_PUBLIC_DEV_SKIP_PAYWALL=1 (unless ?noRedirect=1 forces paywall for testing).
  useEffect(() => {
    if (
      isDevPaywallBypass() &&
      typeof window !== "undefined" &&
      !window.location.search.includes("noRedirect=1")
    ) {
      router.replace("/")
      return
    }
    if (!user?.id) return
    setAccessView("loading")
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        if (!hasClarionAnalysisAccess(p, sub, b)) {
          setAccessView("paywall")
          return
        }
        const subRow = sub
        const tier = ((p as ProfileRow | null)?.plan_tier ?? "").toLowerCase()
        const tierSynced = tier === "full" || tier === "lite"
        if (hasActiveStripeSubscription(subRow) || tierSynced) {
          setAccessView("subscribed")
          return
        }
        setAccessView("redirect")
        router.replace("/dashboard")
      })
      .catch(() => setAccessView("paywall"))
  }, [user?.id, router])

  async function handleLiteCheckout() {
    setError(null)
    setLiteError(null)
    setLiteCheckoutLoading(true)
    try {
      const res = await fetch("/api/create-lite-checkout", {
        method: "POST",
        credentials: "include",
      })
      const text = await res.text()
      let data: { url?: string; error?: string } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        const msg = res.ok ? "Invalid response from server" : `Checkout failed (${res.status})`
        setLiteError(msg)
        return
      }
      if (!res.ok) throw new Error(data.error || "Clarion Lite checkout failed")
      if (data.url) window.location.href = data.url
      else throw new Error("No checkout URL returned")
    } catch (e) {
      setLiteError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLiteCheckoutLoading(false)
    }
  }

  async function handleUnlock(tier: "analysis" | "monthly" = "analysis") {
    setError(null)
    setLiteError(null)
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/create-analysis-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      const text = await res.text()
      let data: {
        url?: string
        error?: string
        skipCheckout?: boolean
        message?: string
      } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        setError(res.ok ? "Invalid response from server" : `Checkout failed (${res.status})`)
        return
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      if (data.skipCheckout && data.url) {
        window.location.href = data.url
        return
      }
      if (data.url) window.location.href = data.url
      else throw new Error("No checkout URL returned")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault()
    setRedeemError(null)
    setRedeemSuccess(false)
    if (!unlockCode.trim()) return
    setRedeemLoading(true)
    try {
      const res = await fetch("/api/redeem-unlock-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlockCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Redeem failed")
      setRedeemSuccess(true)
      setUnlockCode("")
      setTimeout(() => router.push("/dashboard"), 3000)
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setRedeemLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <main className="paywall-shell clarion-loading-wrap" role="status" aria-live="polite" aria-label="Loading">
        <div className="paywall-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p className="paywall-loading">Loading…</p>
        </div>
        <style jsx>{paywallStyles}</style>
      </main>
    )
  }

  if (accessView === "loading" || accessView === "redirect") {
    return (
      <main className="paywall-shell clarion-loading-wrap" role="status" aria-live="polite" aria-label="Loading">
        <div className="paywall-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p className="paywall-loading">{accessView === "redirect" ? "Taking you to your dashboard…" : "Loading…"}</p>
        </div>
        <style jsx>{paywallStyles}</style>
      </main>
    )
  }

  if (accessView === "subscribed") {
    return (
      <main className="paywall-shell">
        <div className="paywall-container">
          <ClarionLabsLogo variant="page" href="/dashboard" linkClassName="paywall-logo-root" />
          <p className="paywall-tagline">The bloodwork coach that explains your numbers and your next steps.</p>
          <h1 className="paywall-title">You&apos;re already subscribed</h1>
          <p className="paywall-subtitle paywall-subtitle--subscribed">
            Your Clarion subscription is active. You already have full access—you don&apos;t need to pay again.
          </p>
          <Link href="/dashboard" className="paywall-cta paywall-cta--subscribed">
            Go to dashboard
          </Link>
          <p className="paywall-back" style={{ marginTop: 24 }}>
            <Link href="/settings">Manage billing in Settings</Link>
          </p>
        </div>
        <style jsx>{paywallStyles}</style>
      </main>
    )
  }

  return (
    <main className="paywall-shell">
      <div className="paywall-container paywall-container--wide">
        <ClarionLabsLogo variant="page" href="/dashboard" linkClassName="paywall-logo-root" />
        <p className="paywall-tagline">The bloodwork coach that explains your numbers and your next steps.</p>
        <h1 className="paywall-title">Pick the level that fits you</h1>
        <p className="paywall-subtitle">
          Start free with the Clarion survey. Add a one-time analysis when you have labs. Go monthly when you want Clarion to run your stack.
        </p>
        <p className="paywall-differentiator">We don&apos;t sell labs—we help you use the ones you have.</p>

        <PricingTiers
          variant="paywall"
          onTier1Click={() => router.push("/?step=survey")}
          onTier2Click={() => handleUnlock("analysis")}
          onTier3Click={() => handleUnlock("monthly")}
          tier2Loading={checkoutLoading}
          tier3Loading={checkoutLoading}
        />

        {error && (
          <>
            <p className="paywall-error">{error}</p>
            <SupportContactHint />
          </>
        )}
        <p className="paywall-stripe-hint">At Stripe checkout you can also enter a promotion code if you have one.</p>

        {showLite && (
          <div className="paywall-compare-wrap" aria-label="Clarion Lite (legacy)">
            <p className="paywall-compare-title">Clarion Lite — symptom-only plan</p>
            <p className="paywall-lite-footnote" role="note">
              Clarion Lite is education and habit support based on how you feel and your goals—not a substitute for labs or
              medical care. It does not interpret your bloodwork.
            </p>
            <div className="paywall-lite-row">
              <div className="paywall-lite-price">
                <span className="paywall-lite-amount">${litePrice}</span>
                <span className="paywall-lite-period">/ month</span>
              </div>
              <button
                type="button"
                className="paywall-lite-cta"
                onClick={handleLiteCheckout}
                disabled={liteCheckoutLoading}
              >
                {liteCheckoutLoading ? "Taking you to checkout…" : "Subscribe to Clarion Lite"}
              </button>
            </div>
            {liteError && (
              <>
                <p className="paywall-error paywall-error--lite">{liteError}</p>
                <SupportContactHint />
              </>
            )}
          </div>
        )}
        <ComplianceFooter variant="footer" />

        <div className="paywall-code-wrap">
          <p className="paywall-code-label">Have a free Clarion unlock code?</p>
          <form onSubmit={handleRedeemCode} className="paywall-code-form">
            <input
              type="text"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              placeholder="Enter code"
              className="paywall-code-input"
              disabled={redeemLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              className="paywall-code-btn"
              disabled={redeemLoading || !unlockCode.trim()}
            >
              {redeemLoading ? "Redeeming…" : "Redeem"}
            </button>
          </form>
          {redeemError && (
            <>
              <p className="paywall-error">{redeemError}</p>
              <SupportContactHint />
            </>
          )}
          {redeemSuccess && (
            <p className="paywall-success">
              Code applied. <Link href="/dashboard" className="paywall-go-now">Go to dashboard now</Link> or we’ll take you there in a few seconds.
            </p>
          )}
        </div>
        <p className="paywall-back">
          <Link href="/login">← Back to sign in</Link>
        </p>
      </div>
      <style jsx>{paywallStyles}</style>
    </main>
  )
}

const paywallStyles = `
  .paywall-shell {
    min-height: 100vh;
    background: var(--color-bg);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
  }
  .paywall-shell::before {
    content: "";
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at 50% 30%, rgba(31, 111, 91, 0.12), transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  .paywall-container {
    position: relative;
    z-index: 1;
    max-width: 520px;
    width: 100%;
    text-align: center;
  }
  .paywall-container--wide {
    max-width: 1040px;
  }
  .paywall-compare-wrap {
    margin-bottom: 28px;
    text-align: left;
    padding: 18px 18px 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
  }
  .paywall-compare-title {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    text-align: center;
  }
  .paywall-compare {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    color: var(--color-text-secondary);
  }
  .paywall-compare th,
  .paywall-compare td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    text-align: center;
  }
  .paywall-compare thead th {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-primary);
    border-bottom: 2px solid var(--color-border-strong);
  }
  .paywall-compare tbody th[scope="row"] {
    text-align: left;
    font-weight: 500;
    color: var(--color-text-primary);
  }
  .paywall-compare-corner {
    width: 36%;
  }
  .paywall-lite-footnote {
    margin: 14px 0 16px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--color-text-muted);
  }
  .paywall-lite-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .paywall-lite-price {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .paywall-lite-amount {
    font-size: 26px;
    font-weight: 800;
    color: var(--color-text-primary);
  }
  .paywall-lite-period {
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .paywall-lite-cta {
    padding: 12px 18px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border-strong);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .paywall-lite-cta:hover:not(:disabled) {
    background: var(--clarion-card-hover-bg);
  }
  .paywall-lite-cta:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }
  .paywall-full-label {
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .paywall-logo-root {
    display: inline-flex;
    margin-bottom: 28px;
    text-decoration: none;
    color: inherit;
  }
  .paywall-logo-root:hover .clarion-labs-logo-name {
    opacity: 0.9;
  }
  .paywall-tagline {
    font-size: 15px;
    color: var(--color-accent);
    font-weight: 600;
    margin: 0 0 12px;
    line-height: 1.4;
  }
  .paywall-differentiator {
    font-size: 15px;
    color: var(--color-text-secondary);
    margin: 0 0 16px;
    font-style: italic;
  }
  .paywall-how-different {
    margin-bottom: 24px;
    padding: 14px 18px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    text-align: left;
  }
  .paywall-how-different-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    display: block;
    margin-bottom: 8px;
  }
  .paywall-how-different ul {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.7;
  }
  .paywall-how-different li::before {
    content: "• ";
    color: var(--color-accent);
    font-weight: 700;
  }
  .paywall-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
    margin: 0 0 8px;
  }
  .paywall-subtitle {
    font-size: 16px;
    color: var(--color-text-secondary);
    margin: 0 0 28px;
    line-height: 1.5;
  }
  .paywall-subtitle--subscribed {
    max-width: 440px;
    margin-left: auto;
    margin-right: auto;
  }
  .paywall-card {
    background: var(--clarion-card-bg);
    border: 1px solid var(--clarion-card-border);
    border-radius: var(--clarion-card-radius, 14px);
    padding: 28px 24px;
    box-shadow: var(--shadow-sm);
  }
  .paywall-price {
    margin-bottom: 20px;
  }
  .paywall-amount {
    font-size: 40px;
    font-weight: 800;
    color: var(--color-text-primary);
  }
  .paywall-period {
    display: block;
    font-size: 14px;
    color: var(--color-text-muted);
  }
  .paywall-subline {
    display: block;
    margin-top: 10px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--color-text-secondary);
  }
  .paywall-features {
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
    text-align: left;
    font-size: 15px;
    color: var(--color-text-secondary);
    line-height: 1.8;
  }
  .paywall-features li::before {
    content: "✓ ";
    color: var(--color-success);
    font-weight: 700;
  }
  .paywall-cta {
    width: 100%;
    padding: 16px 30px;
    font-size: 17px;
    font-weight: 500;
    color: var(--color-accent-contrast);
    background: var(--color-accent);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .paywall-cta:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }
  .paywall-cta:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }
  .paywall-error {
    margin-top: 12px;
    font-size: 14px;
    color: var(--color-error);
  }
  .paywall-error--lite {
    margin-top: 12px;
    text-align: left;
    line-height: 1.45;
  }
  .paywall-stripe-hint {
    font-size: 13px;
    color: var(--color-text-muted);
    margin: 20px 0 0;
    line-height: 1.45;
  }
  .paywall-code-wrap {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--color-border);
    text-align: center;
    width: 100%;
  }
  .paywall-code-label {
    font-size: 14px;
    color: var(--color-text-muted);
    margin: 0 0 12px;
  }
  .paywall-code-form {
    display: flex;
    gap: 8px;
    width: 100%;
    max-width: 280px;
    margin: 0 auto 8px;
  }
  .paywall-go-now { color: var(--color-accent); font-weight: 600; text-decoration: underline; }
  .paywall-go-now:hover { color: var(--color-accent-hover); }
  .paywall-code-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 15px;
    border: 1px solid var(--color-border-strong);
    border-radius: 10px;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .paywall-code-input::placeholder { color: var(--color-text-muted); }
  .paywall-code-btn {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    cursor: pointer;
  }
  .paywall-code-btn:hover:not(:disabled) { background: var(--clarion-card-hover-bg); }
  .paywall-code-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .paywall-success { font-size: 14px; color: var(--color-success); margin-top: 8px; }
  .paywall-loading { color: var(--color-text-muted); }
  .paywall-back { margin-top: 24px; font-size: 14px; }
  .paywall-back a { color: var(--color-text-muted); text-decoration: none; }
  .paywall-back a:hover { color: var(--color-accent); }
`
