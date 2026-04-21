import type { NextRequest } from "next/server"

type Bucket = { count: number; resetAt: number }

/** In-memory sliding window (per server instance). For distributed rate limits use Upstash Redis. */
export function createSlidingWindowRateLimiter(options: { windowMs: number; max: number }) {
  const { windowMs, max } = options
  const buckets = new Map<string, Bucket>()

  return {
    allow(key: string): boolean {
      const now = Date.now()
      const b = buckets.get(key)
      if (!b || now > b.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      if (b.count >= max) return false
      b.count += 1
      return true
    },
  }
}

export function getClientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for")
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown"
  return req.headers.get("x-real-ip") ?? "unknown"
}

/** Clarion assistant — authenticated users; limit per IP to cap OpenAI cost */
export const chatRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 20 })

/** Support chat FAQ + OpenAI fallback */
export const supportChatRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 24 })

/** Barcode / supplement insight — authenticated; cap cost */
export const supplementInsightRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 12 })

/** Unauthenticated barcode resolve (OFF + optional DSLD proxy) */
export const barcodeResolveRateLimiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 12 })
