import { describe, it, expect } from "vitest"
import {
  addDaysToIsoDate,
  getBetweenPanelsWindow,
  aggregateMetricsForWindow,
  computeMarkerDeltas,
} from "./betweenPanelsInsight"
import type { BloodworkSaveRow } from "./bloodwiseDb"

describe("betweenPanelsInsight", () => {
  it("addDaysToIsoDate", () => {
    expect(addDaysToIsoDate("2025-01-01", 1)).toBe("2025-01-02")
    expect(addDaysToIsoDate("2025-01-01", -1)).toBe("2024-12-31")
  })

  it("getBetweenPanelsWindow excludes panel dates", () => {
    const older: BloodworkSaveRow = {
      user_id: "u",
      selected_panel: [],
      biomarker_inputs: {},
      current_step: 1,
      stack_snapshot: {},
      savings_snapshot: {},
      created_at: "2025-01-01T10:00:00.000Z",
    }
    const newer: BloodworkSaveRow = {
      user_id: "u",
      selected_panel: [],
      biomarker_inputs: {},
      current_step: 1,
      stack_snapshot: {},
      savings_snapshot: {},
      created_at: "2025-01-10T10:00:00.000Z",
    }
    const w = getBetweenPanelsWindow(older, newer)
    expect(w).not.toBeNull()
    expect(w!.startDate).toBe("2025-01-02")
    expect(w!.endDate).toBe("2025-01-09")
  })

  it("aggregateMetricsForWindow averages", () => {
    const agg = aggregateMetricsForWindow([
      { metrics: { activity_level: 4, sun_minutes: 30 } },
      { metrics: { activity_level: 2, sun_minutes: 10 } },
    ])
    expect(agg.daysWithMetrics).toBe(2)
    expect(agg.avgActivity).toBe(3)
    expect(agg.avgSunMinutes).toBe(20)
  })

  it("computeMarkerDeltas matches marker names", () => {
    const d = computeMarkerDeltas(
      { Ferritin: 20, "Vitamin D": 25 },
      { Ferritin: 45, "Vitamin D": 28 },
      {}
    )
    const ferritin = d.find((x) => x.marker === "Ferritin")
    expect(ferritin?.delta).toBe(25)
  })
})
