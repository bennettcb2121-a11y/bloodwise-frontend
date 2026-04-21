/**
 * Server-only consent verification. Called from API routes before executing any action
 * that requires affirmative consent (lab upload, AI extraction, interpretation).
 *
 * Throws ConsentError when the user is missing a required current-version consent.
 */

import { createClient } from "@/src/lib/supabase/server"
import { CONSENT_VERSIONS, type ConsentType } from "@/src/lib/consent"

export class ConsentError extends Error {
  missing: ConsentType[]
  constructor(missing: ConsentType[]) {
    super(`Missing required consents: ${missing.join(", ")}`)
    this.name = "ConsentError"
    this.missing = missing
  }
}

/**
 * Verifies that the current authenticated user has active, current-version consent
 * for every required type. Throws ConsentError if any are missing.
 */
export async function requireConsents(
  userId: string,
  types: ConsentType[]
): Promise<void> {
  if (types.length === 0) return
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_consents")
    .select("consent_type, version, accepted, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .eq("accepted", true)
  if (error) throw new Error(`consent_lookup_failed:${error.message}`)
  const activeByType = new Map<string, string>()
  for (const row of data ?? []) {
    const r = row as { consent_type?: string; version?: string }
    if (r.consent_type && r.version) activeByType.set(r.consent_type, r.version)
  }
  const missing = types.filter((t) => activeByType.get(t) !== CONSENT_VERSIONS[t])
  if (missing.length > 0) throw new ConsentError(missing)
}

/** Hash IP + user-agent for consent records — we never store raw values. */
export function hashForConsent(value: string): string {
  // Non-cryptographic but stable fingerprint. We deliberately keep it non-reversible
  // without wiring in a Node crypto dep in edge-safe code paths. For audit we can still
  // correlate two events from the same IP because the salt is stable.
  const salt = process.env.CONSENT_HASH_SALT || "clarion-consent-salt"
  const input = `${salt}::${value}`
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return `h_${(h >>> 0).toString(16)}`
}
