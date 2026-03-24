"use client"

import React, { useState } from "react"

type Props = { slug: string; title: string; priceCents: number }

export function ProtocolPaywallButton({ slug, title, priceCents }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const price = (priceCents / 100).toFixed(2)

  const handleUnlock = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/create-protocol-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) {
        setError(data.error || "Checkout could not start")
        setLoading(false)
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setError("No checkout URL returned")
    } catch {
      setError("Network error — try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="protocol-unlock-btn"
        onClick={handleUnlock}
        disabled={loading}
      >
        {loading ? "Redirecting…" : `Unlock ${title} for $${price}`}
      </button>
      {error && <p className="protocol-unlock-error">{error}</p>}
      <style jsx>{`
        .protocol-unlock-btn {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          border: none;
          border-radius: 10px;
          cursor: pointer;
        }
        .protocol-unlock-btn:hover:not(:disabled) {
          background: var(--color-accent-hover);
        }
        .protocol-unlock-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }
        .protocol-unlock-error {
          margin: 12px 0 0;
          font-size: 14px;
          color: var(--color-danger, #c62828);
          max-width: 360px;
        }
      `}</style>
    </>
  )
}
