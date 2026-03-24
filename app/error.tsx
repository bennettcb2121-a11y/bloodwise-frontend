"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"

export default function Error({
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
    <main
      className="app-boundary-error"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--color-bg, #0a0a0b)",
        color: "var(--color-text, #f5f5f5)",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
      <p style={{ margin: 0, color: "var(--color-text-muted, #a1a1aa)", maxWidth: 420 }}>
        We couldn&apos;t load this screen. You can try again or go back home.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "var(--color-accent, #22c55e)",
            color: "#0a0a0b",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid var(--color-border, #27272a)",
            color: "var(--color-text, #f5f5f5)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Home
        </Link>
      </div>
    </main>
  )
}
