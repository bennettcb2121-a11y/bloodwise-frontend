import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"

/** Called when user clicks "Go to Dashboard" after completing the guided results flow. */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("profiles")
    .update({
      results_flow_completed_at: now,
      updated_at: now,
    })
    .eq("user_id", session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
