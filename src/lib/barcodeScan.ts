/**
 * Barcode decode (native BarcodeDetector when available, else ZXing), optional QR,
 * Open Food Facts + server-side resolve, and 24h UPC cache.
 */

export type ResolvedBarcodeProduct = {
  upc: string
  name: string
  brand?: string
  ingredientsLine?: string
  source: "off" | "off_dsld" | "none"
}

const UPC_CACHE_KEY = "clarion:upc:cache:v1"
const UPC_TTL_MS = 24 * 60 * 60 * 1000

type CacheEnvelope = { at: number; data: ResolvedBarcodeProduct }

function readCacheRaw(): Record<string, CacheEnvelope> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(UPC_CACHE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    return o && typeof o === "object" ? (o as Record<string, CacheEnvelope>) : {}
  } catch {
    return {}
  }
}

export function readUpcCache(upc: string): ResolvedBarcodeProduct | null {
  const clean = upc.replace(/\D/g, "")
  if (!clean) return null
  const all = readCacheRaw()
  const row = all[clean]
  if (!row || typeof row.at !== "number") return null
  if (Date.now() - row.at > UPC_TTL_MS) return null
  return row.data ?? null
}

export function writeUpcCache(upc: string, data: ResolvedBarcodeProduct): void {
  if (typeof window === "undefined") return
  const clean = upc.replace(/\D/g, "")
  if (!clean) return
  try {
    const all = readCacheRaw()
    all[clean] = { at: Date.now(), data }
    localStorage.setItem(UPC_CACHE_KEY, JSON.stringify(all))
  } catch {
    /* quota / private mode */
  }
}

/** POST /api/resolve-barcode — OFF + DSLD enrichment; cached 24h client-side. */
export async function resolveBarcodeWithCache(upc: string): Promise<ResolvedBarcodeProduct> {
  const clean = upc.replace(/\D/g, "")
  if (clean.length < 8) return { upc: clean, name: "", source: "none" }

  const cached = readUpcCache(clean)
  if (cached) return cached

  try {
    const res = await fetch("/api/resolve-barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc: clean }),
    })
    const data = (await res.json()) as ResolvedBarcodeProduct
    if (data?.upc && typeof data.name === "string") {
      writeUpcCache(clean, data)
      return data
    }
  } catch {
    /* network */
  }
  const miss: ResolvedBarcodeProduct = { upc: clean, name: "", source: "none" }
  return miss
}

export async function fetchProductNameFromBarcode(barcode: string): Promise<string | null> {
  const r = await resolveBarcodeWithCache(barcode)
  const n = r.name.trim()
  return n.length > 0 ? n : null
}

export function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

/** True if string is mostly digits and long enough to be a UPC/EAN. */
export function looksLikeNumericBarcode(s: string): boolean {
  const digits = s.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 14 && /^\d[\d\s-]*$/.test(s.trim())
}

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmap) => Promise<{ rawValue: string }[]>
}

/**
 * Chromium exposes `BarcodeDetector` (fast). Safari / Firefox do not — use ZXing on the same image.
 * Includes QR for product deeplinks.
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
  const BD =
    typeof window !== "undefined"
      ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined

  if (BD) {
    try {
      const bitmap = await createImageBitmap(file)
      try {
        const detector = new BD({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        })
        const codes = await detector.detect(bitmap)
        const raw = codes[0]?.rawValue
        if (raw) return raw
      } finally {
        bitmap.close()
      }
    } catch {
      /* fall through to ZXing */
    }
  }

  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, NotFoundException }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ])

  const hints = new Map<number, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new BrowserMultiFormatReader(hints)
  const url = URL.createObjectURL(file)
  try {
    const result = await reader.decodeFromImageUrl(url)
    const text = result.getText()?.trim()
    return text || null
  } catch (e) {
    if (e instanceof NotFoundException) return null
    throw e
  } finally {
    URL.revokeObjectURL(url)
  }
}
