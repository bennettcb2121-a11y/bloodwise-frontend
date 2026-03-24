import { describe, expect, it } from "vitest"
import { createSlidingWindowRateLimiter } from "./apiRateLimit"

describe("createSlidingWindowRateLimiter", () => {
  it("allows up to max requests per window", () => {
    const limiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 3 })
    expect(limiter.allow("a")).toBe(true)
    expect(limiter.allow("a")).toBe(true)
    expect(limiter.allow("a")).toBe(true)
    expect(limiter.allow("a")).toBe(false)
  })

  it("isolates keys", () => {
    const limiter = createSlidingWindowRateLimiter({ windowMs: 60_000, max: 1 })
    expect(limiter.allow("x")).toBe(true)
    expect(limiter.allow("y")).toBe(true)
  })
})
