/**
 * Turn raw saved product names into short, scannable labels for daily protocol UI.
 */

import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"

/** Visual category for protocol UI — use with monochrome icons, not emoji. */
export type SupplementGlyphKind = "iron" | "vitamin-d" | "magnesium" | "omega" | "b12" | "herb" | "default"

export type SupplementDisplay = {
  /** @deprecated Prefer glyphKind + icon in protocol UI */
  emoji: string
  glyphKind: SupplementGlyphKind
  title: string
  line2: string
}

/** Strip bottle counts and trailing SKU noise. */
function stripBottleTail(s: string): string {
  return s
    .replace(/\s*,\s*\d[\d,]*\s*(capsules|tablets|softgels|caps|tabs|ct|count)\b.*$/i, "")
    .replace(/\s*\(\s*\d[\d,]*\s*(capsules|tablets|softgels)\s*\)\s*$/i, "")
    .trim()
}

function extractDose(s: string): string | null {
  const m = s.match(/(\d[\d,]*\s*(?:IU|iu|mcg|MCG|mg|MG))\b/)
  return m ? m[1].replace(/,/g, "") : null
}

/** Softgel SKUs often list 25k–50k IU per pill — not a daily target; don’t show as “your dose”. */
function isMegaDoseIuLabel(line: string): boolean {
  const m = line.match(/(\d[\d,]*)\s*IU/i)
  if (!m) return false
  const n = Number(m[1].replace(/,/g, ""))
  return Number.isFinite(n) && n >= 10_000
}

/** Short line for Today’s plan from saved `inferDoseText` / clinician-style copy. */
function compactProtocolDoseLine(dose: string): string {
  const t = dose.trim()
  const m = t.match(/~\s*[\d,]+\s*IU\/day/i)
  if (m) return m[0].replace(/\s+/g, " ").trim()
  if (/elevated|do not supplement/i.test(t)) {
    return t.length > 56 ? `${t.slice(0, 53)}…` : t
  }
  if (t.length > 52) return shortStackDoseLabel(t)
  return t
}

/**
 * Heuristic parser for long affiliate / catalog strings.
 */
export function parseSupplementRow(raw: string): SupplementDisplay {
  const cleaned = stripBottleTail(raw)
  const lower = cleaned.toLowerCase()

  if (lower.includes("turmeric") || lower.includes("curcumin")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "🌿",
      glyphKind: "herb",
      title: "Turmeric",
      line2: dose ? `${dose} · anti-inflammatory support` : "Anti-inflammatory support",
    }
  }

  if (lower.includes("vitamin d") || /\bd-?3\b/i.test(cleaned) || lower.includes("cholecalciferol")) {
    const dose = extractDose(cleaned)
    const line2 =
      dose && !isMegaDoseIuLabel(dose) ? dose : "Daily"
    return {
      emoji: "☀️",
      glyphKind: "vitamin-d",
      title: "Vitamin D",
      line2,
    }
  }

  if (lower.includes("magnesium")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "💊",
      glyphKind: "magnesium",
      title: "Magnesium",
      line2: dose ?? "Daily",
    }
  }

  if (lower.includes("omega") || lower.includes("fish oil") || lower.includes("epa") || lower.includes("dha")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "🐟",
      glyphKind: "omega",
      title: "Omega-3",
      line2: dose ?? "Daily",
    }
  }

  if (lower.includes("iron") && !lower.includes("environment")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "🔩",
      glyphKind: "iron",
      title: "Iron",
      line2: dose ?? "As directed",
    }
  }

  if (lower.includes("b12") || lower.includes("cobalamin")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "💊",
      glyphKind: "b12",
      title: "B12",
      line2: dose ?? "Daily",
    }
  }

  const firstSeg = cleaned.split(",")[0].trim()
  const dose = extractDose(cleaned)
  let title = firstSeg
  if (title.length > 36) title = `${title.slice(0, 33)}…`
  return {
    emoji: "💊",
    glyphKind: "default",
    title,
    line2: dose ?? "From your plan",
  }
}

/** Short label for stack cards when dose text is long / all-caps clinical copy. */
export function shortStackDoseLabel(dose: string | undefined | null): string {
  if (!dose?.trim()) return "Based on your labs"
  const t = dose.trim()
  const iuDay = t.match(/~\s*[\d,]+\s*IU\/day/i)
  if (iuDay) return iuDay[0].replace(/\s+/g, " ").trim()
  if (t.length > 36) return "Custom dose"
  if (t === t.toUpperCase() && t.length > 14) return "Based on your labs"
  return t
}

/**
 * Today’s plan / protocol rows: prefer saved `dose` (lab-aware), not IU parsed from bottle SKUs.
 */
export function supplementProtocolDisplay(item: SavedSupplementStackItem): SupplementDisplay {
  const base = parseSupplementRow(item.supplementName)
  const d = (item.dose ?? "").trim()
  if (d) {
    return { ...base, line2: compactProtocolDoseLine(d) }
  }
  if (base.title === "Vitamin D" && isMegaDoseIuLabel(base.line2)) {
    return { ...base, line2: "See Plan for dosing" }
  }
  return base
}
