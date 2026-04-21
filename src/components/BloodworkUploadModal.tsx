"use client"

import React, { useCallback, useRef, useState } from "react"
import { UploadCloud, Camera, FileText, X, Loader2 } from "lucide-react"
import { resizeImageFileToJpeg } from "@/src/lib/imageResize"

export type UploadedExtraction = {
  filename: string
  mime: string
  size: number
  error: string | null
  extraction: {
    rows: Array<{
      testName: string
      value: number | null
      unit: string
      rangeLow: number | null
      rangeHigh: number | null
      flag: string
      confidence: number
    }>
    collected_at: string
    lab_provider: string
    overall_confidence: number
  } | null
}

type Props = {
  onComplete: (payload: { sessionId: string; extractions: UploadedExtraction[] }) => void
  onCancel?: () => void
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"

export function BloodworkUploadModal({ onComplete, onCancel }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    setFiles((prev) => {
      const next = [...prev]
      for (const f of arr) {
        if (next.length >= 10) break
        if (!next.find((x) => x.name === f.name && x.size === f.size)) next.push(f)
      }
      return next
    })
  }, [])

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const rasterizePdf = useCallback(async (file: File): Promise<File[]> => {
    // pdfjs-dist is imported dynamically so we don't ship it on non-upload routes.
    // We point the worker at the CDN-hosted worker built for the exact version in package.json;
    // this avoids Next.js webpack worker-bundling configuration and keeps the upload path simple.
    const pdfjsLib = await import("pdfjs-dist")
    const version = (pdfjsLib as unknown as { version?: string }).version ?? "4.7.76"
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`
    }

    const data = new Uint8Array(await file.arrayBuffer())
    const doc = await pdfjsLib.getDocument({ data }).promise
    const out: File[] = []
    const pageCount = Math.min(doc.numPages, 8) // cap: more pages than this = split into multiple uploads
    for (let p = 1; p <= pageCount; p++) {
      const page = await doc.getPage(p)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement("canvas")
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas_unavailable")
      await page.render({ canvasContext: ctx, viewport }).promise
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
      )
      if (blob) {
        const basename = file.name.replace(/\.pdf$/i, "")
        out.push(
          new File([blob], `${basename}-p${p}.jpg`, { type: "image/jpeg" })
        )
      }
    }
    return out
  }, [])

  const submit = useCallback(async () => {
    if (files.length === 0 || submitting) return
    setSubmitting(true)
    setError("")
    setProgress("Preparing files…")
    try {
      const prepared: File[] = []
      for (const f of files) {
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          setProgress(`Converting ${f.name} to images…`)
          try {
            const pages = await rasterizePdf(f)
            prepared.push(...pages)
          } catch {
            setError(
              `Couldn't open ${f.name} as a PDF. Try re-saving it or upload a screenshot of the page.`
            )
            setSubmitting(false)
            setProgress("")
            return
          }
        } else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) {
          setProgress(`Optimizing ${f.name}…`)
          try {
            const resized = await resizeImageFileToJpeg(f)
            prepared.push(
              new File([resized], f.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" })
            )
          } catch {
            prepared.push(f)
          }
        } else {
          prepared.push(f)
        }
      }

      setProgress("Uploading to Clarion…")
      const form = new FormData()
      for (const f of prepared) form.append("files", f)
      if (label.trim()) form.append("label", label.trim())

      const res = await fetch("/api/labs/extract", { method: "POST", body: form })
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string
        extractions?: UploadedExtraction[]
        error?: string
        code?: string
        missing?: string[]
      }

      if (!res.ok) {
        if (data.code === "consent_required") {
          setError("Consent was not recorded. Close this and check the consent boxes again.")
        } else {
          setError(data.error || "Upload failed. Please try again.")
        }
        setSubmitting(false)
        setProgress("")
        return
      }

      if (!data.sessionId || !Array.isArray(data.extractions)) {
        setError("Unexpected server response.")
        setSubmitting(false)
        setProgress("")
        return
      }

      onComplete({ sessionId: data.sessionId, extractions: data.extractions })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg)
    } finally {
      setSubmitting(false)
      setProgress("")
    }
  }, [files, submitting, label, rasterizePdf, onComplete])

  return (
    <div className="clarion-lab-upload" aria-busy={submitting}>
      <div
        className={`clarion-lab-dropzone ${dragging ? "clarion-lab-dropzone--active" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Choose lab PDFs or photos to upload"
      >
        <UploadCloud size={32} aria-hidden />
        <h3>Drop lab PDFs or photos here</h3>
        <p>Up to 10 files, 12 MB each. PDFs are converted to images in your browser before upload.</p>
        <span className="clarion-lab-dropzone__hint">Accepted: PDF, JPG, PNG, WEBP, HEIC</span>
        <div className="clarion-lab-dropzone__buttons" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="clarion-lab-dropzone__btn clarion-lab-dropzone__btn--primary"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            <FileText size={16} aria-hidden /> Choose files
          </button>
          <button
            type="button"
            className="clarion-lab-dropzone__btn"
            onClick={(e) => {
              e.stopPropagation()
              cameraRef.current?.click()
            }}
          >
            <Camera size={16} aria-hidden /> Use camera
          </button>
        </div>
        {/*
          IMPORTANT: we do NOT use `hidden` or `display: none` on file inputs.
          Safari, some iOS WebViews, and certain Chromium builds refuse to open the
          native picker when `.click()` is called on a display:none input. The
          visually-hidden pattern (off-screen, zero size, no pointer events) keeps
          the input in the render tree so programmatic `.click()` always works.
        */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: "absolute", left: "-10000px", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.currentTarget.value = ""
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: "absolute", left: "-10000px", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.currentTarget.value = ""
          }}
        />
      </div>

      {files.length > 0 ? (
        <div className="clarion-lab-files">
          {files.map((f, idx) => (
            <div key={`${f.name}-${f.size}-${idx}`} className="clarion-lab-file-row">
              <FileText size={18} aria-hidden />
              <div className="clarion-lab-file-row__name">
                <strong>{f.name}</strong>
                <small>
                  {(f.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  {f.type || "unknown type"}
                </small>
              </div>
              <button
                type="button"
                className="clarion-lab-file-row__remove"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeFile(idx)}
                disabled={submitting}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="clarion-lab-file-row" style={{ background: "transparent", border: "none", padding: 0 }}>
        <div className="clarion-lab-file-row__name">
          <strong>Label (optional)</strong>
          <small>e.g. &quot;June 2026 annual&quot; or &quot;Post-supplement retest&quot;</small>
        </div>
        <input
          className="clarion-lab-confirm-row__input"
          style={{ width: "60%" }}
          placeholder="Optional label"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 120))}
          disabled={submitting}
        />
      </label>

      {error ? (
        <p className="clarion-consent-gate__error" role="alert">
          {error}
        </p>
      ) : null}

      {progress ? (
        <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Loader2 size={16} className="spin" aria-hidden /> {progress}
        </p>
      ) : null}

      <div className="clarion-lab-actions">
        <button
          type="button"
          className="clarion-lab-actions__primary"
          disabled={files.length === 0 || submitting}
          onClick={() => void submit()}
        >
          {submitting ? "Processing…" : `Extract ${files.length || ""} file${files.length === 1 ? "" : "s"}`.trim()}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="clarion-lab-actions__secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}
