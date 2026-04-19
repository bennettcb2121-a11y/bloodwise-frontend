import { describe, expect, it } from "vitest"
import { getRecommendedAmazonUrlForPreset, getAmazonSearchUrl } from "./stackAffiliate"
import { getSupplementPreset } from "./supplementMetadata"

describe("getRecommendedAmazonUrlForPreset", () => {
  it("returns a /dp/ deep link for mapped presets (vitamin D)", () => {
    const p = getSupplementPreset("vitamin_d")!
    const url = getRecommendedAmazonUrlForPreset(p)
    expect(url).toContain("amazon.com")
    expect(url).toContain("/dp/")
    expect(url).toContain("tag=")
  })

  it("returns a /dp/ link for turmeric using curcumin-tier pick", () => {
    const p = getSupplementPreset("turmeric")!
    const url = getRecommendedAmazonUrlForPreset(p)
    expect(url).toContain("/dp/")
  })

  it("falls back to search for unmapped presets", () => {
    const p = getSupplementPreset("creatine")!
    const url = getRecommendedAmazonUrlForPreset(p)
    expect(url).toContain("/s?")
    expect(url).toContain("k=")
    expect(url).toBe(getAmazonSearchUrl(p.displayName))
  })
})
