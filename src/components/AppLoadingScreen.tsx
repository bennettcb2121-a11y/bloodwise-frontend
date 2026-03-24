"use client"

import React, { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { BRAND_LOADING_DURATION_MS } from "@/src/lib/brandIntro"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false }
)

const LOADING_LINES = [
  "Analyzing your health profile…",
  "Syncing biomarker data…",
  "Updating your plan…",
  "Understanding your results…",
  "Preparing your dashboard…",
]

const LINE_ROTATE_MS = BRAND_LOADING_DURATION_MS / LOADING_LINES.length

export function AppLoadingScreen() {
  const [lineIndex, setLineIndex] = useState(0)
  const [lottieData, setLottieData] = useState<ArrayBuffer | null>(null)
  const [lottieError, setLottieError] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % LOADING_LINES.length)
    }, LINE_ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/triathlon.lottie")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.arrayBuffer()
      })
      .then((buf) => {
        if (!cancelled) setLottieData(buf)
      })
      .catch(() => {
        if (!cancelled) setLottieError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app-loading" role="status" aria-live="polite" aria-label="Loading">
      <div className="app-loading-inner">
        <div className="app-loading-lottie" aria-hidden>
          {lottieError ? (
            <div className="app-loading-lottie-fallback" aria-hidden />
          ) : lottieData ? (
            <DotLottieReact
              data={lottieData}
              loop
              autoplay
              style={{ width: "100%", height: "100%", maxWidth: 240, maxHeight: 240 }}
            />
          ) : (
            <div className="app-loading-lottie-fallback" aria-hidden />
          )}
        </div>
        <p className="app-loading-text">{LOADING_LINES[lineIndex]}</p>
        <div className="app-loading-dots">
          {LOADING_LINES.map((_, i) => (
            <span
              key={i}
              className={`clarion-loading-dot ${i === lineIndex ? "clarion-loading-dot--active" : ""}`}
              aria-hidden
            />
          ))}
        </div>
        <div className="app-loading-bar-wrap">
          <div className="app-loading-bar" aria-hidden />
        </div>
      </div>
    </div>
  )
}
