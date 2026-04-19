import { Resend } from "resend"

/** Shared Resend client for transactional email (cron routes, analysis report, etc.). */
export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "Clarion Labs <reminders@clarionlabs.tech>"
}

export function getAppUrlForEmail(): string {
  let origin = (process.env.NEXT_PUBLIC_APP_URL || "https://clarionlabs.tech").trim()
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) origin = `https://${origin}`
  return origin.replace(/\/$/, "")
}
