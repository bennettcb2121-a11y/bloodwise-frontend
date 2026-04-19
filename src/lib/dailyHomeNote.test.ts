import { describe, it, expect } from "vitest"
import { GENERIC_DAILY_NOTES, pickDailyNote, dayOfYear } from "./dailyHomeNote"

describe("pickDailyNote", () => {
  it("returns a stable note for the same day", () => {
    const a = pickDailyNote(42)
    const b = pickDailyNote(42)
    expect(a).toEqual(b)
  })

  it("returns different notes across consecutive days (within one library cycle)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < GENERIC_DAILY_NOTES.length; i++) {
      seen.add(pickDailyNote(i).title)
    }
    expect(seen.size).toBe(GENERIC_DAILY_NOTES.length)
  })

  it("never returns undefined even for negative or huge inputs", () => {
    expect(pickDailyNote(-1)).toBeDefined()
    expect(pickDailyNote(10_000).title.length).toBeGreaterThan(0)
    expect(pickDailyNote(Number.NaN)).toBeDefined()
  })

  it("wraps around after the library ends", () => {
    const first = pickDailyNote(0)
    const wrapped = pickDailyNote(GENERIC_DAILY_NOTES.length)
    expect(wrapped).toEqual(first)
  })

  it("library has at least 14 notes", () => {
    expect(GENERIC_DAILY_NOTES.length).toBeGreaterThanOrEqual(14)
  })

  it("every note has non-empty title and body", () => {
    for (const note of GENERIC_DAILY_NOTES) {
      expect(note.title.length).toBeGreaterThan(0)
      expect(note.body.length).toBeGreaterThan(0)
      expect(note.body).not.toMatch(/!/)
    }
  })
})

describe("dayOfYear", () => {
  it("is 1 on January 1", () => {
    expect(dayOfYear(new Date(2025, 0, 1))).toBe(1)
  })

  it("increases by 1 each day", () => {
    const a = dayOfYear(new Date(2025, 2, 10))
    const b = dayOfYear(new Date(2025, 2, 11))
    expect(b - a).toBe(1)
  })
})
