/**
 * Renders scripts/clarion-wordmark-pdf.html to public/clarion-labs-wordmark.pdf
 * (Clarion Labs + “brilliantly clear” — matches ClarionLabsLogo / globals.css).
 */
import fs from "fs";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(__dirname, "clarion-wordmark-pdf.html");
const outPath = path.join(root, "public/clarion-labs-wordmark.pdf");
const legacyPath = path.join(root, "public/clarion-logo.pdf");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const pad = 48;
  const box = await page.locator(".clarion-labs-logo").boundingBox();
  if (!box) throw new Error("Could not measure .clarion-labs-logo");
  const w = Math.ceil(box.width + pad * 2);
  const h = Math.ceil(box.height + pad * 2);
  await page.setViewportSize({ width: w, height: h });
  await page.pdf({
    path: outPath,
    width: `${w}px`,
    height: `${h}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  fs.copyFileSync(outPath, legacyPath);
  console.log("Wrote", outPath, `and ${legacyPath} (${w}×${h} px)`);
} finally {
  await browser.close();
}
