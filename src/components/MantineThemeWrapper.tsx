"use client"

import React from "react"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { useTheme } from "@/src/contexts/ThemeContext"

/**
 * Wraps Mantine with the app's resolved theme so notifications and Mantine components
 * use light/dark consistently (e.g. toasts visible in light mode).
 */
export function MantineThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  return (
    <MantineProvider forceColorScheme={resolvedTheme}>
      <Notifications />
      {children}
    </MantineProvider>
  )
}
