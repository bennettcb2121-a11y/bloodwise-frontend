import { describe, it, expect } from "vitest"
import { clampDailyMetrics } from "./dailyMetrics"

describe("dailyMetrics", () => {
  it("clamps activity and sun", () => {
    expect(clampDailyMetrics({ activity_level: 99 })).toEqual({ activity_level: 5 })
    expect(clampDailyMetrics({ sun_minutes: 9999 })).toEqual({ sun_minutes: 600 })
  })

  it("drops invalid weight", () => {
    expect(clampDailyMetrics({ weight_kg: 0 })).toEqual({})
    expect(clampDailyMetrics({ weight_kg: 75 })).toEqual({ weight_kg: 75 })
  })
})
