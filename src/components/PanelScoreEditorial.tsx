"use client"

import React, { useEffect, useState } from "react"

export type PanelScoreContributor = {
  label: string
  arrow: string
}

type Props = {
  score: number
  max?: number
  interpretation: string
  contributors: PanelScoreContributor[]
  progressionLine?: string | null
  focusLine?: string | null
  tierClassName?: string
  className?: string
  compact?: boolean
  ariaLabel: string
}

/**
 * Editorial panel score — typography + progress bar, no radial chart.
 * Matches Clarion’s editorial + modern UI direction.
 */
export function PanelScoreEditorial({
  score,
  max = 100,
  interpretation,
  contributors,
  progressionLine,
  focusLine,
  tierClassName = "",
  className = "",
  compact = false,
  ariaLabel,
}: Props) {
  const frac = Math.min(1, Math.max(0, max > 0 ? score / max : 0))
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      queueMicrotask(() => setDisplayScore(score))
      return
    }
    const start = performance.now()
    const duration = 780
    const from = 0
    const to = score
    let raf = 0
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration)
      setDisplayScore(Math.round(from + (to - from) * ease(elapsed)))
      if (elapsed < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const rootClass = ["panel-score-editorial", compact ? "panel-score-editorial--compact" : "", tierClassName, className]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={rootClass.trim()} aria-label={ariaLabel}>
      <div className="panel-score-editorial__top">
        <span className="panel-score-editorial__eyebrow">Panel score</span>
        <div className="panel-score-editorial__figures">
          <span className="panel-score-editorial__num">{displayScore}</span>
          <span className="panel-score-editorial__denom" aria-hidden>
            /{max}
          </span>
        </div>
        <div className="panel-score-editorial__meter" aria-hidden>
          <div className="panel-score-editorial__meter-fill" style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      {progressionLine ? (
        <p className="panel-score-editorial__progression" role="status">
          {progressionLine}
        </p>
      ) : null}
      <p className="panel-score-editorial__interpretation">{interpretation}</p>
      {focusLine ? <p className="panel-score-editorial__focus">{focusLine}</p> : null}
      {contributors.length > 0 && (
        <ul className="panel-score-editorial__contributors" aria-label="Markers influencing score">
          {contributors.map((c, i) => (
            <li key={`${c.label}-${i}`} className="panel-score-editorial__contributor">
              <span className="panel-score-editorial__contributor-name">{c.label}</span>
              <span className="panel-score-editorial__contributor-arrow" aria-hidden>
                {c.arrow}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
