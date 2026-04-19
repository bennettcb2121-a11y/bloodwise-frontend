import { describe, expect, it, afterEach, vi } from "vitest"
import { getOpenAiApiKey } from "./openaiEnv"

describe("getOpenAiApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns trimmed key from OPENAI_API_KEY", () => {
    vi.stubEnv("OPENAI_API_KEY", "  sk-test  ")
    expect(getOpenAiApiKey()).toBe("sk-test")
  })

  it("falls back to OPENAI_KEY", () => {
    vi.stubEnv("OPENAI_KEY", "sk-fallback")
    expect(getOpenAiApiKey()).toBe("sk-fallback")
  })

  it("returns null when unset", () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("OPENAI_KEY", "")
    vi.stubEnv("OPENAI_SECRET_KEY", "")
    expect(getOpenAiApiKey()).toBeNull()
  })
})
