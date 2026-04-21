"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Link2, ScanBarcode, Sparkles, X } from "lucide-react"
import { BarcodeScannerSheet } from "@/src/components/BarcodeScannerSheet"
import { CurrentSupplementsEditor } from "@/src/components/CurrentSupplementsEditor"
import { DetectedSupplementsConfirm, type PhotoDetectionBatch } from "@/src/components/DetectedSupplementsConfirm"
import { StackIntakeWizardModal } from "@/src/components/StackIntakeWizardModal"
import { WhatITakeSearchBar, type WhatITakeSearchBarHandle } from "@/src/components/WhatITakeSearchBar"
import { resizeImageFileToJpeg } from "@/src/lib/imageResize"
import {
  mergeSupplementEntriesIntoSerialized,
  parseCurrentSupplementsEntries,
} from "@/src/lib/supplementMetadata"

type Props = {
  open: boolean
  onClose: () => void
  currentSupplements: string
  onChangeSupplements: (serialized: string) => void
  /** When the capture modal opens, jump straight into link → dose → lab fit wizard. */
  initialOpenGuidedWizard?: boolean
}

function batchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function revokeBatchThumbs(batches: PhotoDetectionBatch[]) {
  for (const b of batches) {
    try {
      if (b.thumbDataUrl.startsWith("blob:")) URL.revokeObjectURL(b.thumbDataUrl)
    } catch {
      /* ignore */
    }
  }
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
  const [photoStage, setPhotoStage] = useState<"idle" | "upload" | "read" | "match">("idle")
  const [aiError, setAiError] = useState<string | null>(null)
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null)
  const [intakeWizardOpen, setIntakeWizardOpen] = useState(false)
  const [wizardInitialUrl, setWizardInitialUrl] = useState<string | undefined>(undefined)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerSeedCode, setScannerSeedCode] = useState<string | undefined>(undefined)
  /** Camera stream acquired in the same tap as "Scan barcode" so iOS Safari keeps user-gesture permission. */
  const [scannerPrimedStream, setScannerPrimedStream] = useState<MediaStream | null>(null)
  const [photoBatches, setPhotoBatches] = useState<PhotoDetectionBatch[]>([])
  const [photoConfirmOpen, setPhotoConfirmOpen] = useState(false)
  const guidedOpenOnceRef = React.useRef(false)
  const searchBarRef = useRef<WhatITakeSearchBarHandle>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const cabinetEmpty = parseCurrentSupplementsEntries(currentSupplements).length === 0

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
      setWizardInitialUrl(undefined)
      setIntakeWizardOpen(true)
    }
  }, [open, initialOpenGuidedWizard])

  useEffect(() => {
    if (open) return
    setPhotoBatches((prev) => {
      revokeBatchThumbs(prev)
      return []
    })
    setPhotoConfirmOpen(false)
  }, [open])

  const onPickPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      setAiError(null)
      setBarcodeHint(null)
      setAiLoading(true)
      setPhotoStage("upload")
      const ac = new AbortController()
      const timeoutId = window.setTimeout(() => ac.abort(), 30_000)
      try {
        const blob = await resizeImageFileToJpeg(file)
        setPhotoStage("read")
        const fd = new FormData()
        fd.append("image", blob, "bottle.jpg")
        const res = await fetch("/api/supplements-from-image", {
          method: "POST",
          body: fd,
          signal: ac.signal,
        })
        setPhotoStage("match")
        const data = (await res.json()) as {
          products?: Array<{
            name: string
            brand: string
            dose: string
            form: string
            servingsPerContainer: number | null
            confidence: number
          }>
          supplements?: string[]
          error?: string
          code?: string
        }
        if (!res.ok) {
          if (res.status === 503 || data.code === "no_openai") {
            setAiError(
              "Photo reader isn't available here — scan the barcode or paste the product link instead."
            )
            setTimeout(() => searchBarRef.current?.focusSearch(), 50)
          } else {
            setAiError(data.error ?? "Could not read image")
          }
          return
        }
        const products = data.products ?? []
        if (products.length === 0) {
          const legacy = data.supplements?.filter(Boolean) ?? []
          if (legacy.length === 0) {
            setAiError("No supplements detected — try a clearer photo of the label, or add manually.")
            return
          }
          const thumbDataUrl = URL.createObjectURL(blob)
          setPhotoBatches((prev) => [
            ...prev,
            {
              id: batchId(),
              thumbDataUrl,
              products: legacy.map((name) => ({
                name,
                brand: "",
                dose: "",
                form: "",
                servingsPerContainer: null,
                confidence: 0.6,
                selected: true,
                doseEdit: "",
              })),
            },
          ])
          setPhotoConfirmOpen(true)
          return
        }

        const thumbDataUrl = URL.createObjectURL(blob)
        const rows = products.map((p) => ({
          name: p.name,
          brand: p.brand || "",
          dose: p.dose || "",
          form: p.form || "",
          servingsPerContainer: p.servingsPerContainer,
          confidence: Math.min(1, Math.max(0, p.confidence)),
          selected: p.confidence >= 0.5,
          doseEdit: p.dose || "",
        }))
        setPhotoBatches((prev) => [...prev, { id: batchId(), thumbDataUrl, products: rows }])
        setPhotoConfirmOpen(true)
      } catch (err: unknown) {
        const aborted = err instanceof Error && err.name === "AbortError"
        setAiError(aborted ? "Timed out — try again with a smaller photo or better connection." : "Network error — try again.")
      } finally {
        window.clearTimeout(timeoutId)
        setAiLoading(false)
        setPhotoStage("idle")
      }
    },
    []
  )

  const openLinkWizard = useCallback((url?: string) => {
    setWizardInitialUrl(url)
    setIntakeWizardOpen(true)
  }, [])

  const openScanner = useCallback((seedCode?: string) => {
    setScannerSeedCode(seedCode)
    const digits = seedCode?.replace(/\D/g, "") ?? ""
    if (digits.length >= 8) {
      setScannerPrimedStream(null)
      setScannerOpen(true)
      return
    }

    void (async () => {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
      } catch {
        /* Sheet falls back or shows camera error */
      }
      setScannerPrimedStream(stream)
      setScannerOpen(true)
    })()
  }, [])

  const commitPhotoBatches = useCallback(() => {
    const additions = photoBatches.flatMap((b) =>
      b.products
        .filter((p) => p.selected)
        .map((p) => {
          const dose = p.doseEdit.trim() || p.dose.trim()
          return { name: p.name, ...(dose ? { dose } : {}) }
        })
    )
    if (additions.length === 0) return
    onChangeSupplements(mergeSupplementEntriesIntoSerialized(currentSupplements, additions))
    revokeBatchThumbs(photoBatches)
    setPhotoBatches([])
    setPhotoConfirmOpen(false)
    setBarcodeHint("Added from your photo. Review dose and timing in your cabinet.")
  }, [currentSupplements, onChangeSupplements, photoBatches])

  const retakeLastBatch = useCallback(() => {
    let didRemove = false
    setPhotoBatches((prev) => {
      if (prev.length === 0) return prev
      didRemove = true
      const next = [...prev]
      const removed = next.pop()
      if (removed) revokeBatchThumbs([removed])
      return next
    })
    queueMicrotask(() => {
      if (didRemove) photoInputRef.current?.click()
    })
  }, [])

  const requestAnotherPhoto = useCallback(() => {
    photoInputRef.current?.click()
  }, [])

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
            What I take today
          </h2>
          <button type="button" className="current-supplements-capture-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <p className="current-supplements-capture-lead">
          Tell Clarion what&apos;s in your cabinet. We&apos;ll line it up against your labs — flag overlaps, surface gaps, and keep
          today&apos;s doses honest.
        </p>

        <WhatITakeSearchBar
          ref={searchBarRef}
          idPrefix="capture-wit-search"
          currentSupplements={currentSupplements}
          cabinetEmpty={cabinetEmpty}
          onSerializedChange={onChangeSupplements}
          onOpenLinkWizard={(url) => openLinkWizard(url)}
          onLookUpBarcode={(upc) => openScanner(upc)}
        />

        <p className="current-supplements-capture-pickhint">Camera shortcuts</p>
        <div className="current-supplements-capture-tools current-supplements-capture-tools--row">
          <label className="current-supplements-capture-tool current-supplements-capture-tool--compact">
            <Sparkles size={18} aria-hidden />
            <span>
              <strong>Snap bottles</strong>
              <small>Label in frame, good light</small>
            </span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onPickPhoto}
              disabled={aiLoading}
            />
          </label>
          <button
            type="button"
            className="current-supplements-capture-tool current-supplements-capture-tool--compact"
            onClick={() => openScanner()}
          >
            <ScanBarcode size={18} aria-hidden />
            <span>
              <strong>Scan barcode</strong>
              <small>Live camera</small>
            </span>
          </button>
          <button type="button" className="current-supplements-capture-tool current-supplements-capture-tool--compact" onClick={() => openLinkWizard()}>
            <Link2 size={18} aria-hidden />
            <span>
              <strong>Paste link</strong>
              <small>Lab fit check</small>
            </span>
          </button>
        </div>

        {aiLoading ? (
          <p className="current-supplements-capture-status" aria-live="polite">
            {photoStage === "upload" ? "Uploading…" : photoStage === "read" ? "Reading label…" : "Matching to catalog…"}
          </p>
        ) : null}
        {aiError ? <p className="current-supplements-capture-error">{aiError}</p> : null}
        {barcodeHint && !aiError ? <p className="current-supplements-capture-hint">{barcodeHint}</p> : null}

        <p className="current-supplements-capture-cabinet-label">Your cabinet</p>
        <CurrentSupplementsEditor
          idPrefix="capture-supplements"
          value={currentSupplements}
          onChange={onChangeSupplements}
          className="current-supplements-capture-editor"
          hideIntro
          variant="cabinet"
        />

        <div className="current-supplements-capture-actions">
          <button type="button" className="onboarding-primary-btn" onClick={onClose}>
            Done
          </button>
        </div>

        <DetectedSupplementsConfirm
          open={photoConfirmOpen}
          batches={photoBatches}
          onClose={() => {
            revokeBatchThumbs(photoBatches)
            setPhotoBatches([])
            setPhotoConfirmOpen(false)
          }}
          onChangeBatch={(batchId, products) => {
            setPhotoBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, products } : b)))
          }}
          onAddAnotherPhoto={requestAnotherPhoto}
          onRetakeLast={retakeLastBatch}
          onCommit={commitPhotoBatches}
        />

        <StackIntakeWizardModal
          open={intakeWizardOpen}
          onClose={() => {
            setWizardInitialUrl(undefined)
            setIntakeWizardOpen(false)
          }}
          initialProductUrl={wizardInitialUrl}
          currentSupplements={currentSupplements}
          onComplete={(serialized) => {
            onChangeSupplements(serialized)
            setWizardInitialUrl(undefined)
            setIntakeWizardOpen(false)
          }}
        />

        <BarcodeScannerSheet
          open={scannerOpen}
          onClose={() => {
            setScannerPrimedStream((prev) => {
              prev?.getTracks().forEach((t) => t.stop())
              return null
            })
            setScannerOpen(false)
            setScannerSeedCode(undefined)
          }}
          primedVideoStream={scannerPrimedStream}
          initialTypedCode={scannerSeedCode}
          currentSupplements={currentSupplements}
          onChangeSupplements={onChangeSupplements}
          onQrProductLink={(url) => {
            setScannerOpen(false)
            setScannerSeedCode(undefined)
            openLinkWizard(url)
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
        .current-supplements-capture-pickhint {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--color-text-muted);
        }
        .current-supplements-capture-tools {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }
        .current-supplements-capture-tools--row {
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }
        @media (max-width: 480px) {
          .current-supplements-capture-tools--row {
            grid-template-columns: 1fr;
          }
        }
        .current-supplements-capture-tool {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
          background: color-mix(in srgb, var(--color-accent) 6%, transparent);
          font-size: 13px;
          cursor: pointer;
          color: var(--color-text-primary);
          text-align: left;
        }
        .current-supplements-capture-tool--compact {
          padding: 10px 12px;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .current-supplements-capture-tool--compact > span {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .current-supplements-capture-tool:hover {
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
          border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
        }
        .current-supplements-capture-tool > span {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .current-supplements-capture-tool strong {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
        }
        .current-supplements-capture-tool small {
          font-size: 12px;
          font-weight: 400;
          line-height: 1.35;
          color: var(--color-text-secondary);
        }
        .current-supplements-capture-cabinet-label {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
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
