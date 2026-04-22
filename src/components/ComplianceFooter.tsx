"use client"

import React from "react"
import Link from "next/link"

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

  /**
   * Inlined template literal because styled-jsx's build plugin only rewrites class names when it
   * sees `<style jsx>{`…`}</style>` directly — passing a module-scoped string variable silently
   * drops scoping and CSS fails to apply (this was the root cause of the paywall page rendering
   * its heading/subtitle as unstyled raw text).
   */
  const styleBlock = (
    <style jsx>{`
      .clarion-compliance-footer {
        color: var(--color-text-muted);
        font-size: 12px;
        line-height: 1.5;
        max-width: 640px;
      }
      .clarion-compliance-footer--footer {
        margin: 32px auto 0;
        padding: 16px 20px 24px;
        text-align: center;
      }
      .clarion-compliance-footer--inline {
        margin: 8px 0 0;
        max-width: 640px;
      }
      .clarion-compliance-footer__line {
        margin: 0 0 6px;
      }
      .clarion-compliance-footer__line:last-child {
        margin-bottom: 0;
      }
      .clarion-compliance-footer__links {
        margin-top: 8px;
      }
      .clarion-compliance-footer__link {
        color: var(--color-text-muted);
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .clarion-compliance-footer__link:hover {
        color: var(--color-text-secondary);
      }
    `}</style>
  )

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
        {styleBlock}
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
      {styleBlock}
    </footer>
  )
}

export default ComplianceFooter
