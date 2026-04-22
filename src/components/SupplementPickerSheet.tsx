"use client"

import React, { useCallback, useEffect } from "react"
import { X, ExternalLink, Check, AlertCircle, ShieldAlert, Info } from "lucide-react"
import {
  affiliateUrlForShopProduct,
  type LabAwarenessStatus,
  type ShopProduct,
  type SupplementShopEntry,
} from "@/src/lib/supplementShopCatalog"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { SupplementMonogram } from "@/src/components/SupplementMonogram"

type Props = {
  entry: SupplementShopEntry | null
  labStatus: LabAwarenessStatus
  onClose: () => void
}

/**
 * Bottom-sheet modal showing the 3 curated products for a supplement preset,
 * with a lab-aware banner on top.
 */
export function SupplementPickerSheet({ entry, labStatus, onClose }: Props) {
  const open = entry !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const handleBackdropClick = useCallback(() => onClose(), [onClose])

  if (!entry) return null

  const note = entry.labAwareness.notes[labStatus]

  return (
    <div className="shop-picker-root" role="presentation">
      <button
        type="button"
        className="shop-picker-backdrop"
        aria-label="Close"
        onClick={handleBackdropClick}
      />
      <div
        className="shop-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-picker-title"
      >
        <header className="shop-picker-head">
          <div className="shop-picker-head-text">
            <p className="shop-picker-eyebrow">Clarion pick</p>
            <h2 id="shop-picker-title" className="shop-picker-title">
              {entry.displayName}
            </h2>
          </div>
          <button
            type="button"
            className="shop-picker-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>

        <p className="shop-picker-overview">{entry.overview}</p>

        <LabAwarenessBanner status={labStatus} note={note} />

        {entry.caution ? (
          <div className="shop-picker-caution" role="note">
            <ShieldAlert size={16} strokeWidth={2} aria-hidden />
            <p>{entry.caution}</p>
          </div>
        ) : null}

        <div className="shop-picker-cards">
          <ShopProductCard
            product={entry.products.best_overall}
            presetId={entry.presetId}
            category={entry.category}
            highlight
          />
          <ShopProductCard
            product={entry.products.cheapest}
            presetId={entry.presetId}
            category={entry.category}
          />
          <ShopProductCard
            product={entry.products.highest_potency}
            presetId={entry.presetId}
            category={entry.category}
          />
        </div>

        <p className="shop-picker-disclosure">{AFFILIATE_DISCLOSURE}</p>
      </div>

      <style jsx>{`
        .shop-picker-root {
          position: fixed;
          inset: 0;
          z-index: 9995;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
        }
        @media (min-width: 720px) {
          .shop-picker-root {
            align-items: center;
            padding: 32px;
          }
        }
        .shop-picker-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          border: 0;
          padding: 0;
          cursor: pointer;
        }
        .shop-picker-sheet {
          position: relative;
          width: 100%;
          max-width: 720px;
          max-height: min(94vh, 900px);
          overflow-y: auto;
          background: var(--color-bg-elevated, var(--color-bg));
          color: var(--color-text-primary);
          border: 1px solid var(--clarion-card-border, rgba(255, 255, 255, 0.08));
          border-radius: 20px 20px 0 0;
          padding: 22px 22px 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
        }
        @media (min-width: 720px) {
          .shop-picker-sheet {
            border-radius: 20px;
          }
        }
        .shop-picker-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }
        .shop-picker-eyebrow {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .shop-picker-title {
          margin: 2px 0 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .shop-picker-close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .shop-picker-close:hover {
          background: color-mix(in srgb, var(--color-text-muted) 14%, transparent);
          color: var(--color-text-primary);
        }
        .shop-picker-overview {
          margin: 10px 0 14px;
          font-size: 14px;
          line-height: 1.55;
          color: var(--color-text-secondary);
        }
        .shop-picker-caution {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin: 8px 0 16px;
          padding: 10px 12px;
          border-radius: 10px;
          background: color-mix(in srgb, #c2410c 14%, transparent);
          border: 1px solid color-mix(in srgb, #c2410c 28%, transparent);
          color: var(--color-text-primary);
          font-size: 12.5px;
          line-height: 1.55;
        }
        .shop-picker-caution p {
          margin: 0;
        }
        .shop-picker-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 8px;
        }
        @media (min-width: 640px) {
          .shop-picker-cards {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .shop-picker-disclosure {
          margin: 18px 0 0;
          font-size: 11.5px;
          line-height: 1.55;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lab awareness banner
// ---------------------------------------------------------------------------

function LabAwarenessBanner({
  status,
  note,
}: {
  status: LabAwarenessStatus
  note: string
}) {
  const meta = BANNER_META[status]
  const Icon = meta.icon
  return (
    <aside className={`shop-banner shop-banner--${status}`} role="status">
      <span className="shop-banner-icon" aria-hidden>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="shop-banner-body">
        <p className="shop-banner-title">{meta.title}</p>
        <p className="shop-banner-note">{note}</p>
      </div>
      <style jsx>{`
        .shop-banner {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 12px 14px;
          border-radius: 12px;
          margin: 4px 0 16px;
          border: 1px solid transparent;
        }
        .shop-banner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .shop-banner-body {
          flex: 1;
          min-width: 0;
        }
        .shop-banner-title {
          margin: 0 0 2px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
        }
        .shop-banner-note {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--color-text-secondary);
        }

        .shop-banner--optimal {
          background: color-mix(in srgb, #16a34a 12%, transparent);
          border-color: color-mix(in srgb, #16a34a 22%, transparent);
        }
        .shop-banner--optimal .shop-banner-icon {
          background: color-mix(in srgb, #16a34a 22%, transparent);
          color: #16a34a;
        }
        .shop-banner--optimal .shop-banner-title {
          color: #16a34a;
        }

        .shop-banner--maintenance {
          background: color-mix(in srgb, #3b82f6 12%, transparent);
          border-color: color-mix(in srgb, #3b82f6 22%, transparent);
        }
        .shop-banner--maintenance .shop-banner-icon {
          background: color-mix(in srgb, #3b82f6 22%, transparent);
          color: #3b82f6;
        }
        .shop-banner--maintenance .shop-banner-title {
          color: #3b82f6;
        }

        .shop-banner--priority {
          background: color-mix(in srgb, #ea580c 14%, transparent);
          border-color: color-mix(in srgb, #ea580c 26%, transparent);
        }
        .shop-banner--priority .shop-banner-icon {
          background: color-mix(in srgb, #ea580c 26%, transparent);
          color: #ea580c;
        }
        .shop-banner--priority .shop-banner-title {
          color: #ea580c;
        }

        .shop-banner--unknown {
          background: color-mix(in srgb, var(--color-text-muted) 10%, transparent);
          border-color: color-mix(in srgb, var(--color-text-muted) 20%, transparent);
        }
        .shop-banner--unknown .shop-banner-icon {
          background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
          color: var(--color-text-muted);
        }
      `}</style>
    </aside>
  )
}

const BANNER_META: Record<
  LabAwarenessStatus,
  { title: string; icon: typeof Check }
> = {
  optimal: { title: "You're already dialed in on this", icon: Check },
  maintenance: { title: "Fine to keep — maintenance is the play", icon: Info },
  priority: { title: "Based on your last labs, this is a priority", icon: AlertCircle },
  unknown: { title: "We don't have a lab for this yet", icon: Info },
}

// ---------------------------------------------------------------------------
// Product card
// ---------------------------------------------------------------------------

function ShopProductCard({
  product,
  presetId,
  category,
  highlight,
}: {
  product: ShopProduct
  presetId: string
  category: string
  highlight?: boolean
}) {
  const url = affiliateUrlForShopProduct(product)
  return (
    <article className={`shop-card${highlight ? " shop-card--highlight" : ""}`}>
      <div className={`shop-card-tier shop-card-tier--${product.tier}`}>
        {product.tierLabel}
      </div>

      <div className="shop-card-image">
        <SupplementMonogram presetId={presetId} category={category} size={88} radius={16} />
      </div>

      <div className="shop-card-body">
        <p className="shop-card-brand">{product.brand}</p>
        <h3 className="shop-card-name">{product.productName}</h3>
        <p className="shop-card-dose">{product.dose}</p>
        <p className="shop-card-price">{product.approxPrice}</p>
        <p className="shop-card-why">{product.why}</p>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shop-card-cta"
      >
        Buy on Amazon
        <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
      </a>

      <style jsx>{`
        .shop-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 14px 16px;
          border-radius: 14px;
          background: var(--color-bg, #0b0b0c);
          border: 1px solid var(--clarion-card-border, rgba(255, 255, 255, 0.08));
          position: relative;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .shop-card:hover {
          border-color: color-mix(in srgb, var(--color-text-primary) 20%, transparent);
        }
        .shop-card--highlight {
          border-color: color-mix(in srgb, #16a34a 55%, transparent);
          box-shadow: 0 0 0 1px color-mix(in srgb, #16a34a 25%, transparent);
        }
        .shop-card-tier {
          align-self: flex-start;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
          color: var(--color-text-primary);
        }
        .shop-card-tier--best_overall {
          background: color-mix(in srgb, #16a34a 22%, transparent);
          color: #16a34a;
        }
        .shop-card-tier--cheapest {
          background: color-mix(in srgb, #3b82f6 22%, transparent);
          color: #3b82f6;
        }
        .shop-card-tier--highest_potency {
          background: color-mix(in srgb, #a855f7 22%, transparent);
          color: #a855f7;
        }
        .shop-card-image {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 0 4px;
        }
        .shop-card-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .shop-card-brand {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
        }
        .shop-card-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
        }
        .shop-card-dose {
          margin: 0;
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .shop-card-price {
          margin: 2px 0 0;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .shop-card-why {
          margin: 6px 0 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--color-text-secondary);
        }
        .shop-card-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--color-accent, #16a34a);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: filter 0.18s ease;
        }
        .shop-card-cta:hover {
          filter: brightness(1.08);
        }
      `}</style>
    </article>
  )
}
