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
   it("returns night only for late night (11pm–5am), not early evening", () => {
    expect(getDashboardSkyMood(base({ hour: 20, protocolTodayX: 0, protocolTodayY: 2, daysSinceLog: 0 }))).toBe("drizzle")
    expect(getDashboardSkyMood(base({ hour: 22, protocolTodayX: 4, protocolTodayY: 4, protocolTodayComplete: true }))).toBe(
      "perfect"
    )
    expect(getDashboardSkyMood(base({ hour: 23 }))).toBe("night")
  })

  it("returns night for midnight–4am", () => {
    expect(getDashboardSkyMood(base({ hour: 0 }))).toBe("night")
    expect(getDashboardSkyMood(base({ hour: 4 }))).toBe("night")
  })

  it("after 5am uses protocol mood, not forced night", () => {
    expect(
      getDashboardSkyMood(base({ hour: 5, protocolTodayX: 0, protocolTodayY: 2, protocolTodayComplete: false, daysSinceLog: 0 }))
    ).toBe("drizzle")
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

  it("without stack follows time of day (afternoon = clear)", () => {
    expect(getDashboardSkyMood(base({ hasStack: false, hour: 14, protocolTodayY: 0 }))).toBe("clear")
  })

  it("without stack at dusk uses sunset", () => {
    expect(getDashboardSkyMood(base({ hasStack: false, hour: 18, protocolTodayY: 0 }))).toBe("sunset")
  })

  it("unknown protocol completion uses time mood not calm", () => {
    expect(
      getDashboardSkyMood(
        base({ hour: 9, protocolTodayComplete: null, protocolTodayX: 0, protocolTodayY: 3 })
      )
    ).toBe("clear")
  })
})
