"use client"

import React, { useState } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { getReauthOAuthNext } from "@/src/lib/reauthPrompt"
import type { OAuthProvider } from "@/src/contexts/AuthContext"

type Mode = "idle" | "login" | "signup"

const OAUTH_PROVIDERS: { provider: OAuthProvider; label: string }[] = [
  { provider: "google", label: "Continue with Google" },
]

export function AuthUI() {
  const { user, loading, signIn, signUp, signInWithOAuth, signOut } = useAuth()
  const [mode, setMode] = useState<Mode>("idle")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password)
        if (error) setMessage({ type: "error", text: error.message })
        else setMessage({ type: "ok", text: "Check your email to confirm your account." })
      } else {
        const { error } = await signIn(email, password)
        if (error) setMessage({ type: "error", text: error.message })
        else setMode("idle")
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-ui auth-ui-loading">
        <span className="auth-ui-loading-text">Loading…</span>
      </div>
    )
  }

  if (user) {
    return (
      <div className="auth-ui auth-ui-signed-in">
        <span className="auth-ui-email">{user.email}</span>
        <button type="button" className="auth-ui-btn auth-ui-btn-out" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  if (mode === "idle") {
    return (
      <div className="auth-ui auth-ui-idle">
        <div className="auth-ui-oauth-row">
          {OAUTH_PROVIDERS.map(({ provider, label }) => (
            <button
              key={provider}
              type="button"
              className="auth-ui-btn auth-ui-btn-oauth"
              onClick={async () => {
                setMessage(null)
                const next = typeof window !== "undefined" ? getReauthOAuthNext() : null
                const { error } = await signInWithOAuth(provider, next ? { next } : undefined)
                if (error) setMessage({ type: "error", text: error.message })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="auth-ui-divider-wrap">
          <span className="auth-ui-divider" aria-hidden />
          <span className="auth-ui-divider-text">or</span>
          <span className="auth-ui-divider" aria-hidden />
        </div>
        <div className="auth-ui-email-row">
          <button
            type="button"
            className="auth-ui-btn auth-ui-btn-ghost"
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <span className="auth-ui-idle-divider" aria-hidden>·</span>
          <button
            type="button"
            className="auth-ui-btn auth-ui-btn-primary"
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        {message && (
          <p className={message.type === "error" ? "auth-ui-message auth-ui-message-error" : "auth-ui-message auth-ui-message-ok"}>
            {message.text}
          </p>
        )}
      </div>
    )
  }

  const formTitle = mode === "signup" ? "Create account" : "Log in"

  return (
    <div className="auth-ui auth-ui-form-wrap">
      <div className="auth-ui-form-card">
        <h3 className="auth-ui-form-title">{formTitle}</h3>
        <div className="auth-ui-oauth-row auth-ui-oauth-in-form">
          {OAUTH_PROVIDERS.map(({ provider, label }) => (
            <button
              key={provider}
              type="button"
              className="auth-ui-btn auth-ui-btn-oauth"
              onClick={async () => {
                setMessage(null)
                const next = typeof window !== "undefined" ? getReauthOAuthNext() : null
                const { error } = await signInWithOAuth(provider, next ? { next } : undefined)
                if (error) setMessage({ type: "error", text: error.message })
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="auth-ui-divider-wrap">
          <span className="auth-ui-divider" aria-hidden />
          <span className="auth-ui-divider-text">or use email</span>
          <span className="auth-ui-divider" aria-hidden />
        </div>
        <form className="auth-ui-form" onSubmit={handleSubmit}>
          <div className="auth-ui-field">
            <label htmlFor="auth-email" className="auth-ui-label">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-ui-input"
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-ui-field">
            <label htmlFor="auth-password" className="auth-ui-label">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-ui-input"
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
            />
          </div>
          <div className="auth-ui-form-actions">
            <button type="submit" className="auth-ui-btn auth-ui-btn-primary auth-ui-btn-submit" disabled={busy}>
              {mode === "signup" ? "Create account" : "Log in"}
            </button>
            <button
              type="button"
              className="auth-ui-btn auth-ui-btn-ghost auth-ui-btn-back"
              onClick={() => {
                setMode("idle")
                setMessage(null)
              }}
            >
              Back
            </button>
          </div>
          {message && (
            <p className={message.type === "error" ? "auth-ui-message auth-ui-message-error" : "auth-ui-message auth-ui-message-ok"}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
