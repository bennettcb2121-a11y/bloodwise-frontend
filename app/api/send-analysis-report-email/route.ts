import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { sendAnalysisReportEmail } from "@/src/lib/analysisReportEmail"

/**
 * POST — send the analysis report link to the signed-in user’s email (Resend).
 * Used by “Email report” on /dashboard/analysis.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const email = session.user.email?.trim()
  if (!email) {
    return NextResponse.json({ error: "No email on account" }, { status: 400 })
  }

  const result = await sendAnalysisReportEmail({ to: email })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
