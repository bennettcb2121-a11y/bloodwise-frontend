"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ShieldCheck, Lock, FileText, Brain, Check, Trash2, EyeOff } from "lucide-react"
import { useAuth } from "@/src/contexts/AuthContext"
import {
  CONSENT_LABELS,
  CONSENT_VERSIONS,
  type ConsentType,
  getMissingConsents,
  recordConsent,
} from "@/src/lib/consent"

const ICONS: Record<ConsentType, React.ReactNode> = {
  lab_processing: <FileText size={18} aria-hidden />,
  ai_processing: <Brain size={18} aria-hidden />,
  retention_default: <Lock size={18} aria-hidden />,
  health_data_privacy_v1: <ShieldCheck size={18} aria-hidden />,
}

/**
 * Small reassurance pills above the consent list. Not promises we can't keep:
 * each one ties to an actual behavior in the app (HTTPS transport, raw-file
 * deletion in /api/labs/confirm, no third-party ad pixels in the app shell).
 */
const TRUST_PILLS: Array<{ icon: React.ReactNode; label: string }> = [
  { icon: <Lock size={13} aria-hidden />, label: "Encrypted in transit" },
  { icon: <Trash2 size={13} aria-hidden />, label: "Raw file deleted after extraction" },
  { icon: <EyeOff size={13} aria-hidden />, label: "Never sold or shared" },
]

type Props = {
  /** Which consents must be captured for the gated action. */
  requiredConsents: ConsentType[]
  /** Optional context recorded with each consent (e.g. { flow: "lab_upload" }). */
  context?: Record<string, unknown>
  /** Rendered only after all required consents are confirmed. */
  children: React.ReactNode
  /** Copy above the checkboxes (component supplies a sensible default). */
  headline?: string
}

/**
 * Blocks child content until every required consent has an active, current-version row.
 * Individually unchecked; separate opt-ins (MHMDA requires affirmative, non-bundled consent).
 * Re-runs the gate when the user changes or any consent version is bumped.
 */
export function ConsentGate({ requiredConsents, context, children, headline }: Props) {
  const { user } = useAuth()
  const [checked, setChecked] = useState<Record<ConsentType, boolean>>(
    () => Object.fromEntries(requiredConsents.map((t) => [t, false])) as Record<ConsentType, boolean>
  )
  const [missing, setMissing] = useState<ConsentType[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) {
        setMissing(requiredConsents)
        return
      }
      try {
        const m = await getMissingConsents(user.id, requiredConsents)
        if (!cancelled) setMissing(m)
      } catch {
        if (!cancelled) setMissing(requiredConsents)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [user?.id, requiredConsents])

  const allChecked = useMemo(
    () => (missing ?? []).every((t) => checked[t]),
    [missing, checked]
  )

  const submit = useCallback(async () => {
    if (!user?.id || submitting) return
    if (!missing) return
    setSubmitting(true)
    setError("")
    try {
      for (const t of missing) {
        await recordConsent(user.id, t, context)
      }
      setMissing([])
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong recording consent."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }, [user?.id, missing, context, submitting])

  if (missing === null) {
    return (
      <div className="clarion-consent-gate clarion-consent-gate--loading" aria-busy="true">
        Loading privacy controls…
      </div>
    )
  }

  if (missing.length === 0) {
    return <>{children}</>
  }

  const checkedCount = missing.reduce((n, t) => n + (checked[t] ? 1 : 0), 0)
  const totalCount = missing.length
  const submitLabel = submitting
    ? "Recording consent…"
    : allChecked
      ? "Continue"
      : `Continue · ${checkedCount} of ${totalCount} checked`

  return (
    <section
      className="clarion-consent-gate"
      role="dialog"
      aria-labelledby="clarion-consent-heading"
      aria-describedby="clarion-consent-sub"
    >
      <header className="clarion-consent-gate__header">
        <span className="clarion-consent-gate__shield" aria-hidden>
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 id="clarion-consent-heading" className="clarion-consent-gate__title">
            {headline ?? "Your privacy — a few choices before you upload"}
          </h2>
          <p id="clarion-consent-sub" className="clarion-consent-gate__sub">
            Each choice below is separate. You can revoke any of them from Settings
            at any time.
          </p>
        </div>
      </header>

      <ul className="clarion-consent-gate__trust" aria-label="Clarion privacy commitments">
        {TRUST_PILLS.map((p) => (
          <li key={p.label} className="clarion-consent-gate__trust-pill">
            <span className="clarion-consent-gate__trust-icon" aria-hidden>
              {p.icon}
            </span>
            {p.label}
          </li>
        ))}
      </ul>

      <ul className="clarion-consent-gate__list">
        {missing.map((t) => {
          const label = CONSENT_LABELS[t]
          const id = `clarion-consent-${t}`
          const isChecked = !!checked[t]
          return (
            <li key={t} className="clarion-consent-gate__item">
              <label
                htmlFor={id}
                className={
                  isChecked
                    ? "clarion-consent-gate__row clarion-consent-gate__row--checked"
                    : "clarion-consent-gate__row"
                }
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [t]: e.target.checked }))
                  }
                  className="clarion-consent-gate__check"
                />
                <span className="clarion-consent-gate__icon" aria-hidden>
                  {isChecked ? <Check size={18} /> : ICONS[t]}
                </span>
                <span className="clarion-consent-gate__copy">
                  <strong>{label.title}</strong>
                  <small>{label.body}</small>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <p className="clarion-consent-gate__links">
        Read the{" "}
        <Link href="/legal/health-data-privacy" target="_blank" prefetch={false}>
          Consumer Health Data Privacy Policy
        </Link>
        {" · "}
        <Link href="/legal/privacy" target="_blank" prefetch={false}>
          Privacy Policy
        </Link>
      </p>

      {error ? (
        <p className="clarion-consent-gate__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="clarion-consent-gate__footer">
        <button
          type="button"
          className="clarion-consent-gate__submit"
          disabled={!allChecked || submitting}
          aria-disabled={!allChecked || submitting}
          onClick={() => void submit()}
        >
          {submitLabel}
        </button>
        <details className="clarion-consent-gate__details">
          <summary>Technical details</summary>
          <p className="clarion-consent-gate__details-body">
            Each opt-in is recorded as a separate row in our <code>user_consents</code>{" "}
            table with a versioned timestamp, so we have an auditable history of what
            you agreed to and when. Current versions:{" "}
            <code>
              {missing.map((t) => `${t}:${CONSENT_VERSIONS[t]}`).join(", ")}
            </code>
            . If any of these policies change, you&rsquo;ll see this screen again
            before continuing.
          </p>
        </details>
      </div>
    </section>
  )
}
