"use client"

import React, { useCallback, useState } from "react"
import { X } from "lucide-react"
import {
  parseCurrentSupplementsEntries,
  serializeCurrentSupplementsEntries,
  type CurrentSupplementEntry,
} from "@/src/lib/supplementMetadata"
import type { StackProductFit, StackProductFitChipTone } from "@/src/lib/stackProductFit"

function genClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

type Props = {
  open: boolean
  onClose: () => void
  currentSupplements: string
  onComplete: (serialized: string) => void
}

type Step = "url" | "dose" | "fit"

/**
 * Guided flow: product URL → resolve name → dose → lab fit check → save to profile JSON.
 */
export function StackIntakeWizardModal({ open, onClose, currentSupplements, onComplete }: Props) {
  const [step, setStep] = useState<Step>("url")
  const [productUrl, setProductUrl] = useState("")
  const [hintName, setHintName] = useState("")
  const [resolvedName, setResolvedName] = useState("")
  const [resolvedMarker, setResolvedMarker] = useState<string | null>(null)
  const [dose, setDose] = useState("")
  const [fit, setFit] = useState<StackProductFit | null>(null)
  const [fitChipLabel, setFitChipLabel] = useState("")
  const [fitChipTone, setFitChipTone] = useState<StackProductFitChipTone>("unmapped")
  const [rationale, setRationale] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep("url")
    setProductUrl("")
    setHintName("")
    setResolvedName("")
    setResolvedMarker(null)
    setDose("")
    setFit(null)
    setFitChipLabel("")
    setFitChipTone("unmapped")
    setRationale("")
    setErr(null)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const resolveUrl = async () => {
    const url = productUrl.trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      setErr("Enter a valid https link to your product.")
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/resolve-product-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, hintName: hintName.trim() }),
      })
      const data = (await res.json()) as { displayName?: string; marker?: string | null; error?: string }
      if (!res.ok) {
        setErr(data.error ?? "Could not read that link.")
        return
      }
      if (!data.displayName?.trim()) {
        setErr("Could not infer a product name.")
        return
      }
      setResolvedName(data.displayName.trim())
      setResolvedMarker(typeof data.marker === "string" && data.marker.trim() ? data.marker.trim() : null)
      setStep("dose")
    } catch {
      setErr("Network error — try again.")
    } finally {
      setBusy(false)
    }
  }

  const runFit = async () => {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/stack-product-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementName: resolvedName,
          marker: resolvedMarker,
          dose: dose.trim(),
        }),
      })
      const data = (await res.json()) as {
        fit?: StackProductFit
        rationale?: string
        chipLabel?: string
        chipTone?: StackProductFitChipTone
        error?: string
      }
      if (!res.ok) {
        setErr(data.error ?? "Fit check failed.")
        return
      }
      const f = data.fit ?? "unknown"
      setFit(f)
      setRationale(data.rationale ?? "")
      setFitChipLabel(data.chipLabel ?? "")
      setFitChipTone(
        data.chipTone ??
          (f === "aligned" ? "aligned" : f === "suboptimal" ? "suboptimal" : "unmapped")
      )
      setStep("fit")
    } catch {
      setErr("Network error — try again.")
    } finally {
      setBusy(false)
    }
  }

  const appendEntry = (opts: { userChoseKeepProduct: boolean }) => {
    const entries = parseCurrentSupplementsEntries(currentSupplements)
    const entry: CurrentSupplementEntry = {
      clientId: genClientId(),
      name: resolvedName,
      productUrl: productUrl.trim(),
      ...(dose.trim() ? { dose: dose.trim() } : {}),
      ...(fit ? { fitStatus: fit } : {}),
      ...(opts.userChoseKeepProduct ? { userChoseKeepProduct: true } : {}),
    }
    entries.push(entry)
    onComplete(serializeCurrentSupplementsEntries(entries))
    handleClose()
  }

  if (!open) return null

  return (
    <div className="current-supplements-capture-root" role="presentation">
      <button type="button" className="current-supplements-capture-backdrop" aria-label="Close" onClick={handleClose} />
      <div
        className="current-supplements-capture-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stack-intake-wizard-title"
      >
        <div className="current-supplements-capture-head">
          <h2 id="stack-intake-wizard-title" className="current-supplements-capture-title">
            Add product with lab fit check
          </h2>
          <button type="button" className="current-supplements-capture-close" onClick={handleClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {step === "url" ? (
          <>
            <p className="current-supplements-capture-lede">
              Paste a link to the exact supplement you take (e.g. Amazon). We&apos;ll name it, then ask how much you take and compare it to your lab picture — for education only, not medical advice.
            </p>
            <label className="stack-intake-field">
              <span>Product URL</span>
              <input
                type="url"
                className="settings-input"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
            </label>
            <label className="stack-intake-field">
              <span>Hint (optional)</span>
              <input
                type="text"
                className="settings-input"
                value={hintName}
                onChange={(e) => setHintName(e.target.value)}
                placeholder="e.g. iron liquid"
                autoComplete="off"
              />
            </label>
            {err ? <p className="current-supplements-capture-error">{err}</p> : null}
            <div className="stack-intake-actions">
              <button type="button" className="onboarding-primary-btn" onClick={() => void resolveUrl()} disabled={busy}>
                {busy ? "Working…" : "Continue"}
              </button>
            </div>
          </>
        ) : null}

        {step === "dose" ? (
          <>
            <p className="current-supplements-capture-lede">
              <strong>{resolvedName}</strong>
              {resolvedMarker ? (
                <>
                  {" "}
                  <span className="text-muted">— mapped to {resolvedMarker}</span>
                </>
              ) : null}
            </p>
            <label className="stack-intake-field">
              <span>How much do you take? (dose / frequency)</span>
              <input
                type="text"
                className="settings-input"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. 5 mL daily"
                autoComplete="off"
              />
            </label>
            {err ? <p className="current-supplements-capture-error">{err}</p> : null}
            <div className="stack-intake-actions">
              <button type="button" className="onboarding-ghost-btn" onClick={() => setStep("url")}>
                Back
              </button>
              <button type="button" className="onboarding-primary-btn" onClick={() => void runFit()} disabled={busy}>
                {busy ? "Checking labs…" : "Check lab fit"}
              </button>
            </div>
          </>
        ) : null}

        {step === "fit" && fit != null ? (
          <>
            <p className="current-supplements-capture-lede">
              <strong>Fit with your labs:</strong>{" "}
              <span className={`stack-intake-fit-label stack-intake-fit-label--${fitChipTone}`}>
                {fitChipLabel || fit}
              </span>
            </p>
            <p className="stack-intake-rationale">{rationale}</p>
            <p className="dashboard-tab-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Education only — not medical advice. Your clinician and product label come first.
            </p>
            <div className="stack-intake-actions stack-intake-actions--stacked">
              {fit === "suboptimal" ? (
                <>
                  <button type="button" className="onboarding-primary-btn" onClick={() => appendEntry({ userChoseKeepProduct: false })}>
                    Add to what I take (I&apos;ll review with my clinician)
                  </button>
                  <button type="button" className="onboarding-primary-btn onboarding-primary-btn--outline" onClick={() => appendEntry({ userChoseKeepProduct: true })}>
                    Keep logging my product anyway
                  </button>
                </>
              ) : (
                <button type="button" className="onboarding-primary-btn" onClick={() => appendEntry({ userChoseKeepProduct: false })}>
                  Add to what I take
                </button>
              )}
              <button type="button" className="onboarding-ghost-btn" onClick={() => setStep("dose")}>
                Back
              </button>
            </div>
          </>
        ) : null}

        <style jsx>{`
          .stack-intake-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }
          .stack-intake-field input {
            font-weight: 400;
          }
          .stack-intake-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            margin-top: 8px;
          }
          .stack-intake-actions--stacked {
            flex-direction: column;
            align-items: stretch;
          }
          .stack-intake-rationale {
            margin: 0 0 8px;
            font-size: 14px;
            line-height: 1.5;
            color: var(--color-text-primary);
          }
          .stack-intake-fit-label {
            font-weight: 700;
          }
          .stack-intake-fit-label--aligned {
            color: var(--color-accent, #16a34a);
          }
          .stack-intake-fit-label--suboptimal {
            color: #b45309;
          }
          .stack-intake-fit-label--in_range {
            color: #15803d;
          }
          .stack-intake-fit-label--needs_context {
            color: #b45309;
          }
          .stack-intake-fit-label--unmapped {
            color: var(--color-text-muted);
          }
          .text-muted {
            color: var(--color-text-muted);
            font-weight: 400;
          }
        `}</style>
      </div>
    </div>
  )
}
