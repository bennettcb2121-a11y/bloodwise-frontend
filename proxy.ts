import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Edge middleware (Next.js 16 renamed `middleware.ts` → `proxy.ts`).
 *
 * Two jobs per request:
 *   1. Keep the Supabase auth cookie fresh — `supabase.auth.getUser()` will auto-refresh
 *      an expired access token using the refresh token cookie and pipe the new cookies
 *      through to the response. Without this, tokens go stale during quiet periods and
 *      after Vercel cache invalidations (e.g. every redeploy), which was booting users
 *      back to the login screen. Follows Supabase's official `@supabase/ssr` pattern.
 *   2. Apply baseline security headers.
 *
 * CSP is intentionally not set here — Next.js + third-party scripts need a tuned policy;
 * add via next.config headers or report-only CSP when ready.
 */
export async function proxy(request: NextRequest) {
  // Start with a response that carries the (possibly mutated) request forward.
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Only attempt session refresh when Supabase is configured — in dev without env vars we
  // still want security headers to apply instead of 500'ing the request.
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mirror Supabase's cookie writes onto both the incoming request (so any
          // downstream read in this same request sees the fresh value) and the outgoing
          // response (so the browser persists the refresh).
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // Touch the auth user to trigger a refresh if the access token is near/past expiry.
    // Any errors here (network flake, revoked session, missing env) are intentionally
    // swallowed — we don't want to 500 the user-facing request just because Supabase had
    // a hiccup. The client-side auth context will re-hydrate as needed.
    try {
      await supabase.auth.getUser()
    } catch {
      // no-op
    }
  }

  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("X-DNS-Prefetch-Control", "on")
  return response
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|lottie)$).*)",
  ],
}
