/**
 * Single source for Clarion support email and mailto links (FAQ, footer, auth, dashboard).
 * Override with NEXT_PUBLIC_SUPPORT_EMAIL in env when needed.
 */

export const SUPPORT_EMAIL_DEFAULT = "support@clarionlabs.tech"

export function getSupportEmail(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPPORT_EMAIL) {
    return process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  }
  return SUPPORT_EMAIL_DEFAULT
}

const DEFAULT_MAILTO_SUBJECT = "Clarion Support Request"

export function getSupportMailtoHref(options?: { subject?: string }): string {
  const email = getSupportEmail()
  const subject = options?.subject ?? DEFAULT_MAILTO_SUBJECT
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`
}
