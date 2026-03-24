"use client"

import React from "react"
import Link from "next/link"

/** Clarion+ signup goes through the paywall ($49 analysis + subscription terms). */
export function SubscribeButton({
  className,
  children = "Subscribe",
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Link href="/paywall" className={className}>
      {children}
    </Link>
  )
}
