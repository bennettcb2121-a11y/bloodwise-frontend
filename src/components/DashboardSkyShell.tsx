"use client"

import React, { useEffect, useMemo, useState } from "react"
import { getAmbientRouteSky } from "@/src/lib/ambientSkyMood"
import { useDashboardSkyCrossfade } from "@/src/hooks/useDashboardSkyCrossfade"
import { useDashboardSkyAtmosphere } from "@/src/contexts/DashboardSkyAtmosphereContext"
import type { DashboardSkyMood } from "@/src/lib/dashboardSkyMood"

type Props = {
  children: React.ReactNode
}

/**
 * Shared atmosphere: dual-plane sky + data-sky for CSS. Children sit above (z-index 1).
 * Home can override mood via context; other routes use time-of-day ambient sky.
 */
export function DashboardSkyShell({ children }: Props) {
  const { state } = useDashboardSkyAtmosphere()
  const [hour, setHour] = useState(() => new Date().getHours())

  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const ambient = useMemo(() => getAmbientRouteSky(hour), [hour])
  const mood: DashboardSkyMood = state.moodOverride ?? ambient
  const sky = useDashboardSkyCrossfade(mood, true)

  /** Match `data-sky` / body chrome to the layer that’s actually visible so we don’t flash dark tints while the sky is still light (or vice versa). */
  const displaySkyMood: DashboardSkyMood =
    sky.top.opacity > sky.bottom.opacity ? sky.top.mood : sky.bottom.mood

  /** Sidebar + top bar sit outside this wrapper; mirror **visible** sky for low-light chrome in light theme. */
  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.setAttribute("data-dashboard-sky", displaySkyMood)
    return () => document.body.removeAttribute("data-dashboard-sky")
  }, [displaySkyMood])

  return (
    <div
      className="dashboard-route-sky-wrap dashboard-shell--clarion-home dashboard-shell--sky-active"
      data-sky={displaySkyMood}
      data-night-incomplete={state.nightIncomplete ? "true" : undefined}
    >
      <div className="dashboard-sky-stack" aria-hidden>
        <div
          className="dashboard-sky-plane"
          data-sky={sky.bottom.mood}
          style={{
            opacity: sky.bottom.opacity,
            transition: `opacity ${sky.crossfadeMs}ms ease-in-out`,
          }}
        >
          <div className="dashboard-sky-plane__base" aria-hidden />
          <div className="dashboard-sky-plane__light" aria-hidden />
          <div className="dashboard-sky-plane__clouds" aria-hidden />
          <div className="dashboard-sky-plane__rain" aria-hidden />
          <div className="dashboard-sky-plane__lightning" aria-hidden />
          <div className="dashboard-sky-plane__stars" aria-hidden />
          <div className="dashboard-sky-plane__veil" aria-hidden />
        </div>
        <div
          className="dashboard-sky-plane"
          data-sky={sky.top.mood}
          style={{
            opacity: sky.top.opacity,
            transition: `opacity ${sky.crossfadeMs}ms ease-in-out`,
          }}
          onTransitionEnd={sky.onTopTransitionEnd}
        >
          <div className="dashboard-sky-plane__base" aria-hidden />
          <div className="dashboard-sky-plane__light" aria-hidden />
          <div className="dashboard-sky-plane__clouds" aria-hidden />
          <div className="dashboard-sky-plane__rain" aria-hidden />
          <div className="dashboard-sky-plane__lightning" aria-hidden />
          <div className="dashboard-sky-plane__stars" aria-hidden />
          <div className="dashboard-sky-plane__veil" aria-hidden />
        </div>
      </div>
      <div className="dashboard-app-content dashboard-app-content--over-sky">{children}</div>
    </div>
  )
}
