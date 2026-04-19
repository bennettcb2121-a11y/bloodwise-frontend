import { describe, expect, it } from "vitest"
import {
  mergeSupplementNamesIntoSerialized,
  parseCurrentSupplementsList,
  parseCurrentSupplementsEntries,
  serializeCurrentSupplementsEntries,
  searchSupplementPresets,
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

  it("does not coerce sodium/potassium into the electrolytes preset when id was mis-set", () => {
    const raw = JSON.stringify([{ id: "electrolytes", name: "Sodium" }])
    const e = parseCurrentSupplementsEntries(raw)
    expect(e[0].id).toBeUndefined()
    expect(e[0].name).toBe("Sodium")
  })

  it("does not coerce bare whey/protein into the protein powder preset when id was mis-set", () => {
    const raw = JSON.stringify([{ id: "protein_powder", name: "whey" }])
    const e = parseCurrentSupplementsEntries(raw)
    expect(e[0].id).toBeUndefined()
    expect(e[0].name).toBe("whey")
  })
})

describe("mergeSupplementNamesIntoSerialized", () => {
  it("stores ambiguous tokens as custom names instead of lifestyle presets", () => {
    const s = mergeSupplementNamesIntoSerialized("", ["sodium", "whey"])
    const e = parseCurrentSupplementsEntries(s)
    expect(e.map((x) => x.name)).toEqual(["sodium", "whey"])
    expect(e.every((x) => !x.id)).toBe(true)
  })

  it("still maps explicit electrolyte and protein labels to presets", () => {
    const s = mergeSupplementNamesIntoSerialized("", ["electrolytes", "protein powder"])
    const e = parseCurrentSupplementsEntries(s)
    expect(e.map((x) => ({ id: x.id, name: x.name }))).toEqual([
      { id: "electrolytes", name: "Electrolytes" },
      { id: "protein_powder", name: "Protein powder" },
    ])
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

describe("searchSupplementPresets", () => {
  it("returns all presets for empty query", () => {
    expect(searchSupplementPresets("").length).toBeGreaterThan(5)
  })

  it("matches aliases (fish oil → omega3)", () => {
    const r = searchSupplementPresets("fish oil", 5)
    expect(r[0]?.id).toBe("omega3")
  })

  it("matches partial label", () => {
    const r = searchSupplementPresets("magn", 3)
    expect(r.map((p) => p.id)).toContain("magnesium")
  })

  it("matches curcumin alias to turmeric preset", () => {
    const r = searchSupplementPresets("curcumin", 5)
    expect(r[0]?.id).toBe("turmeric")
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
