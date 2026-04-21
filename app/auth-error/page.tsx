"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { SupportContactHint } from "@/src/components/SupportContactHints"

const DEFAULT_MESSAGE = "Something went wrong signing you in."

export default function AuthErrorPage() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [rawError, setRawError] = useState<string | null>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const msg = params.get("message") || DEFAULT_MESSAGE
    const err = params.get("error") || null
    const local =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    queueMicrotask(() => {
      setMessage(msg)
      setRawError(err)
      setIsLocalhost(local)
    })
  }, [])

  return (
    <main className="auth-error-page">
      <h1>Sign-in issue</h1>
      <p>{message}</p>
      {rawError && (
        <p className="auth-error-page-raw">Details: {rawError}</p>
      )}
      {rawError?.toLowerCase().includes("invalid api key") && (
        <p className="auth-error-page-hint">
          Set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</strong> in <strong>.env.local</strong> (from Supabase → Settings → API: Project URL and anon public key). Restart the dev server (<code>npm run dev</code>) after changing env.
        </p>
      )}
      {isLocalhost && !rawError?.toLowerCase().includes("invalid api key") && (
        <p className="auth-error-page-hint">
          In Supabase → Authentication → URL Configuration: add <strong>http://localhost:3000/auth/callback</strong> to Redirect URLs (use http, not https), then click <strong>Save changes</strong> at the top of that section.
        </p>
      )}
      <SupportContactHint />
      <Link href="/login">Try again</Link>
      <span className="auth-error-page-sep"> · </span>
      <Link href="/">Back to home</Link>
      <style jsx>{`
        .auth-error-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--color-bg);
          color: var(--color-text-primary);
        }
        .auth-error-page h1 {
          font-size: 20px;
          margin: 0 0 12px;
        }
        .auth-error-page p {
          color: var(--color-text-secondary);
          margin: 0 0 24px;
          text-align: center;
        }
        .auth-error-page a {
          color: var(--color-accent);
          text-decoration: none;
        }
        .auth-error-page a:hover { text-decoration: underline; }
        .auth-error-page-hint {
          font-size: 13px;
          max-width: 360px;
          margin: 0 auto 20px;
          padding: 12px;
          background: var(--color-surface);
          border-radius: 8px;
          color: var(--color-text-secondary);
        }
        .auth-error-page-hint strong { color: var(--color-text-primary); word-break: break-all; }
        .auth-error-page-hint code { font-size: 12px; padding: 2px 6px; background: var(--color-bg-muted); border-radius: 4px; }
        .auth-error-page-raw {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0 0 16px;
          max-width: 420px;
          word-break: break-word;
        }
        .auth-error-page-sep { color: var(--color-text-muted); margin: 0 4px; }
        .auth-error-page .clarion-support-hint {
          text-align: center;
          margin-top: 0;
          margin-bottom: 20px;
          max-width: 360px;
        }
      `}</style>
    </main>
  )
}
