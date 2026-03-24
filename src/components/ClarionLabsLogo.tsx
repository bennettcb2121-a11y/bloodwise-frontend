"use client"

import React from "react"
import Link from "next/link"

export type ClarionLabsLogoVariant = "splash" | "header" | "hero" | "page" | "compact"

type Props = {
  variant?: ClarionLabsLogoVariant
  className?: string
  /** When set, wraps the mark in a Next.js `Link` (use for nav to home or dashboard). */
  href?: string
  /** Extra classes on the `Link` when `href` is set (e.g. `terms-logo`). */
  linkClassName?: string
}

/**
 * Brand mark: **Clarion Labs** is the primary line; **brilliantly clear** is the smaller tagline below.
 */
export function ClarionLabsLogo({
  variant = "header",
  className = "",
  href,
  linkClassName = "",
}: Props) {
  const rootClass = ["clarion-labs-logo", `clarion-labs-logo--${variant}`, className].filter(Boolean).join(" ")
  const inner = (
    <>
      <span className="clarion-labs-logo-name">
        Clarion <span className="clarion-labs-logo-labs">Labs</span>
      </span>
      <span className="clarion-labs-logo-tagline">brilliantly clear</span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={[rootClass, "clarion-labs-logo--link", linkClassName].filter(Boolean).join(" ")}>
        {inner}
      </Link>
    )
  }
  return <div className={rootClass}>{inner}</div>
}
