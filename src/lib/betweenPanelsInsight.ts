/**
 * Compare daily logged habits in the window between two blood panels vs biomarker changes.
 * Education only — patterns, not causation.
 */

import { analyzeBiomarkers, type BiomarkerResult } from "./analyzeBiomarkers"
import type { DailyMetrics } from "./dailyMetrics"
import type { BloodworkSaveRow } from "./bloodwiseDb"
import type { UserProfile } from "./classifyUser"

export type BetweenPanelsWindow = {
  startDate: string
  endDate: string
  /** Human label e.g. "Jan 12 – Mar 3, 2025" */
  label: string
}

export type AggregatedBetweenMetrics = {
  daysWithAnyLog: number
  daysWithMetrics: number
  avgActivity: number | null
  avgSunMinutes: number | null
  avgHydrationCups: number | null
  avgSleepHours: number | null
  avgWeightKg: number | null
}

export type MarkerDeltaRow = {
  marker: string
  valueBefore: number
  valueAfter: number
  delta: number
  statusBefore: string
  statusAfter: string
}

function panelCalendarDate(row: BloodworkSaveRow): string {
  const raw = row.created_at ?? row.updated_at
  if (!raw) return new Date().toISOString().slice(0, 10)
  return new Date(raw).toISOString().slice(0, 10)
}

/** Add days to YYYY-MM-DD (local-safe via UTC noon). */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Habits window: first day after older panel through last day before newer panel.
 * history newest-first: newer = [0], older = [1].
 */
export function getBetweenPanelsWindow(
  olderPanel: BloodworkSaveRow,
  newerPanel: BloodworkSaveRow
): BetweenPanelsWindow | null {
  const older = panelCalendarDate(olderPanel)
  const newer = panelCalendarDate(newerPanel)
  const startDate = addDaysToIsoDate(older, 1)
  const endDate = addDaysToIsoDate(newer, -1)
  if (startDate > endDate) {
    return null
  }
  const o = new Date(older + "T12:00:00.000Z")
  const n = new Date(newer + "T12:00:00.000Z")
  const label = `${o.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} → ${n.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  return { startDate, endDate, label }
}

function dayHasMetrics(m: DailyMetrics): boolean {
  return (
    m.activity_level != null ||
    m.sun_minutes != null ||
    m.hydration_cups != null ||
    m.sleep_hours != null ||
    m.weight_kg != null ||
    (m.notes != null && m.notes.trim().length > 0)
  )
}

export function aggregateMetricsForWindow(
  rows: { metrics: DailyMetrics }[]
): AggregatedBetweenMetrics {
  const withM = rows.filter((r) => dayHasMetrics(r.metrics))
  const daysWithAnyLog = rows.length

  const act = withM.map((r) => r.metrics.activity_level).filter((v): v is number => typeof v === "number")
  const sun = withM.map((r) => r.metrics.sun_minutes).filter((v): v is number => typeof v === "number")
  const hyd = withM.map((r) => r.metrics.hydration_cups).filter((v): v is number => typeof v === "number")
  const slp = withM.map((r) => r.metrics.sleep_hours).filter((v): v is number => typeof v === "number")
  const w = withM.map((r) => r.metrics.weight_kg).filter((v): v is number => typeof v === "number")

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)

  return {
    daysWithAnyLog,
    daysWithMetrics: withM.length,
    avgActivity: avg(act),
    avgSunMinutes: avg(sun),
    avgHydrationCups: avg(hyd),
    avgSleepHours: avg(slp),
    avgWeightKg: avg(w),
  }
}

function isComparableStatus(s: string): boolean {
  const t = s.toLowerCase()
  return t !== "unknown" && t !== ""
}

export function computeMarkerDeltas(
  olderInputs: Record<string, string | number>,
  newerInputs: Record<string, string | number>,
  profile: UserProfile
): MarkerDeltaRow[] {
  const oldR = analyzeBiomarkers(olderInputs, profile)
  const newR = analyzeBiomarkers(newerInputs, profile)
  const newByName = new Map(newR.map((r) => [r.name, r]))
  const out: MarkerDeltaRow[] = []
  for (const a of oldR) {
    const name = a.name ?? ""
    if (!name) continue
    const b = newByName.get(name)
    if (!b) continue
    if (!isComparableStatus(a.status) || !isComparableStatus(b.status)) continue
    const delta = b.value - a.value
    if (delta === 0 && a.status === b.status) continue
    out.push({
      marker: name,
      valueBefore: a.value,
      valueAfter: b.value,
      delta,
      statusBefore: a.status,
      statusAfter: b.status,
    })
  }
  out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
  return out.slice(0, 12)
}

export function buildBetweenPanelsNarrative(args: {
  window: BetweenPanelsWindow | null
  agg: AggregatedBetweenMetrics
  scoreBefore: number | null
  scoreAfter: number | null
  improvedMarkers: string[]
}): string {
  const { window, agg, scoreBefore, scoreAfter, improvedMarkers } = args
  const parts: string[] = []
  if (window) {
    parts.push(`Between your panels (${window.label}), you logged habits on ${agg.daysWithMetrics} day${agg.daysWithMetrics === 1 ? "" : "s"}.`)
  }
  const habitBits: string[] = []
  if (agg.avgActivity != null) habitBits.push(`activity ~${agg.avgActivity.toFixed(1)}/5`)
  if (agg.avgSunMinutes != null) habitBits.push(`~${Math.round(agg.avgSunMinutes)} min sun/day`)
  if (agg.avgSleepHours != null) habitBits.push(`~${agg.avgSleepHours.toFixed(1)} h sleep`)
  if (agg.avgHydrationCups != null) habitBits.push(`~${agg.avgHydrationCups.toFixed(1)} cups water/day`)
  if (habitBits.length) {
    parts.push(`Averages when logged: ${habitBits.join(" · ")}.`)
  }
  if (scoreBefore != null && scoreAfter != null) {
    const d = scoreAfter - scoreBefore
    if (d !== 0) {
      parts.push(`Panel score ${d > 0 ? "rose" : "changed"} by ${d > 0 ? "+" : ""}${Math.round(d)} points.`)
    }
  }
  if (improvedMarkers.length) {
    parts.push(`${improvedMarkers.slice(0, 3).join(", ")} moved toward a better range — many factors affect labs; use this as context, not proof.`)
  } else if (parts.length === 0) {
    parts.push("Log daily habits on this tab to see averages here next to your next panel.")
  } else {
    parts.push("Biomarker shifts and habits may line up — or not; your clinician interprets labs in full context.")
  }
  return parts.join(" ")
}

export function getImprovedMarkerNamesBetweenPanels(
  olderResults: BiomarkerResult[],
  newerResults: BiomarkerResult[]
): string[] {
  const oldByName = new Map(olderResults.map((r) => [r.name ?? "", (r.status ?? "").toLowerCase()]))
  const improved: string[] = []
  for (const r of newerResults) {
    const name = r.name ?? ""
    if (!name) continue
    const ns = (r.status ?? "").toLowerCase()
    if (ns !== "optimal" && ns !== "normal" && ns !== "in range") continue
    const os = oldByName.get(name) ?? ""
    if (os && os !== "optimal" && os !== "normal" && os !== "in range") {
      improved.push(name)
    }
  }
  return improved.slice(0, 6)
}
