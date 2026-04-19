"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DashboardSkyMood } from "@/src/lib/dashboardSkyMood"

/** Short enough to avoid a long light/dark “pulse”; long fades fight CSS that keys off `data-sky`. */
export const SKY_CROSSFADE_MS = 900

type Layer = { mood: DashboardSkyMood; opacity: number }

/**
 * Crossfades between sky moods over SKY_CROSSFADE_MS when `targetMood` changes.
 */
export function useDashboardSkyCrossfade(targetMood: DashboardSkyMood, enabled: boolean) {
  const [bottom, setBottom] = useState<Layer>(() => ({ mood: targetMood, opacity: 1 }))
  const [top, setTop] = useState<Layer>(() => ({ mood: targetMood, opacity: 0 }))
  const first = useRef(true)
  const pendingMoodRef = useRef(targetMood)

  useEffect(() => {
    if (!enabled) {
      setBottom({ mood: targetMood, opacity: 1 })
      setTop({ mood: targetMood, opacity: 0 })
      pendingMoodRef.current = targetMood
      first.current = true
      return
    }

    if (first.current) {
      first.current = false
      pendingMoodRef.current = targetMood
      setBottom({ mood: targetMood, opacity: 1 })
      setTop({ mood: targetMood, opacity: 0 })
      return
    }

    pendingMoodRef.current = targetMood
    setTop({ mood: targetMood, opacity: 0 })
    requestAnimationFrame(() => {
      setTop({ mood: targetMood, opacity: 1 })
      setBottom((b) => ({ ...b, opacity: 0 }))
    })
  }, [targetMood, enabled])

  const onTopTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (!enabled) return
      if (e.propertyName !== "opacity") return
      if (e.target !== e.currentTarget) return
      const op = typeof window !== "undefined" ? parseFloat(getComputedStyle(e.currentTarget).opacity) : 0
      if (op < 0.5) return

      const m = pendingMoodRef.current
      setBottom({ mood: m, opacity: 1 })
      setTop({ mood: m, opacity: 0 })
    },
    [enabled]
  )

  return {
    bottom,
    top,
    onTopTransitionEnd,
    crossfadeMs: SKY_CROSSFADE_MS,
  }
}
