import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { POST_AUTH_REDIRECT_COOKIE } from "@/src/lib/reauthPrompt"

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    if (k !== name) continue
    return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}

function safeInternalPath(p: string | null): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return null
  return p
}

function getRedirectOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") || url.host
  const isLocalhost =
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".localhost") ||
    host.includes("localhost")
  const protocol = isLocalhost ? "http" : (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", ""))
  return `${protocol}://${host}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const origin = getRedirectOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const nextFromQuery = safeInternalPath(searchParams.get("next"))
      const nextFromCookie = safeInternalPath(getCookie(request, POST_AUTH_REDIRECT_COOKIE))
      // Prefer explicit query (when Supabase preserves it); else cookie from logout (OAuth often drops custom query params).
      const safeNext = nextFromQuery ?? nextFromCookie ?? "/dashboard"
      const res = NextResponse.redirect(`${origin}${safeNext}`)
      res.cookies.set(POST_AUTH_REDIRECT_COOKIE, "", { path: "/", maxAge: 0 })
      return res
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message)
    }
    const errMsg = encodeURIComponent(error.message)
    return NextResponse.redirect(`${origin}/auth-error?message=Could not sign you in&error=${errMsg}`)
  }

  return NextResponse.redirect(`${origin}/auth-error?message=Could not sign you in`)
}
