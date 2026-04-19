import { afterEach, describe, expect, it } from "vitest"
import { applyAmazonAssociatesTag, getAmazonAssociatesTag } from "./affiliateProducts"

const ENV_KEY = "NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG"

describe("getAmazonAssociatesTag", () => {
  const prev = process.env[ENV_KEY]

  afterEach(() => {
    if (prev === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = prev
  })

  it("trims NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG when set", () => {
    process.env[ENV_KEY] = "  custom-store-20  "
    expect(getAmazonAssociatesTag()).toBe("custom-store-20")
  })

  it("falls back when env is empty", () => {
    delete process.env[ENV_KEY]
    expect(getAmazonAssociatesTag()).toBe("clarionlabs-20")
  })
})

describe("applyAmazonAssociatesTag", () => {
  const prev = process.env[ENV_KEY]

  afterEach(() => {
    if (prev === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = prev
  })

  it("sets tag on amazon.com /dp URLs", () => {
    process.env[ENV_KEY] = "mytag-20"
    expect(applyAmazonAssociatesTag("https://www.amazon.com/dp/B00TEST123")).toBe(
      "https://www.amazon.com/dp/B00TEST123?tag=mytag-20"
    )
  })

  it("replaces existing tag", () => {
    process.env[ENV_KEY] = "newtag-20"
    expect(applyAmazonAssociatesTag("https://www.amazon.com/dp/B00TEST123?tag=old-20&ref=1")).toContain("tag=newtag-20")
    expect(applyAmazonAssociatesTag("https://www.amazon.com/dp/B00TEST123?tag=old-20&ref=1")).not.toContain("old-20")
  })

  it("leaves non-Amazon URLs unchanged", () => {
    process.env[ENV_KEY] = "mytag-20"
    expect(applyAmazonAssociatesTag("https://example.com/p")).toBe("https://example.com/p")
  })
})
