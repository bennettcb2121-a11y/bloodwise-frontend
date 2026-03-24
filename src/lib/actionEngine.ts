type BiomarkerResult = {
  name: string
  status: "deficient" | "suboptimal" | "optimal" | "high" | "unknown"
  value: number
  optimalMin: number | null
  optimalMax: number | null
  whyItMatters?: string
  foods?: string
  lifestyle?: string
  supplementNotes?: string
  retest?: string
  researchSummary?: string
}

function isFlagged(status?: string) {
  return (
    status === "deficient" ||
    status === "suboptimal" ||
    status === "low" ||
    status === "high"
  )
}

function getPriorityScore(item: BiomarkerResult) {
  let score = 0

  if (item.status === "deficient") score += 100
  else if (item.status === "suboptimal") score += 70
  else if (item.status === "high") score += 60

  const marker = item.name.toLowerCase()

  if (marker.includes("ferritin")) score += 20
  if (marker.includes("vitamin d")) score += 18
  if (marker.includes("magnesium")) score += 15
  if (marker.includes("vitamin b12")) score += 14
  if (marker.includes("crp")) score += 12
  if (marker.includes("insulin")) score += 10
  if (marker.includes("glucose")) score += 8
  if (marker.includes("testosterone")) score += 8

  return score
}

export function buildTopActions(report: BiomarkerResult[] = []) {
  if (!Array.isArray(report)) return []

  return report
    .filter((item) => isFlagged(item.status))
    .map((item) => ({
      marker: item.name,
      status: item.status,
      value: item.value,
      optimalRange:
        item.optimalMin !== null && item.optimalMax !== null
          ? `${item.optimalMin}–${item.optimalMax}`
          : "Not available",
      why: item.whyItMatters || `${item.name} is outside the desired range.`,
      foods: item.foods || "",
      lifestyle: item.lifestyle || "",
      supplements: item.supplementNotes || "",
      retest: item.retest || "",
      research: item.researchSummary || "",
      priorityScore: getPriorityScore(item),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
}