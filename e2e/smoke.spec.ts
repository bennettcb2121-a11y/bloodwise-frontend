import { test, expect } from "@playwright/test"

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    const res = await page.goto("/")
    expect(res?.ok()).toBeTruthy()
    await expect(page).toHaveTitle(/Clarion/i)
  })

  test("unknown route shows not-found", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-xyz", { waitUntil: "domcontentloaded" })
    expect(res?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible()
  })
})
