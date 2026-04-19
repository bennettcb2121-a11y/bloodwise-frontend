"use client"

import React from "react"
import { useTheme } from "@/src/contexts/ThemeContext"
import { Sun, Moon } from "lucide-react"

const LABEL_LIGHT = "Switch to dark mode"
const LABEL_DARK = "Switch to light mode"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? LABEL_DARK : LABEL_LIGHT}
      title={isDark ? LABEL_DARK : LABEL_LIGHT}
      className={`theme-toggle ${className}`}
    >
      {isDark ? (
        <Sun size={20} strokeWidth={2} aria-hidden />
      ) : (
        <Moon size={20} strokeWidth={2} aria-hidden />
      )}
    </button>
  )
}
