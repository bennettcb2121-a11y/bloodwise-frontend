"use client"

import React, { useState } from "react"

export function SubscribeButton({
  className,
  children = "Subscribe",
}: {
  className?: string
  children?: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST" })
      const data = res.headers.get("content-type")?.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {}
      if (!res.ok) {
        const msg = data?.error || (res.status === 500 ? "Server error: check Stripe env vars (STRIPE_SECRET_KEY, STRIPE_PRICE_ID) in Vercel." : `Error ${res.status}`)
        alert(msg)
        return
      }
      if (data.url) window.location.href = data.url
      else alert("No checkout URL returned.")
    } catch (e) {
      alert("Failed to start checkout. Check your connection and Vercel env vars (STRIPE_SECRET_KEY, STRIPE_PRICE_ID).")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "…" : children}
    </button>
  )
}
