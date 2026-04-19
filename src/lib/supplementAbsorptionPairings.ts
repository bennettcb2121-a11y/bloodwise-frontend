import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"

export type StackPairingHint = {
  id: string
  title: string
  body: string
  ctaHref: string
  ctaLabel: string
}

function textBlob(rows: SavedSupplementStackItem[]): string {
  return rows.map((r) => `${r.supplementName} ${r.marker ?? ""}`).join(" ").toLowerCase()
}

export function stackHasVitaminC(rows: SavedSupplementStackItem[]): boolean {
  const t = textBlob(rows)
  return t.includes("vitamin c") || t.includes("ascorbic") || t.includes("liposomal c")
}

/**
 * Banner-level hints (kept empty — iron ↔ vitamin C is shown inline under each iron row in the protocol UI).
 */
export function getStackAbsorptionPairingHints(_rows: SavedSupplementStackItem[]): StackPairingHint[] {
  return []
}
