/**
 * Turn raw saved product names into short, scannable labels for daily protocol UI.
 */

export type SupplementDisplay = {
  emoji: string
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
      title: "Turmeric",
      line2: dose ? `${dose} · anti-inflammatory support` : "Anti-inflammatory support",
    }
  }

  if (lower.includes("vitamin d") || /\bd-?3\b/i.test(cleaned) || lower.includes("cholecalciferol")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "☀️",
      title: "Vitamin D",
      line2: dose ?? "Daily",
    }
  }

  if (lower.includes("magnesium")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "💊",
      title: "Magnesium",
      line2: dose ?? "Daily",
    }
  }

  if (lower.includes("omega") || lower.includes("fish oil") || lower.includes("epa") || lower.includes("dha")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "🐟",
      title: "Omega-3",
      line2: dose ?? "Daily",
    }
  }

  if (lower.includes("iron") && !lower.includes("environment")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "🔩",
      title: "Iron",
      line2: dose ?? "As directed",
    }
  }

  if (lower.includes("b12") || lower.includes("cobalamin")) {
    const dose = extractDose(cleaned)
    return {
      emoji: "💊",
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
    title,
    line2: dose ?? "From your plan",
  }
}

/** Short label for stack cards when dose text is long / all-caps clinical copy. */
export function shortStackDoseLabel(dose: string | undefined | null): string {
  if (!dose?.trim()) return "Based on your labs"
  const t = dose.trim()
  if (t.length > 36) return "Custom dose"
  if (t === t.toUpperCase() && t.length > 14) return "Based on your labs"
  return t
}
