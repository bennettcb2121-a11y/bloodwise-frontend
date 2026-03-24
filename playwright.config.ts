import { defineConfig, devices } from "@playwright/test"

/**
 * - CI: `npm run build` first, then `CI=true npx playwright test` — starts `next start` automatically.
 * - Local: run `npm run dev` in another terminal, then `npx playwright test` (no webServer).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || (process.env.CI ? "http://127.0.0.1:4173" : "http://127.0.0.1:3000"),
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI
    ? {
        command: "npm run start -- -p 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        timeout: 90_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            "eyJhbGciOiJIUzI1NiJ9.placeholder",
        },
      }
    : undefined,
})
