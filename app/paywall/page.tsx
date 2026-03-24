"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState } from "@/src/lib/bloodwiseDb"
import { isDevPaywallBypass } from "@/src/lib/accessGate"
import { getAnalysisPriceDisplayDollars, getSubscriptionPriceDisplayDollars } from "@/src/lib/analysisPricing"

export default function PaywallPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unlockCode, setUnlockCode] = useState("")
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  const analysisPrice = getAnalysisPriceDisplayDollars()
  const subscriptionPrice = getSubscriptionPriceDisplayDollars()

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
    loadSavedState(user.id).then(({ profile: p }) => {
      const row = p as { analysis_purchased_at?: string | null } | null
      if (row?.analysis_purchased_at) router.replace("/")
    }).catch(() => {})
  }, [user?.id, router])

  async function handleUnlock() {
    setError(null)
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/create-analysis-checkout", { method: "POST" })
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

  return (
    <main className="paywall-shell">
      <div className="paywall-container">
        <Link href="/dashboard" className="paywall-logo">Clarion</Link>
        <p className="paywall-tagline">The bloodwork coach that explains your numbers and your next steps.</p>
        <h1 className="paywall-title">Unlock Your Full Health Plan</h1>
        <p className="paywall-subtitle">
          {`$${analysisPrice} one-time analysis, then Clarion+ at $${subscriptionPrice} every 2 months (your first 2 months of Clarion+ are included with signup). With an active subscription, new bloodwork has no extra analysis fee.`}
        </p>
        <p className="paywall-differentiator">We don&apos;t sell labs—we help you use the ones you have.</p>
        <div className="paywall-how-different">
          <span className="paywall-how-different-label">Includes</span>
          <ul>
            <li>Full biomarker analysis</li>
            <li>Personalized supplement protocol</li>
            <li>Evidence-based lifestyle recommendations</li>
            <li>Ongoing biomarker tracking</li>
          </ul>
        </div>
        <div className="paywall-card">
          <div className="paywall-price">
            <span className="paywall-amount">${analysisPrice}</span>
            <span className="paywall-period">one-time analysis fee</span>
            <span className="paywall-subline">
              {`Then Clarion+ $${subscriptionPrice} / 2 months — first 2 months included. Cancel anytime.`}
            </span>
          </div>
          <ul className="paywall-features">
            <li>Know which biomarkers to focus on first</li>
            <li>A clear 30-day plan (supplements, diet, lifestyle)</li>
            <li>Ask Clarion — ask questions in plain English about your results</li>
            <li>Savings and supplement recommendations</li>
            <li>Your dashboard to track protocol and trends</li>
            <li>Retest reminders so you stay on top</li>
            <li>Subscribers: add new labs without paying the analysis fee again</li>
          </ul>
          <button
            type="button"
            className="paywall-cta"
            onClick={handleUnlock}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? "Taking you to checkout…" : "Unlock My Health Plan"}
          </button>
          {error && <p className="paywall-error">{error}</p>}
        </div>
        <p className="paywall-stripe-hint">At Stripe checkout you can also enter a promotion code if you have one.</p>
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
          {redeemError && <p className="paywall-error">{redeemError}</p>}
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
    max-width: 440px;
    width: 100%;
    text-align: center;
  }
  .paywall-logo {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--color-text-primary);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 32px;
  }
  .paywall-logo:hover { color: var(--color-accent-hover); }
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
