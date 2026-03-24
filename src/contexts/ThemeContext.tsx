"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "clarion-theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return v === "light" || v === "dark" || v === "system" ? v : "system"
  } catch {
    return "system"
  }
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode
}

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark")

  useEffect(() => {
    setThemeState(getStoredMode())
  }, [])

  useEffect(() => {
    const next = resolveTheme(theme)
    setResolvedTheme(next)
    document.documentElement.setAttribute("data-theme", next)
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const onChange = () => {
      setResolvedTheme(mq.matches ? "light" : "dark")
      document.documentElement.setAttribute("data-theme", mq.matches ? "light" : "dark")
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
