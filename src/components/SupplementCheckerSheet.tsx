"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { X, ScanLine, Search, AlertCircle } from "lucide-react"
import { loadSavedState } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import Link from "next/link"

type Props = {
  userId: string | null | undefined
  onClose: () => void
}

/** Rough keyword → biomarker name hints for education-only copy */
const PRODUCT_KEYWORDS: { test: RegExp; hint: string }[] = [
  { test: /vitamin\s*d|cholecalciferol|d3\b/i, hint: "Vitamin D" },
  { test: /magnesium|mg\b/i, hint: "Magnesium" },
  { test: /iron|ferrous|ferritin/i, hint: "Iron" },
  { test: /b12|cobalamin|methylcobalamin/i, hint: "B12" },
  { test: /omega|fish oil|epa|dha/i, hint: "Omega-3" },
  { test: /zinc\b/i, hint: "Zinc" },
  { test: /vitamin\s*c|ascorbic/i, hint: "Vitamin C" },
]

function isLabFocus(r: BiomarkerResult): boolean {
  return r.status !== "optimal" && r.status !== "unknown"
}

function buildEducationalLine(productName: string, results: BiomarkerResult[]): string {
  const name = productName.trim() || "This product"
  const off = results.filter(isLabFocus)
  const markers = off.slice(0, 6).map((r) => r.name).filter(Boolean)

  for (const { test, hint } of PRODUCT_KEYWORDS) {
    if (test.test(productName)) {
      const needle = hint.split("/")[0].trim().toLowerCase()
      const matchLab = results.find((r) => r.name && r.name.toLowerCase().includes(needle))
      if (matchLab && isLabFocus(matchLab)) {
        return `${name} may relate to ${hint}, which shows as a focus area in your labs. Education only — confirm form and dose with your clinician.`
      }
      return `${name} looks related to ${hint}. ${markers.length ? `Your recorded priorities include ${markers.slice(0, 3).join(", ")}.` : "Add or update labs in Clarion for marker-level context."}`
    }
  }

  if (markers.length) {
    return `${name}: Clarion doesn’t diagnose “need” from a barcode. Your labs currently highlight: ${markers.slice(0, 4).join(", ")}. Use this as context only — not medical advice.`
  }

  return `${name}: We couldn’t tie this label to a specific lab marker automatically. Barcode lookup is for convenience; Clarion doesn’t replace your clinician for new supplements.`
}

async function fetchProductNameFromBarcode(barcode: string): Promise<string | null> {
  const clean = barcode.replace(/\D/g, "")
  if (clean.length < 8) return null
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${clean}.json`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { status?: number; product?: { product_name?: string; generic_name?: string } }
    if (data.status !== 1 || !data.product) return null
    const n = data.product.product_name || data.product.generic_name
    return n?.trim() || null
  } catch {
    return null
  }
}

function parseMoney(raw: string): number | undefined {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(n) || n <= 0 || n > 50_000) return undefined
  return Math.round(n * 100) / 100
}

function parseServings(raw: string): number | undefined {
  const n = parseInt(String(raw).replace(/\D/g, ""), 10)
  if (!Number.isFinite(n) || n < 1 || n > 10_000) return undefined
  return n
}

export function SupplementCheckerSheet({ userId, onClose }: Props) {
  const [manualCode, setManualCode] = useState("")
  const [productName, setProductName] = useState<string | null>(null)
  const [lastBarcode, setLastBarcode] = useState<string | null>(null)
  const [bottlePrice, setBottlePrice] = useState("")
  const [servingsInBottle, setServingsInBottle] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [line, setLine] = useState<string | null>(null)
  const [insightSource, setInsightSource] = useState<"rule" | "ai" | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const fetchAiInsight = useCallback(
    async (
      barcode: string,
      displayProductName: string,
      opts: { priceUsd?: number; servingsPerBottle?: number; productUrl?: string }
    ) => {
      if (!userId) return
      setAiLoading(true)
      try {
        const res = await fetch("/api/supplement-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            barcode,
            productName: displayProductName,
            priceUsd: opts.priceUsd,
            servingsPerBottle: opts.servingsPerBottle,
            productUrl: opts.productUrl?.trim() || undefined,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { insight?: string }
        if (res.ok && typeof data.insight === "string" && data.insight.trim()) {
          setLine(data.insight.trim())
          setInsightSource("ai")
        }
      } catch {
        /* keep rule-based line */
      } finally {
        setAiLoading(false)
      }
    },
    [userId]
  )

  const runLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim()
      if (!trimmed) return
      setLoading(true)
      setScanError(null)
      setLine(null)
      setInsightSource(null)
      setLastBarcode(trimmed)
      try {
        let analysis: BiomarkerResult[] = []
        if (userId) {
          const { bloodwork, profile } = await loadSavedState(userId)
          const inputs = bloodwork?.biomarker_inputs
          if (inputs && typeof inputs === "object") {
            const prof = profile ? { age: profile.age, sex: profile.sex, sport: profile.sport } : {}
            analysis = analyzeBiomarkers(inputs as Record<string, string | number>, prof)
          }
        }

        const name = await fetchProductNameFromBarcode(trimmed)
        const display = name || `Barcode ${trimmed}`
        setProductName(display)
        const ruleLine = buildEducationalLine(name || trimmed, analysis)
        setLine(ruleLine)
        setInsightSource("rule")

        const priceUsd = parseMoney(bottlePrice)
        const servings = parseServings(servingsInBottle)
        void fetchAiInsight(trimmed, display, {
          priceUsd,
          servingsPerBottle: servings,
          productUrl: productUrl.trim() || undefined,
        })
      } finally {
        setLoading(false)
      }
    },
    [userId, fetchAiInsight, bottlePrice, servingsInBottle, productUrl]
  )

  const refreshAiWithPrice = useCallback(() => {
    if (!lastBarcode || !productName) return
    const priceUsd = parseMoney(bottlePrice)
    const servings = parseServings(servingsInBottle)
    void fetchAiInsight(lastBarcode, productName, {
      priceUsd,
      servingsPerBottle: servings,
      productUrl: productUrl.trim() || undefined,
    })
  }, [lastBarcode, productName, bottlePrice, servingsInBottle, productUrl, fetchAiInsight])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setScanError(null)
    const BD = typeof window !== "undefined" ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector : undefined
    if (!BD) {
      setScanError("Barcode scanning isn’t available in this browser. Enter the code manually, or try Chrome.")
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] })
      const codes = await detector.detect(bitmap)
      bitmap.close()
      const raw = codes[0]?.rawValue
      if (!raw) {
        setScanError("No barcode found in that image. Try a clearer photo or type the code.")
        return
      }
      setManualCode(raw)
      await runLookup(raw)
    } catch {
      setScanError("Could not read that image. Try manual entry.")
    }
  }

  return (
    <div className="dashboard-log-sheet-root" role="presentation">
      <button type="button" className="dashboard-log-fab-backdrop dashboard-log-fab-backdrop--sheet" aria-label="Close" onClick={onClose} />
      <div className="dashboard-supplement-checker" role="dialog" aria-modal="true" aria-labelledby="supplement-checker-title">
        <div className="dashboard-supplement-checker-head">
          <h2 id="supplement-checker-title" className="dashboard-supplement-checker-title">
            <ScanLine size={22} strokeWidth={2} aria-hidden /> Supplement checker
          </h2>
          <button type="button" className="dashboard-supplement-checker-close" onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <p className="dashboard-supplement-checker-disclaimer">
          <AlertCircle size={16} strokeWidth={2} aria-hidden /> Education only — not medical advice. Barcode data can be wrong; always read the label.
          {userId ? " AI uses your saved profile and labs when available." : " Sign in for personalized AI insight."}
        </p>

        <div className="dashboard-supplement-checker-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="dashboard-chart-sr-only"
            onChange={onFile}
          />
          <button type="button" className="dashboard-supplement-checker-btn" onClick={() => fileInputRef.current?.click()}>
            Scan barcode (camera or photo)
          </button>
        </div>

        <label className="dashboard-supplement-checker-field">
          <span>Or enter barcode (UPC / EAN)</span>
          <div className="dashboard-supplement-checker-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 850012345678"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="dashboard-supplement-checker-input"
            />
            <button
              type="button"
              className="dashboard-supplement-checker-btn dashboard-supplement-checker-btn--primary"
              disabled={loading || !manualCode.trim()}
              onClick={() => void runLookup(manualCode)}
            >
              <Search size={18} strokeWidth={2} aria-hidden /> Look up
            </button>
          </div>
        </label>

        {scanError && <p className="dashboard-supplement-checker-error">{scanError}</p>}

        {loading && <p className="dashboard-supplement-checker-muted">Looking up product…</p>}

        {productName && !loading && (
          <div className="dashboard-supplement-checker-result">
            <p className="dashboard-supplement-checker-product">{productName}</p>

            <div className="dashboard-supplement-checker-value-fields" aria-labelledby="supplement-value-heading">
              <p id="supplement-value-heading" className="dashboard-supplement-checker-value-title">
                Price &amp; link (optional — improves value insight)
              </p>
              <div className="dashboard-supplement-checker-value-grid">
                <label className="dashboard-supplement-checker-mini-field">
                  <span>Total paid ($)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 24.99"
                    value={bottlePrice}
                    onChange={(e) => setBottlePrice(e.target.value)}
                    className="dashboard-supplement-checker-input"
                    autoComplete="off"
                  />
                </label>
                <label className="dashboard-supplement-checker-mini-field">
                  <span>Servings per bottle</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 60"
                    value={servingsInBottle}
                    onChange={(e) => setServingsInBottle(e.target.value)}
                    className="dashboard-supplement-checker-input"
                    autoComplete="off"
                  />
                </label>
              </div>
              <label className="dashboard-supplement-checker-mini-field dashboard-supplement-checker-mini-field--full">
                <span>Product link (e.g. Amazon)</span>
                <input
                  type="url"
                  placeholder="https://…"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="dashboard-supplement-checker-input"
                  autoComplete="off"
                />
              </label>
              {userId ? (
                <button
                  type="button"
                  className="dashboard-supplement-checker-btn dashboard-supplement-checker-btn--secondary"
                  disabled={aiLoading || !lastBarcode}
                  onClick={() => refreshAiWithPrice()}
                >
                  Update AI insight with price &amp; link
                </button>
              ) : null}
            </div>

            {aiLoading && (
              <p className="dashboard-supplement-checker-muted" aria-live="polite">
                Generating personalized AI insight…
              </p>
            )}
            {line && (
              <div className="dashboard-supplement-checker-line-wrap">
                {insightSource === "ai" && (
                  <span className="dashboard-supplement-checker-ai-badge">AI insight</span>
                )}
                <p className="dashboard-supplement-checker-line dashboard-supplement-checker-line--prose">{line}</p>
              </div>
            )}
          </div>
        )}

        <p className="dashboard-supplement-checker-footer">
          <Link href="/dashboard#supplements-you-take" className="dashboard-supplement-checker-link" onClick={onClose}>
            Add supplements you already take →
          </Link>
        </p>
      </div>
    </div>
  )
}

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmap) => Promise<{ rawValue: string }[]>
}
