/**
 * Pure progress math for the Home first-run checklist (modal + pill).
 * Kept separate for reliable unit tests and a single source of truth.
 */

export type FirstRunStep1Mode = "addLabs" | "reviewReport"

export function computeFirstRunChecklistProgress(params: {
  hasBloodwork: boolean
  cabinetCount: number
  anyStackFitComputed: boolean
  reportViewedLocal: boolean
  fitViewedLocal: boolean
}): {
  step1Mode: FirstRunStep1Mode
  step1Done: boolean
  cabinetDone: boolean
  fitDone: boolean
  allDone: boolean
  completedCount: number
} {
  const step1Mode: FirstRunStep1Mode = params.hasBloodwork ? "reviewReport" : "addLabs"
  const step1Done = step1Mode === "addLabs" ? params.hasBloodwork : params.reportViewedLocal
  const cabinetDone = params.cabinetCount > 0
  const fitDone = params.anyStackFitComputed || params.fitViewedLocal
  const allDone = step1Done && cabinetDone && fitDone
  const completedCount = [step1Done, cabinetDone, fitDone].filter(Boolean).length
  return { step1Mode, step1Done, cabinetDone, fitDone, allDone, completedCount }
}
