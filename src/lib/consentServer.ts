/**
 * Server-only consent verification. Called from API routes before executing any action
 * that requires affirmative consent (lab upload, AI extraction, interpretation).
 *
 * Throws ConsentError when the user is missing a required current-version consent.
 */

import { createHash } from "crypto"
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

/**
 * Hash IP + user-agent for consent records — we never store raw values.
 *
 * Uses SHA-256 with a server-side salt. The salt MUST be set in production via
 * `CONSENT_HASH_SALT` so two environments can't trivially correlate their hashes.
 * Output is a hex digest prefixed so it's obviously a hash when inspected in the DB.
 */
export function hashForConsent(value: string): string {
  const salt = process.env.CONSENT_HASH_SALT || "clarion-consent-salt-dev-only"
  const digest = createHash("sha256").update(`${salt}::${value}`).digest("hex")
  return `sha256:${digest}`
}
