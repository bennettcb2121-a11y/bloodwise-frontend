import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { computeStackProductFit } from "@/src/lib/stackProductFit"
import { supplementInsightRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"
const fitRateLimiter = supplementInsightRateLimiter

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!fitRateLimiter.allow(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 })
  }

  let body: { supplementName?: string; marker?: string | null; dose?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const supplementName = typeof body.supplementName === "string" ? body.supplementName.trim() : ""
  if (!supplementName) {
    return NextResponse.json({ error: "supplementName is required" }, { status: 400 })
  }

  const marker = typeof body.marker === "string" ? body.marker.trim() : body.marker === null ? null : undefined
  const dose = typeof body.dose === "string" ? body.dose.trim() : undefined

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()
  const profile = profileRow as ProfileRow | null

  const { data: bloodwork } = await supabase
    .from("bloodwork_saves")
    .select("biomarker_inputs")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const inputs = bloodwork?.biomarker_inputs as Record<string, string | number> | undefined
  if (!inputs || Object.keys(inputs).length === 0) {
    const result = computeStackProductFit(supplementName, marker ?? null, [])
    const { fit, rationale, chipLabel, chipTone } = result
    return NextResponse.json({ fit, rationale, chipLabel, chipTone, dose: dose ?? null })
  }

  const prof = profile
    ? {
        age: profile.age,
        sex: profile.sex,
        sport: profile.sport,
        training_focus: profile.training_focus?.trim() || undefined,
      }
    : {}
  const analysisResults = analyzeBiomarkers(inputs, prof)

  const { fit, rationale, chipLabel, chipTone } = computeStackProductFit(supplementName, marker ?? null, analysisResults)

  return NextResponse.json({ fit, rationale, chipLabel, chipTone, dose: dose ?? null })
}
