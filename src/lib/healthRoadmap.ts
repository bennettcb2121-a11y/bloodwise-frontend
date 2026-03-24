/**
 * Health optimization roadmap: phases (Fix deficiencies → Optimize → Maintain).
 * Used to show "You are in Phase X" and next phase on the dashboard.
 */

export type RoadmapPhase = {
  id: string
  label: string
  biomarkerKeys: string[]
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: "fix_deficiencies",
    label: "Fix deficiencies",
    biomarkerKeys: ["Ferritin", "Vitamin D", "Vitamin B12", "Folate"],
  },
  {
    id: "optimize",
    label: "Optimize nutrients",
    biomarkerKeys: ["Magnesium", "Vitamin D", "Vitamin B12", "Folate"],
  },
  {
    id: "maintain",
    label: "Maintain and monitor",
    biomarkerKeys: ["Ferritin", "Vitamin D", "Vitamin B12", "Magnesium", "hs-CRP"],
  },
]

export type BiomarkerStatus = {
  name: string
  status: string
}

/**
 * Given analysis results, return current phase (first phase where any marker is not optimal) and next phase.
 */
export function getRoadmapPhase(analysisResults: BiomarkerStatus[]): {
  currentPhase: RoadmapPhase
  nextPhase: RoadmapPhase | null
  currentPhaseProgress: { marker: string; status: string }[]
} {
  const statusByMarker: Record<string, string> = {}
  analysisResults.forEach((r) => {
    const name = (r.name ?? "").trim()
    if (name) statusByMarker[name] = (r.status ?? "").toLowerCase()
    if (name === "25-OH Vitamin D") statusByMarker["Vitamin D"] = (r.status ?? "").toLowerCase()
  })

  let currentPhase = ROADMAP_PHASES[0]
  let currentPhaseProgress: { marker: string; status: string }[] = []

  for (const phase of ROADMAP_PHASES) {
    const inPhase = phase.biomarkerKeys.filter((key) => statusByMarker[key] && statusByMarker[key] !== "optimal")
    if (inPhase.length > 0) {
      currentPhase = phase
      currentPhaseProgress = phase.biomarkerKeys.map((key) => ({
        marker: key,
        status: statusByMarker[key] ?? "unknown",
      }))
      break
    }
  }

  const currentIndex = ROADMAP_PHASES.findIndex((p) => p.id === currentPhase.id)
  const nextPhase = currentIndex >= 0 && currentIndex < ROADMAP_PHASES.length - 1
    ? ROADMAP_PHASES[currentIndex + 1]
    : null

  return { currentPhase, nextPhase, currentPhaseProgress }
}
