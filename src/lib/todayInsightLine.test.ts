import { describe, expect, it } from "vitest"
import { getTodayInsightLine } from "./todayInsightLine"

describe("getTodayInsightLine", () => {
  it("prefers doThisFirst line", () => {
    expect(
      getTodayInsightLine({
        doThisFirst: { line: "Check off your stack.", title: "x" },
        heroFocusTitle: "Ignore",
        featuredMicro: "micro",
        featuredLabel: "label",
      })
    ).toBe("Check off your stack.")
  })

  it("falls back to featured micro", () => {
    expect(
      getTodayInsightLine({
        doThisFirst: null,
        heroFocusTitle: "Focus title",
        featuredMicro: "Take magnesium with food.",
        featuredLabel: null,
      })
    ).toBe("Take magnesium with food.")
  })
})
