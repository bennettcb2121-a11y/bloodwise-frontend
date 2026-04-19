"use client"

import { getSupportEmail, getSupportMailtoHref } from "@/src/lib/supportContact"

/** Under form/auth error messages — muted, no icons. */
export function SupportContactHint() {
  return (
    <p className="clarion-support-hint">
      Still having trouble?{" "}
      <a href={getSupportMailtoHref()}>Contact support</a>
    </p>
  )
}

/** Login / auth pages — plain email, minimal. */
export function SupportAuthFooter() {
  const email = getSupportEmail()
  return (
    <p className="clarion-support-line clarion-support-line--auth">
      Having trouble?{" "}
      <a href={getSupportMailtoHref()}>{email}</a>
    </p>
  )
}
