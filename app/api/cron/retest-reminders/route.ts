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

/**
 * GET/POST /api/cron/retest-reminders
 * Call from Vercel Cron (or manually) with CRON_SECRET in header or query.
 * Sends email (and optionally SMS) to users due for retest based on profile.retest_weeks.
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email, phone, retest_weeks")
    .not("email", "is", null)

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, message: "No profiles with email" })
  }

  const { data: saves } = await supabase
    .from("bloodwork_saves")
    .select("user_id, updated_at")

  const latestByUser: Record<string, string> = {}
  for (const row of saves || []) {
    const existing = latestByUser[row.user_id]
    if (!existing || row.updated_at > existing) {
      latestByUser[row.user_id] = row.updated_at
    }
  }

  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const due: { email: string; phone?: string; retest_weeks: number }[] = []

  for (const p of profiles) {
    const email = (p.email || "").trim()
    if (!email) continue
    const lastTest = latestByUser[p.user_id]
    if (!lastTest) continue
    const weeks = p.retest_weeks ?? 8
    const lastMs = new Date(lastTest).getTime()
    if (now - lastMs >= weeks * weekMs) {
      due.push({
        email,
        phone: (p.phone || "").trim() || undefined,
        retest_weeks: weeks,
      })
    }
  }

  let sent = 0
  const resend = getResend()
  if (resend && due.length > 0) {
    for (const u of due) {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [u.email],
        subject: "Time to retest? – Clarion Labs",
        html: `
          <p>It’s been ${u.retest_weeks}+ weeks since your last blood panel.</p>
          <p>Retesting helps you see how your habits and supplements are affecting your results.</p>
          <p><a href="${appUrl}">Add new results</a></p>
          <p>— Clarion Labs</p>
        `,
      })
      if (!error) sent++
    }
  }

  return NextResponse.json({ sent, due: due.length, message: "Retest reminders run" })
}

export async function POST(request: Request) {
  return GET(request)
}
