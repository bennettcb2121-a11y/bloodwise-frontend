"use client"

import React, { Suspense, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { AuthUI } from "@/src/components/AuthUI"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { shouldShowReauthPrompt } from "@/src/lib/reauthPrompt"
import { SupportAuthFooter } from "@/src/components/SupportContactHints"

/** Only allow same-origin relative paths to prevent open redirects. */
function safeNextParam(p: string | null): string | null {
  if (!p) return null
  if (!p.startsWith("/")) return null
  if (p.startsWith("//")) return null
  return p
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const nextPath = useMemo(() => safeNextParam(searchParams.get("next")), [searchParams])

  useEffect(() => {
    if (!authLoading && user) {
      try {
        if (typeof window !== "undefined" && shouldShowReauthPrompt()) {
          router.replace("/?reauth=1")
          return
        }
      } catch {
        // ignore
      }
      router.replace(nextPath ?? "/dashboard")
    }
  }, [authLoading, user, router, nextPath])

  if (authLoading || user) {
    return (
      <main className="login-page">
        <div className="login-page-container">
          <p className="login-page-loading">
            {authLoading && !user ? "Checking session…" : "Taking you where you were headed…"}
          </p>
        </div>
        <style jsx>{`
          .login-page {
            min-height: 100vh;
            background: var(--color-bg);
            color: var(--color-text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 20px;
          }
          .login-page-container { text-align: center; }
          .login-page-loading { color: var(--color-text-secondary); margin: 0; }
        `}</style>
      </main>
    )
  }

  return (
    <main className="login-page">
      <div className="login-page-container">
        <ClarionLabsLogo variant="page" href="/" linkClassName="login-page-logo" />
        <h1 className="login-page-title">Sign in</h1>
        <p className="login-page-subtitle">Create an account or log in to save your results and access your dashboard. Sign in with Google for the fastest way in.</p>
        <div className="login-page-card">
          <AuthUI next={nextPath} />
        </div>
        <p className="login-page-back">
          <Link href="/">← Back to home</Link>
        </p>
        <SupportAuthFooter />
      </div>
      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .login-page-container {
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .login-page-logo {
          display: inline-flex;
          margin-bottom: 28px;
          text-decoration: none;
          color: inherit;
        }
        .login-page-logo:hover .clarion-labs-logo-name {
          opacity: 0.9;
        }
        .login-page-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
          margin: 0 0 8px;
        }
        .login-page-subtitle {
          font-size: 16px;
          color: var(--color-text-secondary);
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .login-page-card {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: var(--shadow-md);
        }
        .login-page-back {
          margin-top: 24px;
          font-size: 14px;
        }
        .login-page-back a {
          color: var(--color-text-muted);
          text-decoration: none;
        }
        .login-page-back a:hover {
          color: var(--color-accent);
        }
      `}</style>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  )
}
