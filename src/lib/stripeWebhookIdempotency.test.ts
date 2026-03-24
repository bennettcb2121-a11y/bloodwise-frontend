import { describe, expect, it } from "vitest"
import { isDuplicateKeyError } from "./stripeWebhookIdempotency"

describe("isDuplicateKeyError", () => {
  it("detects postgres unique violation", () => {
    expect(isDuplicateKeyError({ code: "23505", message: "" })).toBe(true)
  })

  it("detects duplicate in message", () => {
    expect(isDuplicateKeyError({ message: "duplicate key value violates unique constraint" })).toBe(true)
  })

  it("returns false for other errors", () => {
    expect(isDuplicateKeyError({ code: "42P01", message: "relation does not exist" })).toBe(false)
  })
})
