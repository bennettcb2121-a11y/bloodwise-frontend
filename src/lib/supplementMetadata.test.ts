import { describe, expect, it } from "vitest"
import {
  parseCurrentSupplementsList,
  parseCurrentSupplementsEntries,
  serializeCurrentSupplementsEntries,
} from "./supplementMetadata"

describe("parseCurrentSupplementsEntries", () => {
  it("parses legacy comma list and resolves aliases to presets", () => {
    const e = parseCurrentSupplementsEntries("Vitamin D, fish oil")
    expect(e.map((x) => x.name)).toEqual(["Vitamin D", "Omega-3 / Fish oil"])
    expect(e[1].id).toBe("omega3")
  })

  it("parses JSON objects with optional url", () => {
    const raw = JSON.stringify([{ id: "vitamin_d", name: "Vitamin D", productUrl: "https://example.com/d" }])
    const e = parseCurrentSupplementsEntries(raw)
    expect(e[0].id).toBe("vitamin_d")
    expect(e[0].productUrl).toContain("example.com")
  })
})

describe("parseCurrentSupplementsList for comparison", () => {
  it("returns preset ids when present", () => {
    const raw = JSON.stringify([{ id: "magnesium", name: "Magnesium" }])
    expect(parseCurrentSupplementsList(raw)).toEqual(["magnesium"])
  })

  it("keeps legacy string array", () => {
    expect(parseCurrentSupplementsList('["vitamin_d","b12"]')).toEqual(["vitamin_d", "b12"])
  })
})

describe("serializeCurrentSupplementsEntries", () => {
  it("round-trips", () => {
    const e = [
      { id: "vitamin_d" as const, name: "Vitamin D" },
      { name: "Custom", productUrl: "https://a.com" },
    ]
    const s = serializeCurrentSupplementsEntries(e)
    const back = parseCurrentSupplementsEntries(s)
    expect(back.length).toBe(2)
    expect(back[1].name).toBe("Custom")
    expect(back[1].productUrl).toContain("a.com")
  })
})
