"use client"

import React from "react"
import Link from "next/link"

/**
 * Compliance footer — medical-advice disclaimer + Amazon Associates disclosure + legal links.
 * Used at the bottom of the dashboard, paywall, settings, etc.
 *
 * Styles live in `app/globals.css` under the `.clarion-compliance-footer` selectors.
 * This used to live in `<style jsx>` but the pattern (even with an inline template literal
 * assigned to a variable) wasn't reliably applying and the footer rendered as small
 * left-aligned unstyled text. Global CSS keeps it bulletproof across every page.
 */

type ComplianceFooterVariant = "footer" | "inline"

export interface ComplianceFooterProps {
  variant?: ComplianceFooterVariant
  className?: string
}

const MEDICAL_DISCLAIMER =
  "Not medical advice. Clarion is an educational tool, not a substitute for care from a licensed clinician."

const AMAZON_DISCLOSURE =
  "As an Amazon Associate, Clarion earns from qualifying purchases when you reorder supplements via our links."

export function ComplianceFooter({
  variant = "footer",
  className,
}: ComplianceFooterProps) {
  const rootClass = [
    "clarion-compliance-footer",
    `clarion-compliance-footer--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  if (variant === "inline") {
    return (
      <p className={rootClass} role="note">
        <span className="clarion-compliance-footer__text">
          {MEDICAL_DISCLAIMER} {AMAZON_DISCLOSURE}
        </span>{" "}
        <Link
          href="/legal/terms"
          className="clarion-compliance-footer__link"
        >
          Terms
        </Link>
        {" · "}
        <Link
          href="/legal/privacy"
          className="clarion-compliance-footer__link"
        >
          Privacy
        </Link>
      </p>
    )
  }

  return (
    <footer className={rootClass} role="contentinfo">
      <p className="clarion-compliance-footer__line">{MEDICAL_DISCLAIMER}</p>
      <p className="clarion-compliance-footer__line">{AMAZON_DISCLOSURE}</p>
      <p className="clarion-compliance-footer__line clarion-compliance-footer__links">
        <Link
          href="/legal/terms"
          className="clarion-compliance-footer__link"
        >
          Terms
        </Link>
        {" · "}
        <Link
          href="/legal/privacy"
          className="clarion-compliance-footer__link"
        >
          Privacy
        </Link>
      </p>
    </footer>
  )
}

export default ComplianceFooter
