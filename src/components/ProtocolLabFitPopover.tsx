"use client"

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"
import type { StackProductFitChipTone } from "@/src/lib/stackProductFit"

type Props = {
  chipLabel: string
  chipTone: StackProductFitChipTone
  rationale: string
  /** e.g. supplement name for screen readers */
  contextLabel: string
  /** Gamified (dark) cards vs default protocol row styling */
  variant?: "default" | "gamified"
}

/**
 * Compact lab-fit chip + info icon; full rationale in a small popover (not inline on the card).
 */
export function ProtocolLabFitPopover({ chipLabel, chipTone, rationale, contextLabel, variant = "default" }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const [fixedPos, setFixedPos] = useState<{ top: number; left: number; maxW: number } | null>(null)

  const updatePosition = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const maxW = Math.min(300, Math.max(220, window.innerWidth - 24))
    let left = r.left
    if (left + maxW > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - 12 - maxW)
    }
    setFixedPos({
      top: r.bottom + 6,
      left,
      maxW,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setFixedPos(null)
      return
    }
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const gamified = variant === "gamified"

  const popoverEl =
    open && fixedPos ? (
      <div
        id={popoverId}
        className={`dashboard-protocol-lab-fit-popover${gamified ? " dashboard-protocol-lab-fit-popover--gamified" : ""}`}
        role="dialog"
        aria-label={`Lab fit details for ${contextLabel}`}
        style={{
          position: "fixed",
          zIndex: 10000,
          top: fixedPos.top,
          left: fixedPos.left,
          width: fixedPos.maxW,
        }}
      >
        <p className="dashboard-protocol-lab-fit-popover__text">{rationale}</p>
        <p className="dashboard-protocol-lab-fit-popover__fine">Educational only — not medical advice.</p>
      </div>
    ) : null

  return (
    <>
      <div
        ref={wrapRef}
        className={`dashboard-protocol-lab-fit-inline${gamified ? " dashboard-protocol-lab-fit-inline--gamified" : ""}`}
      >
        <span className={`dashboard-protocol-lab-fit-chip dashboard-protocol-lab-fit-chip--${chipTone}`}>{chipLabel}</span>
        <button
          ref={btnRef}
          type="button"
          className={`dashboard-protocol-lab-fit-info-btn${gamified ? " dashboard-protocol-lab-fit-info-btn--gamified" : ""}`}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`Why this lab fit for ${contextLabel}`}
          onClick={() => setOpen((o) => !o)}
        >
          <Info size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {typeof document !== "undefined" && popoverEl ? createPortal(popoverEl, document.body) : null}
    </>
  )
}
