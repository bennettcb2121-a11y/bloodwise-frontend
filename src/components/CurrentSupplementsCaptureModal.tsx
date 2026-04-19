"use client"

import React, { useCallback, useEffect, useState } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Camera, Link2, ScanBarcode, Sparkles, X } from "lucide-react"
import { CurrentSupplementsEditor } from "@/src/components/CurrentSupplementsEditor"
import { StackIntakeWizardModal } from "@/src/components/StackIntakeWizardModal"
import { mergeSupplementNamesIntoSerialized } from "@/src/lib/supplementMetadata"

type Props = {
  open: boolean
  onClose: () => void
  currentSupplements: string
  onChangeSupplements: (serialized: string) => void
  /** When the capture modal opens, jump straight into link → dose → lab fit wizard. */
  initialOpenGuidedWizard?: boolean
}

/**
 * Post–bloodwork capture: what you already take, plus optional photo (AI) or barcode scan.
 */
export function CurrentSupplementsCaptureModal({
  open,
  onClose,
  currentSupplements,
  onChangeSupplements,
  initialOpenGuidedWizard = false,
}: Props) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [barcodeBusy, setBarcodeBusy] = useState(false)
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null)
  const [intakeWizardOpen, setIntakeWizardOpen] = useState(false)
  const guidedOpenOnceRef = React.useRef(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      guidedOpenOnceRef.current = false
      return
    }
    if (initialOpenGuidedWizard && !guidedOpenOnceRef.current) {
      guidedOpenOnceRef.current = true
      setIntakeWizardOpen(true)
    }
  }, [open, initialOpenGuidedWizard])

  const onPickPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      setAiError(null)
      setAiLoading(true)
      try {
        const fd = new FormData()
        fd.append("image", file)
        const res = await fetch("/api/supplements-from-image", {
          method: "POST",
          body: fd,
        })
        const data = (await res.json()) as { supplements?: string[]; error?: string }
        if (!res.ok) {
          setAiError(data.error ?? "Could not read image")
          return
        }
        const names = data.supplements ?? []
        if (names.length === 0) {
          setAiError("No supplements detected — try a clearer photo of the label, or add manually.")
          return
        }
        onChangeSupplements(mergeSupplementNamesIntoSerialized(currentSupplements, names))
        setBarcodeHint(`Added ${names.length} from photo`)
      } catch {
        setAiError("Network error — try again.")
      } finally {
        setAiLoading(false)
      }
    },
    [currentSupplements, onChangeSupplements]
  )

  const onPickBarcode = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      setBarcodeBusy(true)
      setBarcodeHint(null)
      setAiError(null)
      const url = URL.createObjectURL(file)
      try {
        const reader = new BrowserMultiFormatReader()
        const result = await reader.decodeFromImageUrl(url)
        const text = result.getText().trim()
        if (text) {
          setBarcodeHint(`Barcode: ${text} — we’ll add it as a custom entry; you can edit the name to match the product.`)
          onChangeSupplements(mergeSupplementNamesIntoSerialized(currentSupplements, [`Barcode ${text}`]))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/not found|no multiformat/i.test(msg)) {
          setAiError("Could not read a barcode from that image — try a straighter photo or use “Photo of bottles”.")
        } else {
          setAiError("Barcode scan failed — try again.")
        }
      } finally {
        URL.revokeObjectURL(url)
        setBarcodeBusy(false)
      }
    },
    [currentSupplements, onChangeSupplements]
  )

  if (!open) return null

  return (
    <div className="current-supplements-capture-root" role="presentation">
      <button type="button" className="current-supplements-capture-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="current-supplements-capture-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="current-supplements-capture-title"
      >
        <div className="current-supplements-capture-head">
          <h2 id="current-supplements-capture-title" className="current-supplements-capture-title">
            What are you already taking?
          </h2>
          <button type="button" className="current-supplements-capture-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <p className="current-supplements-capture-lead">
          Add your current supplements so we can compare with Clarion&apos;s plan, spot upgrades, and avoid duplicates. Use a photo
          for AI label reading, or scan a barcode.
        </p>

        <div className="current-supplements-capture-tools">
          <button
            type="button"
            className="current-supplements-capture-tool"
            onClick={() => setIntakeWizardOpen(true)}
          >
            <Link2 size={18} aria-hidden />
            <span>Product link + lab fit (guided)</span>
          </button>
          <label className="current-supplements-capture-tool">
            <Sparkles size={18} aria-hidden />
            <span>Photo of bottles / label</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPickPhoto} disabled={aiLoading} />
          </label>
          <label className="current-supplements-capture-tool">
            <ScanBarcode size={18} aria-hidden />
            <span>Barcode image</span>
            <input type="file" accept="image/*" className="sr-only" onChange={onPickBarcode} disabled={barcodeBusy} />
          </label>
          <span className="current-supplements-capture-tool current-supplements-capture-tool--muted">
            <Camera size={18} aria-hidden />
            <span>Camera uses your device picker — choose a live photo or library shot</span>
          </span>
        </div>
        {aiLoading ? <p className="current-supplements-capture-status">Reading labels…</p> : null}
        {barcodeBusy ? <p className="current-supplements-capture-status">Scanning barcode…</p> : null}
        {aiError ? <p className="current-supplements-capture-error">{aiError}</p> : null}
        {barcodeHint && !aiError ? <p className="current-supplements-capture-hint">{barcodeHint}</p> : null}

        <CurrentSupplementsEditor
          idPrefix="capture-supplements"
          value={currentSupplements}
          onChange={onChangeSupplements}
          className="current-supplements-capture-editor"
        />

        <div className="current-supplements-capture-actions">
          <button type="button" className="onboarding-primary-btn" onClick={onClose}>
            Continue
          </button>
        </div>

        <StackIntakeWizardModal
          open={intakeWizardOpen}
          onClose={() => setIntakeWizardOpen(false)}
          currentSupplements={currentSupplements}
          onComplete={(serialized) => {
            onChangeSupplements(serialized)
            setIntakeWizardOpen(false)
          }}
        />
      </div>

      <style jsx>{`
        .current-supplements-capture-root {
          position: fixed;
          inset: 0;
          z-index: 12000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
        }
        @media (min-width: 640px) {
          .current-supplements-capture-root {
            align-items: center;
          }
        }
        .current-supplements-capture-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: color-mix(in srgb, var(--color-text-primary) 45%, transparent);
          backdrop-filter: blur(6px);
          cursor: pointer;
        }
        .current-supplements-capture-dialog {
          position: relative;
          width: 100%;
          max-width: 520px;
          max-height: min(90vh, 720px);
          overflow: auto;
          background: var(--color-bg-elevated, var(--color-bg));
          color: var(--color-text-primary);
          border-radius: 16px;
          box-shadow: 0 24px 60px color-mix(in srgb, var(--color-text-primary) 22%, transparent);
          padding: 20px 20px 24px;
          border: 1px solid color-mix(in srgb, var(--color-text-muted) 22%, transparent);
        }
        .current-supplements-capture-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .current-supplements-capture-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.25;
        }
        .current-supplements-capture-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .current-supplements-capture-close:hover {
          background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
          color: var(--color-text-primary);
        }
        .current-supplements-capture-lead {
          margin: 0 0 14px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-secondary);
        }
        .current-supplements-capture-tools {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }
        .current-supplements-capture-tool {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px dashed color-mix(in srgb, var(--color-accent) 35%, transparent);
          background: color-mix(in srgb, var(--color-accent) 6%, transparent);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: var(--color-text-primary);
        }
        .current-supplements-capture-tool--muted {
          cursor: default;
          border-style: solid;
          border-color: color-mix(in srgb, var(--color-text-muted) 25%, transparent);
          background: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
          font-weight: 500;
          color: var(--color-text-muted);
        }
        .current-supplements-capture-status {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .current-supplements-capture-error {
          margin: 0 0 10px;
          font-size: 13px;
          color: #c45c4a;
        }
        .current-supplements-capture-hint {
          margin: 0 0 10px;
          font-size: 13px;
          color: var(--color-accent);
        }
        :global(.current-supplements-capture-editor) {
          margin-bottom: 16px;
        }
        .current-supplements-capture-actions {
          display: flex;
          justify-content: flex-end;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      `}</style>
    </div>
  )
}
