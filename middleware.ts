import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Security headers for all routes. CSP is intentionally not set here — Next.js + third-party scripts
 * need a tuned policy; add via next.config headers or report-only CSP when ready.
 */
// NextRequest kept for future auth / routing; signature required by Next.js.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
export function middleware(_request: NextRequest) {
  const res = NextResponse.next()
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  res.headers.set("X-DNS-Prefetch-Control", "on")
  return res
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|lottie)$).*)",
  ],
}
