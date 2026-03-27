import { describe, expect, it } from "vitest"
import { getDashboardSkyMood } from "./dashboardSkyMood"

function base(overrides: Partial<Parameters<typeof getDashboardSkyMood>[0]> = {}) {
  return {
    hour: 14,
    hasStack: true,
    protocolTodayY: 4,
    protocolTodayX: 0,
    protocolTodayComplete: false as boolean | null,
    daysSinceLog: 0 as number | null,
    ...overrides,
  }
}

describe("getDashboardSkyMood", () => {
  it("returns night for 8pm–11pm", () => {
    expect(getDashboardSkyMood(base({ hour: 20 }))).toBe("night")
    expect(getDashboardSkyMood(base({ hour: 23 }))).toBe("night")
  })

  it("returns night for midnight–5am", () => {
    expect(getDashboardSkyMood(base({ hour: 0 }))).toBe("night")
    expect(getDashboardSkyMood(base({ hour: 5 }))).toBe("night")
  })

  it("returns storm when long gap and behind", () => {
    expect(
      getDashboardSkyMood(
        base({ hour: 15, protocolTodayX: 0, protocolTodayY: 2, protocolTodayComplete: false, daysSinceLog: 4 })
      )
    ).toBe("storm")
  })

  it("returns drizzle when nothing checked today (not storm)", () => {
    expect(
      getDashboardSkyMood(
        base({ hour: 15, protocolTodayX: 0, protocolTodayY: 2, protocolTodayComplete: false, daysSinceLog: 0 })
      )
    ).toBe("drizzle")
  })

  it("returns sunrise below 50% progress", () => {
    expect(
      getDashboardSkyMood(base({ hour: 11, protocolTodayX: 1, protocolTodayY: 4, protocolTodayComplete: false }))
    ).toBe("sunrise")
  })

  it("returns clear between 50% and 100%", () => {
    expect(
      getDashboardSkyMood(base({ hour: 10, protocolTodayX: 3, protocolTodayY: 4, protocolTodayComplete: false }))
    ).toBe("clear")
  })

  it("returns perfect when all done", () => {
    expect(
      getDashboardSkyMood(base({ hour: 10, protocolTodayX: 4, protocolTodayY: 4, protocolTodayComplete: true }))
    ).toBe("perfect")
  })

  it("returns calm without stack", () => {
    expect(getDashboardSkyMood(base({ hasStack: false, hour: 14, protocolTodayY: 0 }))).toBe("calm")
  })
})
