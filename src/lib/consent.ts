/**
 * Consent registry + client helpers. Every consent is versioned so that when policy text
 * changes materially, existing users are re-prompted before their next sensitive action.
 *
 * The version string is shipped in code here. Bumping the version on any consent type
 * immediately invalidates stale rows and forces re-consent — no migration needed.
 */

import { supabase } from "@/src/lib/supabase"

export type ConsentType =
  | "lab_processing"
  | "ai_processing"
  | "retention_default"
  | "health_data_privacy_v1"

/** Bump any version when the underlying disclosure text or policy changes materially. */
export const CONSENT_VERSIONS: Record<ConsentType, string> = {
  lab_processing: "2026-04-21",
  ai_processing: "2026-04-21",
  retention_default: "2026-04-21",
  health_data_privacy_v1: "2026-04-21",
}

/** Human-readable labels shown on the consent gate. */
export const CONSENT_LABELS: Record<ConsentType, { title: string; body: string }> = {
  lab_processing: {
    title: "I consent to Clarion processing my lab results",
    body:
      "Clarion will store the PDF/image I upload only long enough to extract my biomarker values, then delete the raw file. The extracted numbers are kept in my account so I can see trends and analysis.",
  },
  ai_processing: {
    title: "I consent to AI-assisted extraction and interpretation",
    body:
      "Clarion uses OpenAI to read my lab report and generate a personalized interpretation. Patient identifiers (name, DOB, MRN, address) are removed before my data is sent. OpenAI is instructed not to train on my data.",
  },
  retention_default: {
    title: "I understand retention defaults",
    body:
      "My uploaded PDF/image is deleted immediately after I confirm the extracted values. Clarion keeps only the structured biomarker values. I can delete those at any time from Settings.",
  },
  health_data_privacy_v1: {
    title: "I have read the Consumer Health Data Privacy Policy",
    body:
      "I've reviewed Clarion's separate health data privacy policy (required under Washington's My Health My Data Act).",
  },
}

export type ConsentRow = {
  id?: string
  user_id: string
  consent_type: ConsentType
  version: string
  accepted: boolean
  accepted_at?: string
  revoked_at?: string | null
  ip_hash?: string
  user_agent_hash?: string
  context?: Record<string, unknown>
}

/** Returns the consent types that are currently MISSING or STALE for this user (client-side check). */
export async function getMissingConsents(
  userId: string,
  types: ConsentType[]
): Promise<ConsentType[]> {
  if (!supabase || !userId) return types
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .eq("accepted", true)
  if (error) return types
  const activeByType = new Map<string, string>()
  for (const row of data ?? []) {
    const t = (row as { consent_type?: string }).consent_type
    const v = (row as { version?: string }).version
    if (typeof t === "string" && typeof v === "string") activeByType.set(t, v)
  }
  return types.filter((t) => activeByType.get(t) !== CONSENT_VERSIONS[t])
}

/** Record an affirmative consent. Called by ConsentGate after the user checks + submits. */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  context?: Record<string, unknown>
): Promise<void> {
  if (!supabase || !userId) throw new Error("not_authenticated")
  const payload: Partial<ConsentRow> = {
    user_id: userId,
    consent_type: consentType,
    version: CONSENT_VERSIONS[consentType],
    accepted: true,
    context: context ?? {},
  }
  const { error } = await supabase.from("user_consents").insert(payload)
  if (error) throw new Error(error.message)
}

/** Revoke an active consent (sets revoked_at). Does NOT delete the row — consent history is legal record. */
export async function revokeConsent(
  userId: string,
  consentType: ConsentType
): Promise<void> {
  if (!supabase || !userId) throw new Error("not_authenticated")
  const { error } = await supabase
    .from("user_consents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("consent_type", consentType)
    .is("revoked_at", null)
  if (error) throw new Error(error.message)
}
