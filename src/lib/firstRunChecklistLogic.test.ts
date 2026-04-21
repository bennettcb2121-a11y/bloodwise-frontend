import { describe, it, expect } from "vitest"
import { computeFirstRunChecklistProgress } from "./firstRunChecklistLogic"

describe("computeFirstRunChecklistProgress", () => {
  it("uses addLabs mode when no bloodwork", () => {
    const r = computeFirstRunChecklistProgress({
      hasBloodwork: false,
      cabinetCount: 0,
      anyStackFitComputed: false,
      reportViewedLocal: false,
      fitViewedLocal: false,
    })
    expect(r.step1Mode).toBe("addLabs")
    expect(r.step1Done).toBe(false)
    expect(r.allDone).toBe(false)
    expect(r.completedCount).toBe(0)
  })

  it("marks step1 done for addLabs when hasBloodwork", () => {
    const r = computeFirstRunChecklistProgress({
      hasBloodwork: true,
      cabinetCount: 0,
      anyStackFitComputed: false,
      reportViewedLocal: false,
      fitViewedLocal: false,
    })
    expect(r.step1Mode).toBe("reviewReport")
    expect(r.step1Done).toBe(false)
    expect(r.completedCount).toBe(0)
  })

  it("reviewReport step1 done when report viewed locally", () => {
    const r = computeFirstRunChecklistProgress({
      hasBloodwork: true,
      cabinetCount: 0,
      anyStackFitComputed: false,
      reportViewedLocal: true,
      fitViewedLocal: false,
    })
    expect(r.step1Mode).toBe("reviewReport")
    expect(r.step1Done).toBe(true)
    expect(r.completedCount).toBe(1)
  })

  it("allDone when all three complete", () => {
    const r = computeFirstRunChecklistProgress({
      hasBloodwork: true,
      cabinetCount: 2,
      anyStackFitComputed: true,
      reportViewedLocal: true,
      fitViewedLocal: false,
    })
    expect(r.allDone).toBe(true)
    expect(r.completedCount).toBe(3)
  })

  it("fitDone from fitViewedLocal without computed fit", () => {
    const r = computeFirstRunChecklistProgress({
      hasBloodwork: false,
      cabinetCount: 1,
      anyStackFitComputed: false,
      reportViewedLocal: false,
      fitViewedLocal: true,
    })
    expect(r.fitDone).toBe(true)
    expect(r.step1Done).toBe(false)
  })
})
