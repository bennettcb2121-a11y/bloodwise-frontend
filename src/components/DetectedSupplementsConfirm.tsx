"use client"

import React, { useMemo } from "react"
import { X } from "lucide-react"

export type VisionProductRow = {
  name: string
  brand: string
  dose: string
  form: string
  servingsPerContainer: number | null
  confidence: number
  selected: boolean
  doseEdit: string
}

export type PhotoDetectionBatch = {
  id: string
  thumbDataUrl: string
  products: VisionProductRow[]
}

type Props = {
  open: boolean
  batches: PhotoDetectionBatch[]
  onClose: () => void
  onChangeBatch: (batchId: string, products: VisionProductRow[]) => void
  onAddAnotherPhoto: () => void
  onRetakeLast: () => void
  onCommit: () => void
}

export function DetectedSupplementsConfirm({
  open,
  batches,
  onClose,
  onChangeBatch,
  onAddAnotherPhoto,
  onRetakeLast,
  onCommit,
}: Props) {
  const selectedCount = useMemo(
    () => batches.reduce((n, b) => n + b.products.filter((p) => p.selected).length, 0),
    [batches]
  )

  if (!open) return null

  return (
    <div className="detected-supplements-confirm-root" role="presentation">
      <button type="button" className="detected-supplements-confirm-backdrop" aria-label="Close" onClick={onClose} />
      <div className="detected-supplements-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="detected-supplements-title">
        <div className="detected-supplements-confirm-head">
          <h2 id="detected-supplements-title" className="detected-supplements-confirm-title">
            Review detected supplements
          </h2>
          <button type="button" className="detected-supplements-confirm-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <p className="detected-supplements-confirm-lede">
          Uncheck anything that doesn&apos;t belong. Low-confidence rows start unchecked — adjust dose if the label differs.
        </p>

        <div className="detected-supplements-confirm-batches">
          {batches.map((batch) => (
            <div key={batch.id} className="detected-supplements-confirm-batch">
              <div className="detected-supplements-confirm-thumb-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={batch.thumbDataUrl} alt="" className="detected-supplements-confirm-thumb" width={72} height={72} />
              </div>
              <ul className="detected-supplements-confirm-list">
                {batch.products.map((p, idx) => {
                  const low = p.confidence < 0.5
                  return (
                    <li key={`${p.name}-${idx}`} className="detected-supplements-confirm-row">
                      <label className="detected-supplements-confirm-check">
                        <input
                          type="checkbox"
                          checked={p.selected}
                          onChange={(e) => {
                            const next = batch.products.map((row, j) =>
                              j === idx ? { ...row, selected: e.target.checked } : row
                            )
                            onChangeBatch(batch.id, next)
                          }}
                        />
                        <span className="detected-supplements-confirm-row-main">
                          <span className="detected-supplements-confirm-row-name">
                            {p.brand ? `${p.brand} · ` : null}
                            {p.name}
                            {low ? (
                              <span className="detected-supplements-confirm-review-badge">Review</span>
                            ) : (
                              <span className="detected-supplements-confirm-conf">{Math.round(p.confidence * 100)}%</span>
                            )}
                          </span>
                          {(p.form || p.dose) && (
                            <span className="detected-supplements-confirm-row-meta">
                              {[p.form, p.dose].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      </label>
                      <input
                        type="text"
                        className="settings-input detected-supplements-confirm-dose"
                        placeholder="Dose (optional)"
                        value={p.doseEdit}
                        onChange={(e) => {
                          const v = e.target.value
                          const next = batch.products.map((row, j) => (j === idx ? { ...row, doseEdit: v } : row))
                          onChangeBatch(batch.id, next)
                        }}
                        aria-label={`Dose for ${p.name}`}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="detected-supplements-confirm-footer-actions">
          <button type="button" className="onboarding-ghost-btn" onClick={onAddAnotherPhoto}>
            Add another photo
          </button>
          <button type="button" className="onboarding-ghost-btn" onClick={onRetakeLast} disabled={batches.length === 0}>
            Retake last
          </button>
          <button type="button" className="onboarding-primary-btn" onClick={onCommit} disabled={selectedCount === 0}>
            Add {selectedCount} {selectedCount === 1 ? "item" : "items"}
          </button>
        </div>

        <style jsx>{`
          .detected-supplements-confirm-root {
            position: fixed;
            inset: 0;
            z-index: 12500;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 16px;
          }
          @media (min-width: 640px) {
            .detected-supplements-confirm-root {
              align-items: center;
            }
          }
          .detected-supplements-confirm-backdrop {
            position: absolute;
            inset: 0;
            border: none;
            background: color-mix(in srgb, var(--color-text-primary) 45%, transparent);
            backdrop-filter: blur(6px);
            cursor: pointer;
          }
          .detected-supplements-confirm-dialog {
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
          .detected-supplements-confirm-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .detected-supplements-confirm-title {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
          }
          .detected-supplements-confirm-close {
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
          .detected-supplements-confirm-lede {
            margin: 0 0 14px;
            font-size: 13px;
            line-height: 1.45;
            color: var(--color-text-secondary);
          }
          .detected-supplements-confirm-batches {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 16px;
          }
          .detected-supplements-confirm-batch {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .detected-supplements-confirm-thumb-wrap {
            flex-shrink: 0;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid var(--color-border, #e5e5e5);
          }
          .detected-supplements-confirm-thumb {
            display: block;
            width: 72px;
            height: 72px;
            object-fit: cover;
          }
          .detected-supplements-confirm-list {
            list-style: none;
            margin: 0;
            padding: 0;
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .detected-supplements-confirm-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .detected-supplements-confirm-check {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            cursor: pointer;
            font-size: 13px;
          }
          .detected-supplements-confirm-check input {
            margin-top: 3px;
          }
          .detected-supplements-confirm-row-main {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .detected-supplements-confirm-row-name {
            font-weight: 600;
            line-height: 1.3;
          }
          .detected-supplements-confirm-row-meta {
            font-size: 12px;
            color: var(--color-text-muted);
          }
          .detected-supplements-confirm-conf {
            margin-left: 6px;
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-muted);
          }
          .detected-supplements-confirm-review-badge {
            margin-left: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 2px 6px;
            border-radius: 6px;
            background: color-mix(in srgb, #b45309 18%, transparent);
            color: #92400e;
          }
          .detected-supplements-confirm-dose {
            font-size: 13px;
            margin-left: 24px;
          }
          .detected-supplements-confirm-footer-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            justify-content: flex-end;
          }
        `}</style>
      </div>
    </div>
  )
}
