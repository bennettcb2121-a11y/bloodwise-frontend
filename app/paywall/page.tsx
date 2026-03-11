"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"

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

  async function handleUnlock() {
    setError(null)
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/create-analysis-checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Checkout failed")
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
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setRedeemLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <main className="paywall-shell">
        <div className="paywall-container">
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
        <h1 className="paywall-title">Unlock your Clarion Analysis</h1>
        <p className="paywall-subtitle">
          One-time $49 unlocks your full analysis, protocol, and stack. Your first 2 months of Clarion+ are free; then $29.79 every 2 months for ongoing tracking.
        </p>
        <div className="paywall-card">
          <div className="paywall-price">
            <span className="paywall-amount">$49</span>
            <span className="paywall-period">one-time · first 2 months Clarion+ free</span>
          </div>
          <ul className="paywall-features">
            <li>Personalized biomarker analysis</li>
            <li>30-day protocol (supplements, diet, lifestyle)</li>
            <li>Savings and stack recommendations</li>
            <li>Access to your dashboard</li>
            <li>Retest reminders</li>
            <li>Then $29.79 every 2 months (Clarion+)</li>
          </ul>
          <button
            type="button"
            className="paywall-cta"
            onClick={handleUnlock}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? "Redirecting to checkout…" : "Unlock for $49"}
          </button>
          {error && <p className="paywall-error">{error}</p>}
        </div>
        <div className="paywall-code-wrap">
          <p className="paywall-code-label">Have a free unlock code?</p>
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
          {redeemSuccess && <p className="paywall-success">Code applied. Taking you to your dashboard…</p>}
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
    background: linear-gradient(165deg, #1a0a2e 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f0a1a 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
  }
  .paywall-container {
    max-width: 440px;
    width: 100%;
    text-align: center;
  }
  .paywall-logo {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #fafafa;
    text-decoration: none;
    display: inline-block;
    margin-bottom: 32px;
  }
  .paywall-logo:hover { color: #f97316; }
  .paywall-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fafafa;
    margin: 0 0 8px;
  }
  .paywall-subtitle {
    font-size: 16px;
    color: rgba(255,255,255,0.65);
    margin: 0 0 28px;
    line-height: 1.5;
  }
  .paywall-card {
    background: rgba(26,26,31,0.9);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 28px 24px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  .paywall-price {
    margin-bottom: 20px;
  }
  .paywall-amount {
    font-size: 40px;
    font-weight: 800;
    color: #fafafa;
  }
  .paywall-period {
    display: block;
    font-size: 14px;
    color: rgba(255,255,255,0.5);
  }
  .paywall-features {
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
    text-align: left;
    font-size: 15px;
    color: rgba(255,255,255,0.85);
    line-height: 1.8;
  }
  .paywall-features li::before {
    content: "✓ ";
    color: #22c55e;
    font-weight: 700;
  }
  .paywall-cta {
    width: 100%;
    padding: 16px 24px;
    font-size: 17px;
    font-weight: 600;
    color: #fff;
    background: #e5484d;
    border: none;
    border-radius: 12px;
    cursor: pointer;
  }
  .paywall-cta:hover:not(:disabled) {
    background: #c73e42;
  }
  .paywall-cta:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }
  .paywall-error {
    margin-top: 12px;
    font-size: 14px;
    color: #f87171;
  }
  .paywall-code-wrap {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.08);
    text-align: center;
  }
  .paywall-code-label {
    font-size: 14px;
    color: rgba(255,255,255,0.6);
    margin: 0 0 12px;
  }
  .paywall-code-form {
    display: flex;
    gap: 8px;
    max-width: 280px;
    margin: 0 auto 8px;
  }
  .paywall-code-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 15px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    color: #fafafa;
  }
  .paywall-code-input::placeholder { color: rgba(255,255,255,0.4); }
  .paywall-code-btn {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: rgba(255,255,255,0.15);
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }
  .paywall-code-btn:hover:not(:disabled) { background: rgba(255,255,255,0.22); }
  .paywall-code-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .paywall-success { font-size: 14px; color: #22c55e; margin-top: 8px; }
  .paywall-loading { color: rgba(255,255,255,0.7); }
  .paywall-back { margin-top: 24px; font-size: 14px; }
  .paywall-back a { color: rgba(255,255,255,0.6); text-decoration: none; }
  .paywall-back a:hover { color: #f97316; }
`
