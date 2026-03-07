type BiomarkerResult = {
  name: string
  status: "deficient" | "suboptimal" | "optimal" | "high"
}

type Profile = {
  sport?: string
}

function joinNames(items: string[]) {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

export function buildReportSummary(
  report: BiomarkerResult[] = [],
  profile?: Profile,
  score?: number
) {
  if (!Array.isArray(report) || report.length === 0) {
    return "No biomarker data was analyzed."
  }

  const deficient = report
    .filter((item) => item.status === "deficient")
    .map((item) => item.name)

  const suboptimal = report
    .filter((item) => item.status === "suboptimal")
    .map((item) => item.name)

  const high = report
    .filter((item) => item.status === "high")
    .map((item) => item.name)

  if (deficient.length === 0 && suboptimal.length === 0 && high.length === 0) {
    return "Your biomarkers appear within optimal performance ranges."
  }

  const parts: string[] = []

  if (deficient.length > 0) {
    parts.push(`Your bloodwork shows deficiencies in ${joinNames(deficient)}.`)
  }

  if (suboptimal.length > 0) {
    parts.push(`Some markers are below optimal, including ${joinNames(suboptimal)}.`)
  }

  if (high.length > 0) {
    parts.push(`Some markers are elevated, including ${joinNames(high)}.`)
  }

  parts.push(
    "Addressing these markers may improve recovery, performance, and overall health."
  )

  return parts.join(" ")
}