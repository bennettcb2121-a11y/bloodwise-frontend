import { describe, it, expect } from "vitest"
import { buildHomeStatusLine } from "./homeStatusLine"

const base = {
  runningLowCount: 0,
  retestWeeks: null as number | null,
  streakDays: 0,
  adherencePct: 0,
  hasStack: false,
  hasBloodwork: false,
}

describe("buildHomeStatusLine", () => {
  it("running-low count wins over everything else", () => {
    const line = buildHomeStatusLine({
      ...base,
      runningLowCount: 1,
      retestWeeks: 1,
      streakDays: 10,
      adherencePct: 95,
      hasStack: true,
      hasBloodwork: true,
    })
    expect(line).toBe("1 supplement running low.")
  })

  it("pluralizes running-low supplements", () => {
    expect(buildHomeStatusLine({ ...base, runningLowCount: 3 })).toBe("3 supplements running low.")
  })

  it("retest window wins when running-low is 0 and retest is within 2 weeks", () => {
    const line = buildHomeStatusLine({
      ...base,
      hasBloodwork: true,
      retestWeeks: 2,
      streakDays: 4,
      adherencePct: 90,
      hasStack: true,
    })
    expect(line).toBe("Retest window opens in 2 weeks.")
  })

  it("retest line singular at 1 week", () => {
    expect(
      buildHomeStatusLine({
        ...base,
        hasBloodwork: true,
        retestWeeks: 1,
      })
    ).toBe("Retest window opens in 1 week.")
  })

  it("ignores retest when it is more than 2 weeks out", () => {
    const line = buildHomeStatusLine({
      ...base,
      hasBloodwork: true,
      retestWeeks: 6,
      hasStack: true,
      streakDays: 0,
    })
    expect(line).toBe("Day 1 of your protocol.")
  })

  it("streak line shown when adherence >=85 AND streak >=3", () => {
    const line = buildHomeStatusLine({
      ...base,
      streakDays: 4,
      adherencePct: 85,
      hasStack: true,
    })
    expect(line).toBe("4 days on plan.")
  })

  it("does not show streak line when adherence is below 85", () => {
    const line = buildHomeStatusLine({
      ...base,
      streakDays: 5,
      adherencePct: 70,
      hasStack: true,
    })
    expect(line).toBe("Day 5 of your protocol.")
  })

  it("Day N fallback when hasStack but no other signals", () => {
    expect(
      buildHomeStatusLine({
        ...base,
        hasStack: true,
      })
    ).toBe("Day 1 of your protocol.")
  })

  it("Day N uses explicit protocolDay when provided", () => {
    expect(
      buildHomeStatusLine({
        ...base,
        hasStack: true,
        protocolDay: 12,
      })
    ).toBe("Day 12 of your protocol.")
  })

  it("last-resort fallback when no stack and no bloodwork", () => {
    expect(buildHomeStatusLine(base)).toBe("Upload your labs when you're ready.")
  })
})
