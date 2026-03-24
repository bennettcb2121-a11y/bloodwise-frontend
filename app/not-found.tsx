import Link from "next/link"

export default function NotFound() {
  return (
    <main
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
        gap: "12px",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Page not found</h1>
      <p style={{ margin: 0, color: "var(--color-text-muted, #a1a1aa)" }}>
        That URL doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          color: "var(--color-accent, #22c55e)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Back to Clarion
      </Link>
    </main>
  )
}
