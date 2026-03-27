/**
 * Home dashboard: biomarker series from saved panels and "improved since last test" helpers.
 */

import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"

export function getMarkerValueSeries(
  historyNewestFirst: Array<{ biomarker_inputs?: Record<string, string | number> }>,
  markerName: string
): number[] {
  const chronological = [...historyNewestFirst].reverse()
  const out: number[] = []
  for (const row of chronological) {
    const raw = row.biomarker_inputs?.[markerName]
    if (raw === undefined || raw === "") continue
    const n = Number(raw)
    if (!Number.isFinite(n)) continue
    out.push(n)
  }
  return out
}

/** Markers that reached optimal/normal between the two most recent panels (history[0]=newest). */
export function getImprovedMarkersBetweenRecentPanels(
  historyNewestFirst: Array<{ biomarker_inputs?: Record<string, string | number> }>,
  profile: { age?: string; sex?: string; sport?: string }
): string[] {
  if (historyNewestFirst.length < 2) return []
  const newerRow = historyNewestFirst[0]
  const olderRow = historyNewestFirst[1]
  const oldResults = analyzeBiomarkers(olderRow.biomarker_inputs ?? {}, profile)
  const newResults = analyzeBiomarkers(newerRow.biomarker_inputs ?? {}, profile)
  const oldByName = new Map(oldResults.map((r) => [r.name ?? "", (r.status ?? "").toLowerCase()]))
  const improved: string[] = []
  for (const r of newResults) {
    const name = r.name ?? ""
    if (!name) continue
    const newStatus = (r.status ?? "").toLowerCase()
    if (newStatus !== "optimal" && newStatus !== "normal" && newStatus !== "in range") continue
    const oldStatus = oldByName.get(name) ?? ""
    if (oldStatus && oldStatus !== "optimal" && oldStatus !== "normal" && oldStatus !== "in range") {
      improved.push(name)
    }
  }
  return improved.slice(0, 4)
}

export function shortMarkerLabel(name: string): string {
  const n = name.trim()
  if (n.length <= 22) return n
  return `${n.slice(0, 20)}…`
}
