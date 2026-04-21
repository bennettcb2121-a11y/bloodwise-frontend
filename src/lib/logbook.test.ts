import { describe, it, expect } from "vitest"
import {
  buildMonthGrid,
  collectLabDates,
  computeNextRetestDate,
  fromLocalIso,
  monthGridRange,
  toLocalIso,
} from "./logbook"

describe("logbook date math", () => {
  it("toLocalIso / fromLocalIso round-trip in local time", () => {
    const d = new Date(2026, 3, 21) // April 21, 2026 local
    expect(toLocalIso(d)).toBe("2026-04-21")
    expect(toLocalIso(fromLocalIso("2026-04-21"))).toBe("2026-04-21")
  })

  it("computeNextRetestDate adds weeks (default 8) to the lab date", () => {
    // 2026-04-21 + 8 weeks = 2026-06-16
    expect(computeNextRetestDate("2026-04-21", 8)).toBe("2026-06-16")
    expect(computeNextRetestDate("2026-04-21", null)).toBe("2026-06-16")
    expect(computeNextRetestDate("2026-04-21", 12)).toBe("2026-07-14")
  })

  it("computeNextRetestDate returns null for missing/invalid input", () => {
    expect(computeNextRetestDate(null, 8)).toBeNull()
    expect(computeNextRetestDate(undefined, 8)).toBeNull()
    expect(computeNextRetestDate("2026-04-21", 0)).toBeNull()
    expect(computeNextRetestDate("2026-04-21", -4)).toBeNull()
  })

  it("collectLabDates merges bloodwork_saves and confirmed lab sessions, dedupes, skips non-confirmed", () => {
    const saves = [{ created_at: "2026-03-10T14:22:00.000Z" }]
    const sessions = [
      // Confirmed — counts
      { collected_at: "2026-04-21", created_at: "2026-04-21T12:00:00Z", status: "confirmed" as const },
      // Same date via a different source — should dedupe
      { collected_at: null, created_at: "2026-04-21T18:00:00Z", status: "confirmed" as const },
      // Not confirmed — excluded
      { collected_at: "2026-04-20", created_at: "2026-04-20T10:00:00Z", status: "uploading" as const },
    ]
    const out = collectLabDates(saves, sessions)
    expect(out.has("2026-04-21")).toBe(true)
    expect(out.has("2026-04-20")).toBe(false)
    expect(out.size).toBe(2) // 2026-03-10 + 2026-04-21 only (local timezone conversion may shift; check count)
  })

  it("monthGridRange spans 42 days starting Sunday on/before the 1st", () => {
    // April 2026: the 1st is a Wednesday, so the grid starts on Sunday March 29.
    const range = monthGridRange(new Date(2026, 3, 1))
    expect(range.startIso).toBe("2026-03-29")
    // 42 days later = end of week 6 inclusive
    expect(range.endIso).toBe("2026-05-09")
  })

  it("buildMonthGrid classifies today, future, lab, retest, and in-month correctly", () => {
    const month = buildMonthGrid(new Date(2026, 3, 1), {
      todayIso: "2026-04-21",
      logs: [
        { log_date: "2026-04-20", checks: { a: true, b: true } },
        { log_date: "2026-04-21", checks: { a: true, b: false, c: true } },
      ],
      labDates: new Set(["2026-04-15"]),
      nextRetestIso: "2026-06-16",
    })

    expect(month.label).toMatch(/April 2026/)
    expect(month.weeks).toHaveLength(6)
    expect(month.days).toHaveLength(42)

    const find = (iso: string) => month.days.find((d) => d.isoDate === iso)
    const day20 = find("2026-04-20")!
    const day21 = find("2026-04-21")!
    const lab15 = find("2026-04-15")!
    const mar29 = find("2026-03-29")!

    expect(day20.checksCompleted).toBe(2)
    expect(day21.checksCompleted).toBe(2) // b was false, not counted
    expect(day21.isToday).toBe(true)
    expect(day20.isFuture).toBe(false)
    expect(lab15.hasLab).toBe(true)
    expect(day21.hasLab).toBe(false)
    expect(mar29.inMonth).toBe(false) // leading spacer
    expect(day21.inMonth).toBe(true)

    // Retest day is outside the April grid (June), so nothing in April should flag retest.
    expect(month.days.some((d) => d.isRetestDay)).toBe(false)
  })

  it("buildMonthGrid flags the retest day + 3-day window when in view", () => {
    // View June 2026 so 2026-06-16 is in range
    const month = buildMonthGrid(new Date(2026, 5, 1), {
      todayIso: "2026-04-21",
      logs: [],
      labDates: new Set(),
      nextRetestIso: "2026-06-16",
    })
    const target = month.days.find((d) => d.isoDate === "2026-06-16")!
    const dayBefore = month.days.find((d) => d.isoDate === "2026-06-13")!
    const farAway = month.days.find((d) => d.isoDate === "2026-06-25")!
    expect(target.isRetestDay).toBe(true)
    expect(target.isRetestWindow).toBe(true)
    expect(dayBefore.isRetestWindow).toBe(true)
    expect(farAway.isRetestWindow).toBe(false)
    expect(target.isFuture).toBe(true)
  })

  it("buildMonthGrid weeks aggregate totalChecks", () => {
    const month = buildMonthGrid(new Date(2026, 3, 1), {
      todayIso: "2026-04-21",
      logs: [
        { log_date: "2026-04-13", checks: { a: true, b: true, c: true } }, // Mon
        { log_date: "2026-04-14", checks: { a: true } },
        { log_date: "2026-04-15", checks: { a: true, b: true } },
      ],
      labDates: new Set(),
      nextRetestIso: null,
    })
    // Week containing 2026-04-13 should have checks 3 + 1 + 2 = 6
    const w = month.weeks.find((week) => week.days.some((d) => d.isoDate === "2026-04-13"))!
    expect(w.totalChecks).toBe(6)
    expect(w.hasAnyLog).toBe(true)
  })
})
