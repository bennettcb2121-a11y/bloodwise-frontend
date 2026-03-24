"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { getProtocolLog, getProtocolLogHistory, upsertProtocolLog } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { parseSupplementRow } from "@/src/lib/supplementDisplay"

const PROTOCOL_STORAGE_KEY = "clarion_protocol_log"
function getLocalProtocolLog(): Record<string, Record<string, boolean>> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(PROTOCOL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
function setProtocolLog(log: Record<string, Record<string, boolean>>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(log))
  } catch {}
}

function dayCompleted(checks: Record<string, boolean>): boolean {
  return Object.values(checks).some(Boolean)
}

const PLAN_LINK = "/dashboard/plan#stack"

export function ProtocolTracker({
  stackSnapshot,
  userId,
  onAllComplete,
  /** Top focus marker forecast (e.g. +10) — optional. */
  pointsAvailable,
  /** Where "Finish today" scrolls (default: home protocol anchor). */
  finishTodayHref = "/dashboard#protocol",
}: {
  stackSnapshot?: BloodworkSaveRow["stack_snapshot"]
  userId?: string | null
  onAllComplete?: () => void
  pointsAvailable?: number | null
  finishTodayHref?: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultItems = ["Iron protocol", "Vitamin D", "Magnesium", "Omega-3"]
  const stack = stackSnapshot && "stack" in stackSnapshot && Array.isArray(stackSnapshot.stack)
    ? stackSnapshot.stack.map((s: { supplementName?: string }) => s.supplementName || "").filter(Boolean)
    : []
  const items = stack.length > 0 ? stack : defaultItems
  const hasPersonalizedStack = stack.length > 0
  const [log, setLog] = useState<Record<string, Record<string, boolean>>>(getLocalProtocolLog)
  const [synced, setSynced] = useState(false)
  const [streakDays, setStreakDays] = useState<number>(0)
  const [weekCompleted, setWeekCompleted] = useState<number>(0)
  const [popKey, setPopKey] = useState<string | null>(null)
  const todayLog = log[today] ?? {}

  const pointsTotal =
    typeof pointsAvailable === "number" && pointsAvailable > 0 ? Math.round(pointsAvailable) : null
  const pointsPerStep =
    pointsTotal != null && items.length > 0 ? Math.max(1, Math.round(pointsTotal / items.length)) : 0

  useEffect(() => {
    if (!userId || synced) return
    getProtocolLog(userId, today)
      .then((checks) => {
        if (Object.keys(checks).length > 0) {
          setLog((prev) => ({ ...prev, [today]: checks }))
        }
        setSynced(true)
      })
      .catch(() => setSynced(true))
  }, [userId, today, synced])

  useEffect(() => {
    if (!userId) return
    getProtocolLogHistory(userId, 14)
      .then((history) => {
        const byDate: Record<string, boolean> = {}
        history.forEach(({ log_date, checks }) => {
          byDate[log_date] = dayCompleted(checks)
        })
        byDate[today] = dayCompleted(todayLog)
        let streak = 0
        for (let i = 0; i < 14; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().slice(0, 10)
          if (byDate[dateStr]) streak++
          else break
        }
        setStreakDays(streak)
        let week = 0
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          if (byDate[d.toISOString().slice(0, 10)]) week++
        }
        setWeekCompleted(week)
      })
      .catch(() => {})
  }, [userId, today, todayLog])

  const completed = items.filter((i) => todayLog[i]).length
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0
  const allDone = items.length > 0 && completed === items.length

  const persist = useCallback(
    (nextToday: Record<string, boolean>, nextLog: Record<string, Record<string, boolean>>) => {
      setLog(nextLog)
      setProtocolLog(nextLog)
      if (userId) {
        upsertProtocolLog(userId, today, nextToday).catch(() => {})
      }
    },
    [userId, today]
  )

  const toggle = useCallback(
    (item: string) => {
      const nextToday = { ...todayLog, [item]: !todayLog[item] }
      const nextCompleted = items.filter((i) => nextToday[i]).length
      const justCompletedAll = items.length > 0 && nextCompleted === items.length && completed < items.length
      const nextLog = { ...log, [today]: nextToday }
      persist(nextToday, nextLog)
      if (justCompletedAll) onAllComplete?.()
    },
    [todayLog, items, completed, log, today, persist, onAllComplete]
  )

  const handleDoneClick = (item: string) => {
    const willCheck = !todayLog[item]
    if (willCheck && pointsPerStep > 0) {
      setPopKey(item)
      window.setTimeout(() => setPopKey(null), 1100)
    }
    toggle(item)
  }

  if (!hasPersonalizedStack) {
    return (
      <div className="dashboard-card dashboard-protocol-tracker dashboard-protocol-tracker--empty">
        <p className="dashboard-protocol-empty-title">Get your personalized protocol</p>
        <p className="dashboard-protocol-empty-desc">
          Add your bloodwork to see a supplement plan tailored to your results, then track it here every day.
        </p>
        <Link href="/?step=labs" className="dashboard-protocol-empty-cta">
          Add bloodwork
        </Link>
      </div>
    )
  }

  return (
    <div className="dashboard-card dashboard-protocol-tracker">
      <div className="dashboard-protocol-plan-head">
        <div>
          <p className="dashboard-protocol-plan-kicker">Today&apos;s plan</p>
          <p className="dashboard-protocol-plan-sub">
            {pointsTotal != null
              ? `Complete all ${items.length} to unlock +${pointsTotal} points`
              : "Complete these to improve your score"}
          </p>
        </div>
        {pointsTotal != null && (
          <Link href={finishTodayHref} className="dashboard-protocol-plan-anchor">
            Finish today → +{pointsTotal} points
          </Link>
        )}
      </div>

      <div className="dashboard-protocol-header">
        <div className="dashboard-protocol-progress-wrap">
          <div className="dashboard-protocol-progress-row">
            <span className="dashboard-protocol-progress-count">
              Progress: {completed} / {items.length} complete
            </span>
            {pointsTotal != null && (
              <span className="dashboard-protocol-points-pill">+{pointsTotal} points available</span>
            )}
          </div>
          <div
            className="dashboard-protocol-progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Today ${completed} of ${items.length} completed`}
          >
            <div className="dashboard-protocol-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="dashboard-protocol-pct">
            {(streakDays > 0 || weekCompleted > 0) && (
              <span className="dashboard-protocol-pct-meta">
                {streakDays > 0 && <span className="dashboard-protocol-streak">{streakDays}-day streak</span>}
                {streakDays > 0 && weekCompleted > 0 && <span className="dashboard-protocol-meta-sep"> · </span>}
                {weekCompleted > 0 && <span className="dashboard-protocol-week">This week: {weekCompleted}/7</span>}
              </span>
            )}
          </div>
        </div>
        {allDone && (
          <p className="dashboard-protocol-done-msg">
            {streakDays > 0 ? `You're on a ${streakDays}-day streak.` : "All set for today."}
          </p>
        )}
      </div>

      <ul className="dashboard-protocol-list" role="list">
        {items.map((item) => {
          const done = !!todayLog[item]
          const display = parseSupplementRow(item)
          const showPop = popKey === item
          return (
            <li key={item} className="dashboard-protocol-list-item">
              <div
                className={`dashboard-protocol-row ${done ? "dashboard-protocol-row--done" : ""}`}
              >
                {showPop && pointsPerStep > 0 && (
                  <span className="dashboard-protocol-points-burst" aria-live="polite">
                    +{pointsPerStep} pts
                  </span>
                )}
                <div className="dashboard-protocol-row-main">
                  <span className="dashboard-protocol-emoji" aria-hidden>
                    {display.emoji}
                  </span>
                  <div className="dashboard-protocol-text">
                    <span className="dashboard-protocol-title">{display.title}</span>
                    <span className="dashboard-protocol-sub">{display.line2}</span>
                  </div>
                </div>
                <div className="dashboard-protocol-row-actions">
                  <Link
                    href={PLAN_LINK}
                    className="dashboard-protocol-btn dashboard-protocol-btn--take"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Take
                  </Link>
                  <button
                    type="button"
                    className={`dashboard-protocol-btn dashboard-protocol-btn--done${done ? " dashboard-protocol-btn--done-on" : ""}`}
                    onClick={() => handleDoneClick(item)}
                    aria-pressed={done}
                  >
                    Done ✓
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {pointsTotal != null && (
        <div className="dashboard-protocol-footer-cta">
          <Link href={finishTodayHref} className="dashboard-protocol-finish-cta">
            Finish today → +{pointsTotal} points
          </Link>
          <p className="dashboard-protocol-footer-hint">
            Dosing & reorder links live on{" "}
            <Link href={PLAN_LINK} className="dashboard-protocol-footer-hint-link">
              Plan
            </Link>
            .
          </p>
        </div>
      )}
      {pointsTotal == null && (
        <p className="dashboard-protocol-footer-hint dashboard-protocol-footer-hint--solo">
          Dosing & reorder links on{" "}
          <Link href={PLAN_LINK} className="dashboard-protocol-footer-hint-link">
            Plan
          </Link>
          .
        </p>
      )}
    </div>
  )
}
