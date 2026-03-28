import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clarionlabs.tech"
const fromEmail = process.env.RESEND_FROM_EMAIL || "Clarion Labs <reminders@clarionlabs.tech>"

export const maxDuration = 60
export const dynamic = "force-dynamic"

function getStackNamesFromSnapshot(stackSnapshot: unknown): string[] {
  if (!stackSnapshot || typeof stackSnapshot !== "object" || !("stack" in stackSnapshot)) return []
  const stack = (stackSnapshot as { stack?: { supplementName?: string }[] }).stack
  if (!Array.isArray(stack)) return []
  return stack.map((s) => s.supplementName || "").filter(Boolean)
}

function isProtocolCompleteForStack(checks: Record<string, boolean>, stackNames: string[]): boolean {
  if (stackNames.length === 0) return false
  return stackNames.every((name) => Boolean(checks[name]))
}

/**
 * GET/POST /api/cron/daily-protocol-reminder
 * Users with profiles.daily_reminder = true receive an email if they have a stack
 * and have not completed today's protocol checkboxes yet (UTC date).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const url = new URL(request.url)
  const secret = url.searchParams.get("secret") || authHeader?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const today = new Date().toISOString().slice(0, 10)

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, email, daily_reminder")
    .eq("daily_reminder", true)
    .not("email", "is", null)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No profiles with daily_reminder" })
  }

  const resend = getResend()
  let sent = 0
  let skipped = 0

  for (const p of profiles) {
    const email = (p.email || "").trim()
    if (!email) {
      skipped++
      continue
    }

    const { data: save } = await supabase
      .from("bloodwork_saves")
      .select("stack_snapshot")
      .eq("user_id", p.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const stackNames = getStackNamesFromSnapshot(save?.stack_snapshot)
    if (stackNames.length === 0) {
      skipped++
      continue
    }

    const { data: logRow } = await supabase
      .from("protocol_log")
      .select("checks")
      .eq("user_id", p.user_id)
      .eq("log_date", today)
      .maybeSingle()

    const checks =
      logRow?.checks && typeof logRow.checks === "object" ? (logRow.checks as Record<string, boolean>) : {}
    if (isProtocolCompleteForStack(checks, stackNames)) {
      skipped++
      continue
    }

    if (!resend) {
      skipped++
      continue
    }

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Your protocol today — Clarion",
      html: `
        <p>Quick check-in: log today’s protocol on Clarion when you can.</p>
        <p>Small, consistent check-ins add up between lab panels.</p>
        <p><a href="${appUrl}/dashboard#protocol" style="display:inline-block;padding:12px 20px;background:#1F6F5B;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open dashboard</a></p>
        <p style="font-size:12px;color:#666;">You’re receiving this because daily reminders are on in Settings. Clarion is for education only; not medical advice.</p>
      `,
    })
    if (!error) sent++
    else skipped++
  }

  return NextResponse.json({ sent, skipped, checked: profiles.length, message: "Daily protocol reminders run" })
}

export async function POST(request: Request) {
  return GET(request)
}
