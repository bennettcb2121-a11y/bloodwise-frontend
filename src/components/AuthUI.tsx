"use client"

import React, { useState } from "react"
import { useAuth } from "@/src/contexts/AuthContext"

type Mode = "idle" | "login" | "signup"

export function AuthUI() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
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
    )
  }

  const formTitle = mode === "signup" ? "Create account" : "Log in"

  return (
    <div className="auth-ui auth-ui-form-wrap">
      <div className="auth-ui-form-card">
        <h3 className="auth-ui-form-title">{formTitle}</h3>
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
