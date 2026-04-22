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
} from "@/src/lib/accessGate"
import { getAnalysisPriceDisplayDollars, getLitePriceDisplayDollars } from "@/src/lib/analysisPricing"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { SupportContactHint } from "@/src/components/SupportContactHints"
import { PricingTiers } from "@/src/components/PricingTiers"
import { ComplianceFooter } from "@/src/components/ComplianceFooter"
import {
  LiveModeChargeWarning,
  wasAcknowledgedInSession,
} from "@/src/components/LiveModeChargeWarning"
import "./paywall.css"

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
  /**
   * Launch-week safety: interstitial warning that this is a real charge (Stripe was in
   * test mode during beta). `pendingCheckout` holds the handler to run after the user
   * acknowledges; we show the modal every session until we retire it.
   */
  const [pendingCheckout, setPendingCheckout] = useState<null | {
    label: string
    interval: string
    run: () => void
  }>(null)

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

  /**
   * Load the user's access state and pick which view to render.
   *
   * NOTE: we intentionally do NOT auto-bounce to `/` when `NEXT_PUBLIC_DEV_SKIP_PAYWALL=1`
   * anymore — previously, clicking "Subscribe" from the dashboard on a dev build
   * kicked the user to the homepage (which rendered the survey welcome screen for
   * fresh accounts) and made the Subscribe CTA feel broken. The dev bypass is meant
   * to grant access to paid features, not to hide the paywall itself. If you
   * actually want the paywall to feel like prod while dev bypass is on, you can
   * still visit `/paywall` directly and the normal access flow applies below.
   */
  useEffect(() => {
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

  // Actual checkout API calls. These are invoked only after the live-mode warning has
  // been acknowledged (either just now, or earlier in this session).
  async function runLiteCheckout() {
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

  async function runAnalysisCheckout(tier: "analysis" | "monthly" = "analysis") {
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

  // Entry points used by the CTA buttons. If the launch-week warning hasn't been
  // acknowledged in this tab yet, show it and queue the real handler; otherwise run
  // immediately.
  function handleLiteCheckout() {
    if (wasAcknowledgedInSession()) {
      void runLiteCheckout()
      return
    }
    setPendingCheckout({
      label: `$${litePrice}`,
      interval: "every month",
      run: () => { void runLiteCheckout() },
    })
  }

  function handleUnlock(tier: "analysis" | "monthly" = "analysis") {
    if (wasAcknowledgedInSession()) {
      void runAnalysisCheckout(tier)
      return
    }
    // The $49 one-time analysis is always the first charge, regardless of which
    // marketing CTA (Tier 2 "analysis" vs Tier 3 "monthly") the user clicked —
    // you can't reach the $29/2mo subscription without buying the $49 analysis first.
    setPendingCheckout({
      label: `$${getAnalysisPriceDisplayDollars()}`,
      interval: "one-time",
      run: () => { void runAnalysisCheckout(tier) },
    })
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
      </main>
    )
  }

  return (
    <main className="paywall-shell">
      <div className="paywall-container paywall-container--wide">
        <ClarionLabsLogo variant="page" href="/dashboard" linkClassName="paywall-logo-root" />
        <p className="paywall-tagline">The bloodwork coach that explains your numbers and your next steps.</p>
        <h1 className="paywall-title">Pick what fits you</h1>
        <p className="paywall-subtitle">
          Start free with the Clarion survey. Unlock Clarion+ when you&apos;re ready for labs — cancel during the 2-month trial if you just want the one-time analysis.
        </p>
        <p className="paywall-differentiator">We don&apos;t sell labs—we help you use the ones you have.</p>

        <PricingTiers
          variant="paywall"
          onTier1Click={() => router.push("/?step=survey")}
          onPaidClick={() => handleUnlock("monthly")}
          paidLoading={checkoutLoading}
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
          <p className="paywall-code-label">
            Have a Clarion unlock or friends-and-family code?
          </p>
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
      <LiveModeChargeWarning
        open={pendingCheckout !== null}
        amountLabel={pendingCheckout?.label ?? `$${getAnalysisPriceDisplayDollars()}`}
        interval={pendingCheckout?.interval ?? "one-time"}
        onCancel={() => setPendingCheckout(null)}
        onProceed={() => {
          const run = pendingCheckout?.run
          setPendingCheckout(null)
          run?.()
        }}
      />
    </main>
  )
}
