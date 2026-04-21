/**
 * Logbook — pure date math + data shape helpers for the monthly calendar view.
 *
 * This module is intentionally free of React, Supabase, or DOM code so the math
 * can be unit-tested (`logbook.test.ts`). The page component imports the
 * `load*` helpers from here and feeds the results into the calendar UI.
 *
 * Conventions:
 * - Dates are represented as ISO date strings ("YYYY-MM-DD") in the user's
 *   local wall-clock time. We avoid UTC conversions on the calendar grid
 *   because a user thinking "Tuesday" should map to their local Tuesday.
 * - Weeks start on Sunday (US convention) because our protocol log and streak
 *   logic already treat Sunday as day 0. If we ever internationalize this
 *   we'll need to plumb a locale-aware firstDayOfWeek, but not today.
 */

import type { BloodworkSaveRow, LabUploadSessionRow } from "@/src/lib/bloodwiseDb"

/** A single day in the calendar grid, already classified for rendering. */
export type LogbookDay = {
  /** "YYYY-MM-DD" in local time. */
  isoDate: string
  /** 1–31. */
  dayOfMonth: number
  /** Whether this day is in the currently-viewed month (else it's a leading/trailing spacer). */
  inMonth: boolean
  /** Whether this day is today in local time. */
  isToday: boolean
  /** Whether this day is strictly in the future (after today). */
  isFuture: boolean
  /** Number of protocol checks the user completed this day (0 if no log). */
  checksCompleted: number
  /** Items that were checked this day (stack item keys → true). Empty if no log. */
  checks: Record<string, boolean>
  /** True if bloodwork was saved on this day. */
  hasLab: boolean
  /** True if this day is the suggested retest day (single day). */
  isRetestDay: boolean
  /** True if this day is in the "retest window" (7-day cushion around the target). */
  isRetestWindow: boolean
}

/** Week grouping for week-summary strip above the grid. */
export type LogbookWeek = {
  days: LogbookDay[]
  /** Total checks across the 7 days, used as the numerator in the weekly summary. */
  totalChecks: number
  /** True if any day in the week has a log, used to hide the strip for weeks with no data. */
  hasAnyLog: boolean
}

export type LogbookMonth = {
  /** First day of the viewed month, local. */
  monthStart: Date
  /** Human label e.g. "April 2026". */
  label: string
  /** Flat list of days making up 6 week rows (42 cells). */
  days: LogbookDay[]
  /** Grouped into weeks for convenient row rendering. */
  weeks: LogbookWeek[]
}

/** Build a YYYY-MM-DD string from a Date using local time (not UTC). */
export function toLocalIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD as a local Date at midnight. */
export function fromLocalIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Normalize any Date to midnight local (so day-to-day comparisons are stable). */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** First of the month (local, midnight). */
export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Add N days to a local date, preserving time-of-day. */
export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/**
 * Next retest date given the most recent lab date.
 *
 * Takes the latest ISO date and an intended weeks cadence (defaults to 8,
 * matching the app's default `retest_weeks` profile value). Returns a local
 * ISO date. If `latestLabIso` is null or invalid, returns null.
 */
export function computeNextRetestDate(
  latestLabIso: string | null | undefined,
  retestWeeks: number | null | undefined
): string | null {
  if (!latestLabIso) return null
  const weeks = Number(retestWeeks ?? 8)
  if (!Number.isFinite(weeks) || weeks <= 0) return null
  const d = fromLocalIso(latestLabIso)
  if (Number.isNaN(d.getTime())) return null
  const target = addDays(d, Math.round(weeks * 7))
  return toLocalIso(target)
}

/**
 * Coerce whatever Supabase returned to a local ISO date ("YYYY-MM-DD").
 *
 * Supabase returns two shapes we need to handle carefully:
 *   - `date` columns → bare "YYYY-MM-DD" strings, which we MUST treat as local
 *     calendar dates. Passing them to `new Date(...)` would parse them as UTC
 *     midnight and shift them a day earlier/later for users in negative/
 *     positive offsets respectively.
 *   - `timestamptz` columns → full ISO strings like "2026-04-21T12:00:00Z"
 *     which we bucket into the user's local calendar day.
 */
function coerceToLocalIso(raw: string | null | undefined): string | null {
  if (!raw) return null
  // Bare YYYY-MM-DD: treat as already-local.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return toLocalIso(d)
}

/**
 * Extract "this is a bloodwork day" markers from both legacy bloodwork_saves
 * and the new lab_upload_sessions tables. De-dupes by local ISO date.
 */
export function collectLabDates(
  bloodworkSaves: Pick<BloodworkSaveRow, "created_at">[],
  labSessions: Pick<LabUploadSessionRow, "collected_at" | "created_at" | "status">[]
): Set<string> {
  const out = new Set<string>()
  for (const row of bloodworkSaves) {
    const iso = coerceToLocalIso(row?.created_at)
    if (iso) out.add(iso)
  }
  for (const s of labSessions) {
    // Only count confirmed sessions as "lab days" (uploading/extracting sessions
    // aren't successful yet and shouldn't pin a badge on the calendar).
    if (s?.status && s.status !== "confirmed") continue
    const iso = coerceToLocalIso(s?.collected_at || s?.created_at)
    if (iso) out.add(iso)
  }
  return out
}

/** A logged day — what we get back from `getProtocolLogHistory`. */
export type LoggedDay = { log_date: string; checks: Record<string, boolean> }

/**
 * Build the 6-week (42-cell) grid for the requested month. Weeks start on
 * Sunday to match the rest of the app's streak/week math.
 */
export function buildMonthGrid(
  monthDate: Date,
  input: {
    todayIso: string
    logs: LoggedDay[]
    labDates: Set<string>
    nextRetestIso: string | null
  }
): LogbookMonth {
  const first = firstOfMonth(monthDate)
  // Walk back to the Sunday on/before the 1st.
  const gridStart = addDays(first, -first.getDay())
  const byDate = new Map<string, Record<string, boolean>>()
  for (const l of input.logs) {
    if (l?.log_date) byDate.set(l.log_date, l.checks ?? {})
  }

  const todayIso = input.todayIso
  const retestIso = input.nextRetestIso
  const retestRangeStart = retestIso ? toLocalIso(addDays(fromLocalIso(retestIso), -3)) : null
  const retestRangeEnd = retestIso ? toLocalIso(addDays(fromLocalIso(retestIso), 3)) : null

  const days: LogbookDay[] = []
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i)
    const iso = toLocalIso(d)
    const checks = byDate.get(iso) ?? {}
    const checksCompleted = Object.values(checks).filter(Boolean).length
    const inMonth = d.getMonth() === monthDate.getMonth()
    const isToday = iso === todayIso
    const isFuture = iso > todayIso
    const hasLab = input.labDates.has(iso)
    const isRetestDay = !!retestIso && iso === retestIso
    const isRetestWindow =
      !!retestRangeStart && !!retestRangeEnd && iso >= retestRangeStart && iso <= retestRangeEnd
    days.push({
      isoDate: iso,
      dayOfMonth: d.getDate(),
      inMonth,
      isToday,
      isFuture,
      checksCompleted,
      checks,
      hasLab,
      isRetestDay,
      isRetestWindow,
    })
  }

  const weeks: LogbookWeek[] = []
  for (let w = 0; w < 6; w++) {
    const slice = days.slice(w * 7, w * 7 + 7)
    const totalChecks = slice.reduce((n, d) => n + d.checksCompleted, 0)
    const hasAnyLog = slice.some((d) => d.checksCompleted > 0)
    weeks.push({ days: slice, totalChecks, hasAnyLog })
  }

  const label = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  return { monthStart: firstOfMonth(monthDate), label, days, weeks }
}

/** Query range needed to populate the 42-cell grid, expressed as local ISO. */
export function monthGridRange(monthDate: Date): { startIso: string; endIso: string } {
  const first = firstOfMonth(monthDate)
  const gridStart = addDays(first, -first.getDay())
  const gridEnd = addDays(gridStart, 41)
  return { startIso: toLocalIso(gridStart), endIso: toLocalIso(gridEnd) }
}
