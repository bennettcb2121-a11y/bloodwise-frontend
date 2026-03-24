import { describe, it, expect } from "vitest"
import { recommendTests } from "./recommendTests"

describe("recommendTests", () => {
  it("returns sorted tests and rationale strings", () => {
    const { tests, rationaleByTest } = recommendTests([], {
      sport: "running",
      sex: "male",
      age: 30,
    })
    expect(tests.length).toBeGreaterThan(0)
    expect(rationaleByTest[tests[0]]).toBeTruthy()
    expect([...tests].sort()).toEqual(tests)
  })

  it("omits tests already covered by optimal marker results", () => {
    const { tests } = recommendTests(
      [{ name: "Vitamin D", status: "optimal" }],
      { sport: "running", sex: "male", age: 30 }
    )
    expect(tests.includes("Vitamin D")).toBe(false)
  })
})
