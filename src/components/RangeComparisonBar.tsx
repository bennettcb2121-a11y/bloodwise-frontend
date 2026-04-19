"use client"

import React from "react"
import type { RangeComparison, RangeTier } from "@/src/lib/analyzeBiomarkers"

type Props = {
  marker: string
  value: number
  standardMin: number | null
  standardMax: number | null
  personalMin: number | null
  personalMax: number | null
  mismatch: RangeComparison["mismatch"]
  profileLabel: string
  unit?: string
  labReferenceMin?: number | null
  labReferenceMax?: number | null
  labReferenceSource?: string | null
  standardTiers?: RangeTier[]
  verdict?: string
  verdictIsFlagged?: boolean
}

type Axis = {
  domainMin: number
  domainMax: number
  span: number
}

function buildAxis(values: number[]): Axis {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.1, 0.0001)
  return {
    domainMin: lo - pad,
    domainMax: hi + pad,
    span: hi - lo + pad * 2,
  }
}

function toPct(n: number, axis: Axis): number {
  const p = ((n - axis.domainMin) / axis.span) * 100
  if (Number.isNaN(p)) return 0
  return Math.max(0, Math.min(100, p))
}

function formatNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 100) return String(Math.round(n))
  if (abs >= 10) return (Math.round(n * 10) / 10).toString()
  return (Math.round(n * 100) / 100).toString()
}

function tierForValue(tiers: RangeTier[], value: number): RangeTier["tone"] | null {
  for (const t of tiers) {
    const aboveFrom = t.from == null || value >= t.from
    const belowTo = t.to == null || value < t.to
    if (aboveFrom && belowTo) return t.tone
  }
  return null
}

/**
 * Decide the status tone for the personal range (inside → optimal, outside → deficient/high,
 * close-to-edge → suboptimal). Used for the dot color on the personal bar.
 */
function personalStatusTone(
  value: number,
  personalMin: number,
  personalMax: number
): "optimal" | "deficient" | "high" {
  if (value < personalMin) return "deficient"
  if (value > personalMax) return "high"
  return "optimal"
}

type Tick = { value: number; label: string }

function buildTicks(
  axis: Axis,
  tiers: RangeTier[],
  fallback: { standardMin: number; standardMax: number }
): Tick[] {
  const raw: number[] = []
  for (const t of tiers) {
    if (typeof t.from === "number") raw.push(t.from)
    if (typeof t.to === "number") raw.push(t.to)
  }
  if (raw.length === 0) {
    raw.push(fallback.standardMin, fallback.standardMax)
  }

  const inside = raw.filter((n) => n >= axis.domainMin && n <= axis.domainMax)
  const deduped = Array.from(new Set(inside.map((n) => Math.round(n * 100) / 100))).sort(
    (a, b) => a - b
  )

  const compact: number[] = []
  const minSeparation = axis.span * 0.05
  for (const n of deduped) {
    if (compact.length === 0 || n - compact[compact.length - 1] >= minSeparation) {
      compact.push(n)
    }
  }

  return compact.map((n) => ({ value: n, label: formatNumber(n) }))
}

export function RangeComparisonBar({
  marker,
  value,
  standardMin,
  standardMax,
  personalMin,
  personalMax,
  mismatch,
  profileLabel,
  unit,
  labReferenceMin,
  labReferenceMax,
  labReferenceSource,
  standardTiers,
  verdict,
  verdictIsFlagged,
}: Props) {
  if (
    standardMin == null ||
    standardMax == null ||
    personalMin == null ||
    personalMax == null
  ) {
    return null
  }

  const hasLabRef =
    typeof labReferenceMin === "number" && typeof labReferenceMax === "number"
  const labLo = hasLabRef ? (labReferenceMin as number) : standardMin
  const labHi = hasLabRef ? (labReferenceMax as number) : standardMax

  const axisInputs = [value, standardMin, standardMax, personalMin, personalMax]
  if (hasLabRef) axisInputs.push(labLo, labHi)
  const axis = buildAxis(axisInputs)

  const tiers = standardTiers ?? []
  const clippedTiers = tiers.map((t) => {
    const from = t.from == null ? axis.domainMin : t.from
    const to = t.to == null ? axis.domainMax : t.to
    return { tone: t.tone, from, to }
  })

  const perLeft = toPct(personalMin, axis)
  const perRight = toPct(personalMax, axis)
  const perWidth = Math.max(perRight - perLeft, 0.5)
  const valuePct = toPct(value, axis)

  const valueTier = tierForValue(tiers, value)
  const personalTone = personalStatusTone(value, personalMin, personalMax)

  let overshoot: { left: number; width: number; tone: "deficient" | "high" } | null = null
  if (value < personalMin) {
    const left = valuePct
    const width = Math.max(perLeft - left, 0)
    if (width > 0.1) overshoot = { left, width, tone: "deficient" }
  } else if (value > personalMax) {
    const left = perRight
    const width = Math.max(valuePct - perRight, 0)
    if (width > 0.1) overshoot = { left, width, tone: "high" }
  }

  const unitLabel = unit ? ` ${unit}` : ""

  const standardLabel = hasLabRef ? "Typical lab reference" : "Standard lab range"
  const standardHeadline = hasLabRef
    ? `${formatNumber(labLo)}–${formatNumber(labHi)}${unitLabel}`
    : `${formatNumber(standardMin)}–${formatNumber(standardMax)}${unitLabel}`

  const ticks = buildTicks(axis, tiers, { standardMin, standardMax })

  const tones = new Set(tiers.map((t) => t.tone))
  const legendItems: { tone: RangeTier["tone"]; label: string }[] = []
  if (tones.has("deficient")) legendItems.push({ tone: "deficient", label: "Deficient" })
  if (tones.has("suboptimal")) legendItems.push({ tone: "suboptimal", label: "Suboptimal" })
  if (tones.has("optimal")) legendItems.push({ tone: "optimal", label: "Optimal" })
  if (tones.has("high")) legendItems.push({ tone: "high", label: "High" })

  const ariaSummary =
    `${marker} value ${formatNumber(value)}${unitLabel}. ` +
    (hasLabRef
      ? `Typical lab reference ${formatNumber(labLo)} to ${formatNumber(labHi)}. `
      : `Standard range ${formatNumber(standardMin)} to ${formatNumber(standardMax)}. `) +
    `Clarion target for ${profileLabel} ${formatNumber(personalMin)} to ${formatNumber(personalMax)}.` +
    (verdict ? ` ${verdict}` : "")

  return (
    <div className="rc-bar" role="group" aria-label={`Range comparison for ${marker}`}>
      <p className="rc-bar__sr" aria-live="polite">
        {ariaSummary}
      </p>

      {verdict ? (
        <p
          className={
            verdictIsFlagged
              ? `rc-bar__verdict rc-bar__verdict--flagged rc-bar__verdict--${personalTone}`
              : "rc-bar__verdict"
          }
        >
          {verdict}
        </p>
      ) : null}

      <div className="rc-bar__row rc-bar__row--standard">
        <div className="rc-bar__head">
          <span className="rc-bar__label">
            {standardLabel}
            {hasLabRef && labReferenceSource ? (
              <span className="rc-bar__source"> · {labReferenceSource}</span>
            ) : null}
          </span>
          <span className="rc-bar__range">{standardHeadline}</span>
        </div>
        <div className="rc-bar__track rc-bar__track--standard" aria-hidden>
          {clippedTiers.map((t, i) => {
            const left = toPct(t.from, axis)
            const width = Math.max(toPct(t.to, axis) - left, 0)
            if (width <= 0) return null
            return (
              <div
                key={i}
                className={`rc-bar__tier rc-bar__tier--${t.tone}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            )
          })}
          <div
            className={`rc-bar__marker rc-bar__marker--standard rc-bar__marker--${valueTier ?? "neutral"}`}
            style={{ left: `${valuePct}%` }}
          />
        </div>
        {legendItems.length > 0 ? (
          <ul className="rc-bar__legend" aria-hidden>
            {legendItems.map((item) => (
              <li key={item.tone} className={`rc-bar__legend-item rc-bar__legend-item--${item.tone}`}>
                <span className={`rc-bar__legend-swatch rc-bar__legend-swatch--${item.tone}`} />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rc-bar__row rc-bar__row--personal">
        <div className="rc-bar__head">
          <span className="rc-bar__label rc-bar__label--personal">
            Your range
            <span className="rc-bar__profile"> — {profileLabel}</span>
          </span>
        </div>
        <div className="rc-bar__track rc-bar__track--personal" aria-hidden>
          <div
            className="rc-bar__fill rc-bar__fill--personal"
            style={{ left: `${perLeft}%`, width: `${perWidth}%` }}
          />
          {overshoot ? (
            <div
              className={`rc-bar__overshoot rc-bar__overshoot--${overshoot.tone}`}
              style={{ left: `${overshoot.left}%`, width: `${overshoot.width}%` }}
            />
          ) : null}
          <div
            className={`rc-bar__marker rc-bar__marker--personal rc-bar__marker--personal-${personalTone}`}
            style={{ left: `${valuePct}%` }}
          >
            <span className={`rc-bar__value-tag rc-bar__value-tag--${personalTone}`}>
              {formatNumber(value)}
              {unitLabel}
            </span>
          </div>
        </div>
        {ticks.length > 0 ? (
          <div className="rc-bar__ticks" aria-hidden>
            {ticks.map((t) => (
              <span
                key={t.value}
                className="rc-bar__tick"
                style={{ left: `${toPct(t.value, axis)}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .rc-bar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 0 6px;
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
          color: var(--color-text-primary);
        }
        .rc-bar__sr {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .rc-bar__verdict {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 500;
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
        }
        .rc-bar__verdict--flagged {
          font-weight: 600;
        }
        .rc-bar__verdict--flagged.rc-bar__verdict--high,
        .rc-bar__verdict--flagged.rc-bar__verdict--deficient {
          background: color-mix(in srgb, var(--color-error) 10%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-error) 45%, var(--color-border));
        }
        .rc-bar__verdict--flagged.rc-bar__verdict--optimal {
          background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface));
          border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border));
        }
        .rc-bar__row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .rc-bar__head {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 6px 12px;
        }
        .rc-bar__label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .rc-bar__label--personal {
          color: var(--color-accent);
        }
        .rc-bar__profile {
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: none;
          color: var(--color-text-secondary);
        }
        .rc-bar__source {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: none;
          color: var(--color-text-muted);
        }
        .rc-bar__range {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-muted);
        }
        .rc-bar__track {
          position: relative;
          width: 100%;
          border-radius: 999px;
          overflow: hidden;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
        }
        .rc-bar__track--standard {
          height: 10px;
        }
        .rc-bar__track--personal {
          height: 14px;
          overflow: visible;
          background: color-mix(in srgb, var(--color-accent) 6%, var(--color-bg));
          border-color: color-mix(
            in srgb,
            var(--color-accent) 22%,
            var(--color-border)
          );
        }
        .rc-bar__tier {
          position: absolute;
          top: 0;
          bottom: 0;
        }
        .rc-bar__tier--optimal {
          background: color-mix(in srgb, var(--color-success) 32%, transparent);
        }
        .rc-bar__tier--suboptimal {
          background: color-mix(in srgb, var(--color-warning) 28%, transparent);
        }
        .rc-bar__tier--deficient,
        .rc-bar__tier--high {
          background: color-mix(in srgb, var(--color-error) 26%, transparent);
        }
        .rc-bar__legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
          margin: 2px 0 0;
          padding: 0;
          list-style: none;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .rc-bar__legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .rc-bar__legend-swatch {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: var(--color-border);
        }
        .rc-bar__legend-swatch--optimal {
          background: color-mix(in srgb, var(--color-success) 55%, var(--color-bg));
        }
        .rc-bar__legend-swatch--suboptimal {
          background: color-mix(in srgb, var(--color-warning) 55%, var(--color-bg));
        }
        .rc-bar__legend-swatch--deficient,
        .rc-bar__legend-swatch--high {
          background: color-mix(in srgb, var(--color-error) 55%, var(--color-bg));
        }
        .rc-bar__fill {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 999px;
        }
        .rc-bar__fill--personal {
          background: var(--color-accent);
          box-shadow: 0 0 0 1px
            color-mix(in srgb, var(--color-accent) 30%, transparent);
        }
        .rc-bar__overshoot {
          position: absolute;
          top: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-error) 70%, transparent) 0 4px,
            color-mix(in srgb, var(--color-error) 35%, transparent) 4px 8px
          );
          border-top: 1px solid color-mix(in srgb, var(--color-error) 65%, transparent);
          border-bottom: 1px solid color-mix(in srgb, var(--color-error) 65%, transparent);
        }
        .rc-bar__marker {
          position: absolute;
          top: 50%;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        .rc-bar__marker--standard {
          width: 10px;
          height: 10px;
          background: var(--color-bg);
          border: 2px solid var(--color-text-secondary);
          box-shadow: 0 0 0 2px var(--color-bg);
        }
        .rc-bar__marker--optimal {
          border-color: var(--color-success);
        }
        .rc-bar__marker--suboptimal {
          border-color: var(--color-warning);
        }
        .rc-bar__marker--deficient,
        .rc-bar__marker--high {
          border-color: var(--color-error);
        }
        .rc-bar__marker--personal {
          width: 16px;
          height: 16px;
          background: var(--color-bg);
          border: 2px solid var(--color-accent);
          box-shadow: 0 0 0 2px var(--color-bg);
        }
        .rc-bar__marker--personal-optimal {
          border-color: var(--color-success);
          background: var(--color-success);
          box-shadow: 0 0 0 2px var(--color-bg),
            0 0 0 4px color-mix(in srgb, var(--color-success) 25%, transparent);
        }
        .rc-bar__marker--personal-high,
        .rc-bar__marker--personal-deficient {
          border-color: var(--color-error);
          background: var(--color-error);
          box-shadow: 0 0 0 2px var(--color-bg),
            0 0 0 4px color-mix(in srgb, var(--color-error) 25%, transparent);
        }
        .rc-bar__value-tag {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          transform: translateX(-50%);
          padding: 3px 7px;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          border-radius: 4px;
          background: var(--color-text-primary);
          color: var(--color-bg);
          white-space: nowrap;
          pointer-events: none;
        }
        .rc-bar__value-tag--high,
        .rc-bar__value-tag--deficient {
          background: var(--color-error);
          color: #fff;
        }
        .rc-bar__value-tag--optimal {
          background: var(--color-success);
          color: #fff;
        }
        .rc-bar__ticks {
          position: relative;
          height: 14px;
          margin-top: 2px;
        }
        .rc-bar__tick {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          font-size: 10px;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-muted);
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .rc-bar__head {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .rc-bar__range {
            align-self: flex-start;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rc-bar__fill--personal,
          .rc-bar__marker--personal-optimal,
          .rc-bar__marker--personal-high,
          .rc-bar__marker--personal-deficient {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  )
}
