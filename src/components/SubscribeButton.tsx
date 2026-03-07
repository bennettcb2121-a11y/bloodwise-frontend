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
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || "Something went wrong")
        return
      }
      if (data.url) window.location.href = data.url
    } catch (e) {
      alert("Failed to start checkout")
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
