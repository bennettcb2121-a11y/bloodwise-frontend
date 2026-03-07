type BiomarkerResult = {
  status?: string
}

export function calculateScore(report: BiomarkerResult[] = []) {
  if (!Array.isArray(report) || report.length === 0) return 100

  let score = 100

  for (const item of report) {
    const status = String(item?.status || "").toLowerCase()

    if (status === "deficient") {
      score -= 18
    } else if (status === "low") {
      score -= 12
    } else if (status === "suboptimal") {
      score -= 8
    } else if (status === "high") {
      score -= 10
    }
  }

  if (!Number.isFinite(score)) return 100

  return Math.max(0, Math.round(score))
}