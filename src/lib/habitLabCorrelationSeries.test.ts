import { describe, expect, it } from "vitest"
import { buildHabitLabCorrelationSeries, extractStackNamesFromSnapshot } from "./habitLabCorrelationSeries"
import type { BloodworkSaveRow } from "./bloodwiseDb"

describe("buildHabitLabCorrelationSeries", () => {
  it("merges protocol rows with lab dates", () => {
    const rows = buildHabitLabCorrelationSeries(
      [
        {
          log_date: "2026-03-01",
          checks: { A: true, B: false },
          metrics: { activity_level: 3 },
        },
        {
          log_date: "2026-03-15",
          checks: { A: true, B: true },
          metrics: {},
        },
      ],
      ["A", "B"],
      [
        {
          created_at: "2026-03-15T10:00:00.000Z",
          biomarker_inputs: { "Vitamin D": "42", Ferritin: "90" },
        } as unknown as BloodworkSaveRow,
      ]
    )
    expect(rows.length).toBe(2)
    expect(rows[0].adherence).toBe(50)
    expect(rows[0].vitaminDLab).toBeNull()
    expect(rows[1].adherence).toBe(100)
    expect(rows[1].vitaminDLab).toBe(42)
    expect(rows[1].ferritinLab).toBe(90)
  })
})

describe("extractStackNamesFromSnapshot", () => {
  it("reads supplement names from stack_snapshot", () => {
    expect(extractStackNamesFromSnapshot({ stack: [{ supplementName: "Iron" }, { supplementName: "D" }] })).toEqual([
      "Iron",
      "D",
    ])
    expect(extractStackNamesFromSnapshot(null)).toEqual([])
  })
})
