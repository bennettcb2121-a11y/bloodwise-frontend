/**
 * Exports /pitch-deck to public/clarion-pitch-deck.pdf (10 pages, landscape).
 * Requires a running Next server: npm run dev (or start) then:
 *   PITCH_DECK_URL=http://127.0.0.1:3000 npm run generate:pitch-pdf
 */
import { chromium } from "playwright"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const outPath = path.join(root, "public/clarion-pitch-deck.pdf")
const base = (process.env.PITCH_DECK_URL || "http://127.0.0.1:3000").replace(/\/$/, "")
const url = `${base}/pitch-deck`

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 }).catch((e) => {
    throw new Error(
      `Cannot open ${url}. Start the app first (npm run dev), then run this script again. (${e.message})`
    )
  })
  if (!res || !res.ok()) {
    throw new Error(`Bad response from ${url}: ${res?.status()}`)
  }
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ media: "print" })
  // Fixed page size matches @page in pitch-deck.css (Letter landscape); avoids broken layout from preferCSSPageSize alone.
  await page.pdf({
    path: outPath,
    printBackground: true,
    preferCSSPageSize: false,
    format: "Letter",
    landscape: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  const st = fs.statSync(outPath)
  console.log("Wrote", outPath, `(${(st.size / 1024).toFixed(1)} KB)`)
} finally {
  await browser.close()
}
