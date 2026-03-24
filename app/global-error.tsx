"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0a0a0b",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ margin: 0, color: "#a1a1aa", maxWidth: 420 }}>
          A critical error occurred. Please reload the page or try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#22c55e",
            color: "#0a0a0b",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
