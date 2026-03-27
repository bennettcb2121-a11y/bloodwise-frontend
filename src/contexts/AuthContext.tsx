"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { clearBrandIntroSessionFlag } from "@/src/lib/brandIntro"
import { setReauthPromptAfterLogout, setPostAuthRedirectCookieFromPath } from "@/src/lib/reauthPrompt"
import { supabase } from "@/src/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

export type OAuthProvider = "google" | "apple"

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithOAuth: (provider: OAuthProvider, options?: { next?: string }) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
      })
      .catch(() => {
        // Network / CORS / invalid Supabase URL — avoid unhandled rejection (shows as Next.js overlay in dev)
        setSession(null)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase not configured") as Error }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ?? null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase not configured") as Error }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ?? null }
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider, options?: { next?: string }) => {
    if (!supabase) return { error: new Error("Supabase not configured") as Error }
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const nextPath = options?.next?.startsWith("/") ? options.next : "/dashboard"
    if (options?.next?.startsWith("/")) {
      setPostAuthRedirectCookieFromPath(nextPath)
    }
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      const callbackBase = `${origin}/auth/callback`
      console.info(
        `[Clarion] OAuth redirectTo → ${callbackBase} (and ?next=…)\n` +
          `If Google sends you to production (e.g. clarionlabs.tech) instead of this origin, add this to Supabase → Authentication → URL Configuration → Redirect URLs:\n` +
          `  ${callbackBase}\n` +
          `or: ${origin}/**\n` +
          `Docs: docs/LOCALHOST_GOOGLE_LOGIN.md`
      )
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    return { error: error ?? null }
  }, [])

  const signOut = useCallback(async () => {
    clearBrandIntroSessionFlag()
    setReauthPromptAfterLogout()
    if (supabase) await supabase.auth.signOut()
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx == null) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
