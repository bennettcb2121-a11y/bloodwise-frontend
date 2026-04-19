"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/src/contexts/AuthContext"
import { getSubscription } from "@/src/lib/bloodwiseDb"
import type { SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { hasActiveStripeSubscription } from "@/src/lib/accessGate"

/** Clarion+ signup goes through the paywall ($49 analysis + subscription terms). */
export function SubscribeButton({
  className,
  children = "Subscribe",
  subscribedLabel = "Subscribed",
}: {
  className?: string
  children?: React.ReactNode
  /** Shown when Stripe subscription is active or trialing. */
  subscribedLabel?: React.ReactNode
}) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionRow | null | undefined>(undefined)

  useEffect(() => {
    if (!user?.id) {
      setSubscription(null)
      return
    }
    let cancelled = false
    getSubscription(user.id)
      .then((row) => {
        if (!cancelled) setSubscription(row)
      })
      .catch(() => {
        if (!cancelled) setSubscription(null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!user?.id) {
    return (
      <Link href="/paywall" className={className}>
        {children}
      </Link>
    )
  }

  if (subscription === undefined) {
    return (
      <Link href="/paywall" className={className} aria-busy="true">
        {children}
      </Link>
    )
  }

  if (hasActiveStripeSubscription(subscription)) {
    return (
      <span
        className={className}
        title="You already have an active Clarion subscription"
        role="status"
      >
        {subscribedLabel}
      </span>
    )
  }

  return (
    <Link href="/paywall" className={className}>
      {children}
    </Link>
  )
}
