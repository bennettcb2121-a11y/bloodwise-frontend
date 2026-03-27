"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { DashboardSkyMood } from "@/src/lib/dashboardSkyMood"

type AtmosphereState = {
  /** When set (e.g. Home with bloodwork), drives the layered sky; otherwise ambient time-of-day is used. */
  moodOverride: DashboardSkyMood | null
  nightIncomplete: boolean
}

const defaultState: AtmosphereState = {
  moodOverride: null,
  nightIncomplete: false,
}

const DashboardSkyAtmosphereContext = createContext<{
  state: AtmosphereState
  setAtmosphere: (next: Partial<AtmosphereState> | null) => void
} | null>(null)

export function DashboardSkyAtmosphereProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AtmosphereState>(defaultState)

  const setAtmosphere = useCallback((next: Partial<AtmosphereState> | null) => {
    if (next === null) setState(defaultState)
    else setState((prev) => ({ ...prev, ...next }))
  }, [])

  const value = useMemo(() => ({ state, setAtmosphere }), [state, setAtmosphere])

  return <DashboardSkyAtmosphereContext.Provider value={value}>{children}</DashboardSkyAtmosphereContext.Provider>
}

export function useDashboardSkyAtmosphere(): {
  state: AtmosphereState
  setAtmosphere: (next: Partial<AtmosphereState> | null) => void
} {
  const ctx = useContext(DashboardSkyAtmosphereContext)
  if (!ctx) {
    throw new Error("useDashboardSkyAtmosphere must be used within DashboardSkyAtmosphereProvider")
  }
  return ctx
}
