import { NextResponse, type NextRequest } from "next/server"
import { barcodeResolveRateLimiter, getClientIp } from "@/src/lib/apiRateLimit"

export const runtime = "nodejs"

export type ResolveBarcodeJson = {
  upc: string
  name: string
  brand?: string
  ingredientsLine?: string
  source: "off" | "off_dsld" | "none"
}

async function lookupOpenFoodFacts(upc: string): Promise<{ name: string; brand?: string } | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      status?: number
      product?: { product_name?: string; generic_name?: string; brands?: string }
    }
    if (data.status !== 1 || !data.product) return null
    const n = data.product.product_name || data.product.generic_name
    const name = n?.trim()
    if (!name) return null
    const brand = data.product.brands?.split(",")[0]?.trim()
    return { name, ...(brand ? { brand } : {}) }
  } catch {
    return null
  }
}

function buildIngredientsLine(src: {
  allIngredients?: Array<{ name?: string; ingredientGroup?: string; notes?: string }>
}): string | undefined {
  const list = src.allIngredients
  if (!Array.isArray(list) || list.length === 0) return undefined
  const parts = list
    .slice(0, 10)
    .map((x) => {
      const g = x.ingredientGroup?.trim()
      const n = x.name?.trim()
      if (g && n && g.toLowerCase() !== n.toLowerCase()) return `${g}: ${n}`
      return n || g || ""
    })
    .filter(Boolean)
  const line = parts.join("; ")
  return line.length > 0 ? line : undefined
}

/** Best-effort DSLD enrichment (ingredients) using product name + brand. */
async function enrichFromDsld(productName: string, brand?: string): Promise<string | undefined> {
  const q = [brand, productName].filter(Boolean).join(" ").trim()
  if (q.length < 3) return undefined
  try {
    const url = `https://api.ods.od.nih.gov/dsld/v9/search-filter?q=${encodeURIComponent(q.slice(0, 120))}`
    const res = await fetch(url, { next: { revalidate: 86_400 } })
    if (!res.ok) return undefined
    const data = (await res.json()) as {
      hits?: Array<{ _source?: { allIngredients?: unknown; fullName?: string; brandName?: string } }>
    }
    const src = data.hits?.[0]?._source as
      | { allIngredients?: unknown; fullName?: string; brandName?: string }
      | undefined
    if (!src) return undefined
    if (brand?.trim()) {
      const want = brand.trim().toLowerCase()
      const hitBrand = (src.brandName ?? "").trim().toLowerCase()
      if (hitBrand && !hitBrand.includes(want) && !want.includes(hitBrand)) return undefined
    }
    return buildIngredientsLine(src as { allIngredients?: Array<{ name?: string; ingredientGroup?: string }> })
  } catch {
    return undefined
  }
}

/**
 * Multi-tier barcode resolve: Open Food Facts, then optional DSLD ingredient enrichment.
 * UPC is normalized to digits only. No auth required.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!barcodeResolveRateLimiter.allow(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 })
  }

  let body: { upc?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const raw = typeof body.upc === "string" ? body.upc : ""
  const upc = raw.replace(/\D/g, "")
  if (upc.length < 8) {
    return NextResponse.json({ error: "UPC too short" }, { status: 400 })
  }

  const off = await lookupOpenFoodFacts(upc)
  if (!off) {
    const payload: ResolveBarcodeJson = { upc, name: "", source: "none" }
    return NextResponse.json(payload)
  }

  const dsldOn = process.env.ENABLE_DSLD === "1"
  const ingredientsLine = dsldOn ? await enrichFromDsld(off.name, off.brand) : undefined
  const payload: ResolveBarcodeJson = {
    upc,
    name: off.name,
    ...(off.brand ? { brand: off.brand } : {}),
    ...(ingredientsLine ? { ingredientsLine } : {}),
    source: ingredientsLine ? "off_dsld" : "off",
  }
  return NextResponse.json(payload)
}
