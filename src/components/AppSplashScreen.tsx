"use client"

import React from "react"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"

export function AppSplashScreen() {
  return (
    <div className="app-splash" role="status" aria-label="Loading">
      <div className="app-splash-inner">
        <ClarionLabsLogo variant="splash" />
      </div>
    </div>
  )
}
