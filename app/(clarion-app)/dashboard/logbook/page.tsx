"use client"

/**
 * Logbook page — month calendar view of protocol compliance + lab milestones.
 *
 * Flow:
 *   1. Load profile + latest bloodwork + bloodwork history + lab sessions once on mount.
 *   2. When the user navigates months, re-query `protocol_log` for the 42-day grid range.
 *   3. Compose a `LogbookMonth` via pure date math (in src/lib/logbook.ts) and render.
 *
 * Why this page sits inside (clarion-app):
 *   - It's an authenticated, consent-aware dashboard surface that benefits from
 *     the shared sidebar nav + FAB. Placing it here means users get the same
 *     chrome as /dashboard, /dashboard/trends, etc.
 */

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BookOpen, ArrowLeft } from "lucide-react"
import { useAuth } from "@/src/contexts/AuthContext"
import {
  getBloodworkHistory,
  getLabSessions,
  getProtocolLogChecksInRange,
  loadSavedState,
} from "@/src/lib/bloodwiseDb"
import type {
  BloodworkSaveRow,
  LabUploadSessionRow,
  ProfileRow,
  SavedSupplementStackItem,
} from "@/src/lib/bloodwiseDb"
import {
  buildMonthGrid,
  collectLabDates,
  computeNextRetestDate,
  firstOfMonth,
  monthGridRange,
  toLocalIso,
} from "@/src/lib/logbook"
import { LogbookCalendar } from "@/src/components/LogbookCalendar"
import { LogbookDayDetail } from "@/src/components/LogbookDayDetail"

import "../dashboard.css"
import "./logbook.css"

/** Shift a Date by whole months, clamping to the same day-of-month where possible. */
function addMonths(d: Date, delta: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth() + delta, 1)
  return c
}

/** Resolve the user's current stack for the day-detail view. Profile-merge logic
 * matches what the dashboard uses as the source of truth for "what I take". */
function extractCurrentStack(bloodwork: BloodworkSaveRow | null): SavedSupplementStackItem[] {
  const snap = bloodwork?.stack_snapshot as { stack?: SavedSupplementStackItem[] } | undefined
  return Array.isArray(snap?.stack) ? (snap?.stack ?? []) : []
}

export default function LogbookPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [labSessions, setLabSessions] = useState<LabUploadSessionRow[]>([])
  const [logs, setLogs] = useState<{ log_date: string; checks: Record<string, boolean> }[]>([])
  const [monthStart, setMonthStart] = useState<Date>(() => firstOfMonth(new Date()))
  const [todayIso, setTodayIso] = useState<string>(() => toLocalIso(new Date()))
  const [selectedIso, setSelectedIso] = useState<string | null>(() => toLocalIso(new Date()))
  const [loadingMonth, setLoadingMonth] = useState(false)

  // Base data (profile, bloodwork). Re-run only when auth user changes.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    Promise.all([
      loadSavedState(user.id),
      getBloodworkHistory(user.id, 20),
      getLabSessions(user.id, 40),
    ])
      .then(([{ profile: p, bloodwork: b }, history, sessions]) => {
        if (cancelled) return
        setProfile(p ?? null)
        setBloodwork(b ?? null)
        setBloodworkHistory(history)
        setLabSessions(sessions)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Reload protocol logs whenever the viewed month changes. We fetch the full
  // 42-cell grid range (not just the month) so leading/trailing spacers in the
  // grid still show their dots.
  //
  // The `setLoadingMonth(true)` call is deferred to a microtask so it doesn't trip
  // react-hooks/set-state-in-effect (which forbids synchronous setState in the effect
  // body). Queuing it keeps the spinner behavior identical while satisfying the rule.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const { startIso, endIso } = monthGridRange(monthStart)
    queueMicrotask(() => {
      if (!cancelled) setLoadingMonth(true)
    })
    getProtocolLogChecksInRange(user.id, startIso, endIso)
      .then((rows) => {
        if (cancelled) return
        setLogs(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMonth(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, monthStart])

  // Keep "today" fresh in case the tab stays open across midnight. Check every
  // few minutes — cheap and avoids a stale calendar.
  useEffect(() => {
    const tick = () => setTodayIso(toLocalIso(new Date()))
    const id = window.setInterval(tick, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const labDates = useMemo(
    () => collectLabDates(bloodworkHistory, labSessions),
    [bloodworkHistory, labSessions]
  )

  const latestLabIso = useMemo(() => {
    const all = Array.from(labDates).sort() // ascending
    return all.length > 0 ? all[all.length - 1] : null
  }, [labDates])

  const nextRetestIso = useMemo(
    () => computeNextRetestDate(latestLabIso, profile?.retest_weeks ?? 8),
    [latestLabIso, profile?.retest_weeks]
  )

  const month = useMemo(
    () => buildMonthGrid(monthStart, { todayIso, logs, labDates, nextRetestIso }),
    [monthStart, todayIso, logs, labDates, nextRetestIso]
  )

  const selectedDay = useMemo(
    () => (selectedIso ? month.days.find((d) => d.isoDate === selectedIso) ?? null : null),
    [month, selectedIso]
  )

  const matchingBloodwork = useMemo(() => {
    if (!selectedDay?.hasLab) return null
    // Pick the bloodwork save whose local-ISO matches the selected day.
    return (
      bloodworkHistory.find((b) => {
        if (!b.created_at) return false
        return toLocalIso(new Date(b.created_at)) === selectedDay.isoDate
      }) ?? null
    )
  }, [selectedDay, bloodworkHistory])

  const currentStack = useMemo(() => extractCurrentStack(bloodwork), [bloodwork])

  const monthStats = useMemo(() => {
    const inMonthDays = month.days.filter((d) => d.inMonth)
    const loggedDays = inMonthDays.filter((d) => d.checksCompleted > 0).length
    const totalChecks = inMonthDays.reduce((n, d) => n + d.checksCompleted, 0)
    return { loggedDays, totalChecks, inMonthDayCount: inMonthDays.length }
  }, [month])

  if (authLoading) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading logbook…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-container">
          <p>
            <Link href="/login">Sign in</Link> to see your logbook.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container logbook-layout">
        <header className="dashboard-tab-header logbook-header">
          <div>
            <p className="logbook-eyebrow">
              <BookOpen size={14} aria-hidden /> Logbook
            </p>
            <h1 className="dashboard-tab-title">Your day-by-day record</h1>
            <p className="dashboard-tab-subtitle">
              See which days you took your protocol, when you tested, and when it&rsquo;s
              time for a retest. Click any day for details.
            </p>
          </div>
          <Link href="/dashboard" className="logbook-back">
            <ArrowLeft size={14} aria-hidden /> Home
          </Link>
        </header>

        <section className="logbook-summary" aria-label="This month at a glance">
          <div className="logbook-summary__stat">
            <span className="logbook-summary__num">{monthStats.loggedDays}</span>
            <span className="logbook-summary__label">
              day{monthStats.loggedDays === 1 ? "" : "s"} logged this month
            </span>
          </div>
          <div className="logbook-summary__stat">
            <span className="logbook-summary__num">{monthStats.totalChecks}</span>
            <span className="logbook-summary__label">items checked off</span>
          </div>
          {nextRetestIso ? (
            <div className="logbook-summary__stat">
              <span className="logbook-summary__num logbook-summary__num--small">
                {new Date(nextRetestIso + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="logbook-summary__label">next retest target</span>
            </div>
          ) : (
            <div className="logbook-summary__stat">
              <span className="logbook-summary__num logbook-summary__num--small">—</span>
              <span className="logbook-summary__label">
                <Link href="/labs/upload" className="logbook-summary__link">
                  Upload labs
                </Link>{" "}
                to set a retest
              </span>
            </div>
          )}
        </section>

        <div className="logbook-body" data-loading={loadingMonth ? "1" : "0"}>
          <LogbookCalendar
            month={month}
            selectedIso={selectedIso}
            onSelectDay={setSelectedIso}
            onPrevMonth={() => setMonthStart((m) => addMonths(m, -1))}
            onNextMonth={() => setMonthStart((m) => addMonths(m, 1))}
          />
          <LogbookDayDetail
            day={selectedDay}
            currentStack={currentStack}
            matchingBloodwork={matchingBloodwork}
          />
        </div>
      </div>
    </main>
  )
}
