"use client"

import React from "react"
import type { ResolvedBarcodeProduct } from "@/src/lib/barcodeScan"
import type { StackProductFit, StackProductFitChipTone } from "@/src/lib/stackProductFit"

type Props = {
  resolved: ResolvedBarcodeProduct
  fit: StackProductFit | null
  fitChipLabel: string
  fitChipTone: StackProductFitChipTone
  rationale: string
  fitLoading: boolean
  onAddToCabinet: () => void
  onEditInstead: () => void
  onDismiss: () => void
}

export function BarcodeProductConfirmCard({
  resolved,
  fit,
  fitChipLabel,
  fitChipTone,
  rationale,
  fitLoading,
  onAddToCabinet,
  onEditInstead,
  onDismiss,
}: Props) {
  const hasName = resolved.name.trim().length > 0

  if (!hasName) {
    return (
      <div className="barcode-product-confirm barcode-product-confirm--miss" role="region" aria-label="Barcode result">
        <p className="barcode-product-confirm-title">We couldn&apos;t identify that bottle</p>
        <p className="barcode-product-confirm-copy">
          Try the photo reader, or paste the product link — we&apos;ll tidy it from the URL.
        </p>
        <button type="button" className="onboarding-ghost-btn" onClick={onDismiss}>
          Dismiss
        </button>
        <style jsx>{`
          .barcode-product-confirm {
            border-radius: 12px;
            padding: 14px;
            border: 1px solid color-mix(in srgb, var(--color-text-muted) 22%, transparent);
            background: color-mix(in srgb, var(--color-text-muted) 5%, transparent);
            margin-bottom: 12px;
          }
          .barcode-product-confirm--miss {
            border-style: dashed;
          }
          .barcode-product-confirm-title {
            margin: 0 0 6px;
            font-size: 14px;
            font-weight: 700;
          }
          .barcode-product-confirm-copy {
            margin: 0 0 12px;
            font-size: 13px;
            line-height: 1.45;
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="barcode-product-confirm" role="region" aria-label="Matched product">
      <p className="barcode-product-confirm-badge">Matched</p>
      <p className="barcode-product-confirm-name">
        {resolved.brand ? (
          <>
            <span className="barcode-product-confirm-brand">{resolved.brand}</span>{" "}
          </>
        ) : null}
        {resolved.name}
      </p>
      {resolved.ingredientsLine ? (
        <p className="barcode-product-confirm-ingredients">
          <strong>Ingredients:</strong> {resolved.ingredientsLine}
        </p>
      ) : null}
      <p className="barcode-product-confirm-source">
        Source: {resolved.source === "off_dsld" ? "Open Food Facts + NIH DSLD" : "Open Food Facts"} · education only
      </p>

      {fitLoading ? (
        <p className="barcode-product-confirm-fit barcode-product-confirm-fit--loading">Checking lab fit…</p>
      ) : fit ? (
        <p className="barcode-product-confirm-fit">
          <strong>Lab fit:</strong>{" "}
          <span className={`barcode-product-confirm-fit-chip barcode-product-confirm-fit-chip--${fitChipTone}`}>
            {fitChipLabel || fit}
          </span>
        </p>
      ) : null}
      {!fitLoading && rationale ? <p className="barcode-product-confirm-rationale">{rationale}</p> : null}

      <div className="barcode-product-confirm-actions">
        <button type="button" className="onboarding-primary-btn" onClick={onAddToCabinet}>
          Add to cabinet
        </button>
        <button type="button" className="onboarding-ghost-btn" onClick={onEditInstead}>
          Not quite — edit
        </button>
      </div>

      <style jsx>{`
        .barcode-product-confirm {
          border-radius: 12px;
          padding: 14px;
          border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
          background: color-mix(in srgb, var(--color-accent) 6%, transparent);
          margin-bottom: 12px;
        }
        .barcode-product-confirm-badge {
          margin: 0 0 6px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--color-accent);
        }
        .barcode-product-confirm-name {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.3;
        }
        .barcode-product-confirm-brand {
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .barcode-product-confirm-ingredients {
          margin: 0 0 8px;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-text-primary);
        }
        .barcode-product-confirm-source {
          margin: 0 0 10px;
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .barcode-product-confirm-fit {
          margin: 0 0 6px;
          font-size: 13px;
        }
        .barcode-product-confirm-fit--loading {
          color: var(--color-text-secondary);
        }
        .barcode-product-confirm-fit-chip {
          font-weight: 700;
        }
        .barcode-product-confirm-fit-chip--aligned {
          color: var(--color-accent, #16a34a);
        }
        .barcode-product-confirm-fit-chip--suboptimal {
          color: #b45309;
        }
        .barcode-product-confirm-fit-chip--in_range {
          color: #15803d;
        }
        .barcode-product-confirm-fit-chip--needs_context {
          color: #b45309;
        }
        .barcode-product-confirm-fit-chip--unmapped {
          color: var(--color-text-muted);
        }
        .barcode-product-confirm-rationale {
          margin: 0 0 12px;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-text-secondary);
        }
        .barcode-product-confirm-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
      `}</style>
    </div>
  )
}
