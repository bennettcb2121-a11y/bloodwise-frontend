import { describe, it, expect } from "vitest"

function streakLine(streakDays: number) {
  return streakDays > 0
    ? `Logged ${streakDays} ${streakDays === 1 ? "day" : "days"} in a row.`
    : "All steps logged for today."
}

describe("streakLine", () => {
  it("uses singular 'day' when streak is 1", () => {
    expect(streakLine(1)).toBe("Logged 1 day in a row.")
  })
  it("uses plural 'days' for 2+", () => {
    expect(streakLine(2)).toBe("Logged 2 days in a row.")
    expect(streakLine(30)).toBe("Logged 30 days in a row.")
  })
  it("falls back when streak is 0", () => {
    expect(streakLine(0)).toBe("All steps logged for today.")
  })
})
