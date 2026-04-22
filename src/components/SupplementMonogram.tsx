"use client"

import React from "react"
import {
  getSupplementVisualForBiomarker,
  getSupplementVisualForPreset,
  type SupplementVisual,
} from "@/src/lib/supplementVisual"

type Props = {
  /** Catalog preset id (preferred). */
  presetId?: string
  /** Category hint (lets us colour correctly even if preset is unknown). */
  category?: string
  /** Fallback path: when we only have a biomarker name (AffiliateProduct). */
  biomarker?: string
  /** Pixel size of the tile. Default 56. */
  size?: number
  /** Corner radius. Default 12. */
  radius?: number
  /** Override the auto-selected monogram (rare — used for specific product overrides). */
  monogramOverride?: string
  /** Extra className for callers that want to add spacing etc. */
  className?: string
  /** Decorative — screen readers ignore. */
  ariaHidden?: boolean
}

/**
 * A consistent, brand-appropriate visual for a supplement. Renders a
 * category-coloured gradient tile with a chemistry-style monogram (D3, Mg,
 * Ω3, etc.) instead of a hotlinked product image.
 *
 * See `supplementVisual.ts` for the copyright / consistency rationale.
 */
export function SupplementMonogram({
  presetId,
  category,
  biomarker,
  size = 56,
  radius = 12,
  monogramOverride,
  className,
  ariaHidden = true,
}: Props) {
  const visual = resolveVisual({ presetId, category, biomarker })
  const monogram = monogramOverride ?? visual.monogram
  const fontSize = monogramFontSize(monogram, size)

  return (
    <div
      className={className ? `supplement-monogram ${className}` : "supplement-monogram"}
      aria-hidden={ariaHidden}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: visual.gradient,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: visual.textColor,
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 2px rgba(0, 0, 0, 0.2)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        {monogram}
      </span>
    </div>
  )
}

function resolveVisual({
  presetId,
  category,
  biomarker,
}: {
  presetId?: string
  category?: string
  biomarker?: string
}): SupplementVisual {
  if (presetId) return getSupplementVisualForPreset(presetId, category)
  if (biomarker) return getSupplementVisualForBiomarker(biomarker)
  return getSupplementVisualForPreset("unknown", category)
}

function monogramFontSize(monogram: string, tileSize: number): number {
  // Scale font size with tile size, but pull back for longer monograms so
  // they don't overflow.
  const len = monogram.length
  const base = tileSize * 0.45
  if (len <= 1) return Math.round(base * 1.15)
  if (len === 2) return Math.round(base)
  if (len === 3) return Math.round(base * 0.78)
  return Math.round(base * 0.64)
}
