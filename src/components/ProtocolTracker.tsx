"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Circle, Sun, Droplets, Fish, Pill, Leaf } from "lucide-react"
import { getProtocolLog, getProtocolLogHistory, upsertProtocolLog } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { supplementProtocolDisplay } from "@/src/lib/supplementDisplay"
import type { SupplementGlyphKind } from "@/src/lib/supplementDisplay"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"

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

function ProtocolGlyphIcon({ kind }: { kind: SupplementGlyphKind }) {
  const c = "dashboard-protocol-glyph-svg"
  const stroke = 1.5
  switch (kind) {
    case "iron":
      return <Circle className={c} size={22} strokeWidth={stroke} aria-hidden />
    case "vitamin-d":
      return <Sun className={c} size={22} strokeWidth={stroke} aria-hidden />
    case "magnesium":
      return <Droplets className={c} size={22} strokeWidth={stroke} aria-hidden />
    case "omega":
      return <Fish className={c} size={22} strokeWidth={stroke} aria-hidden />
    case "b12":
      return <Pill className={c} size={22} strokeWidth={stroke} aria-hidden />
    case "herb":
      return <Leaf className={c} size={22} strokeWidth={stroke} aria-hidden />
    default:
      return <Pill className={c} size={22} strokeWidth={stroke} aria-hidden />
  }
}

export function ProtocolTracker({
  stackSnapshot,
  userId,
  onAllComplete,
  pointsAvailable,
  finishTodayHref = "/dashboard#protocol",
}: {
  stackSnapshot?: BloodworkSaveRow["stack_snapshot"]
  userId?: string | null
  onAllComplete?: () => void
  pointsAvailable?: number | null
  finishTodayHref?: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultNames = ["Iron protocol", "Vitamin D", "Magnesium", "Omega-3"]
  const stackRows: SavedSupplementStackItem[] =
    stackSnapshot && "stack" in stackSnapshot && Array.isArray(stackSnapshot.stack)
      ? (stackSnapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim())
      : []
  const rows: SavedSupplementStackItem[] =
    stackRows.length > 0
      ? stackRows
      : defaultNames.map((name) => ({
          supplementName: name,
          dose: "",
          monthlyCost: 0,
          recommendationType: "",
          reason: "",
        }))
  const items = rows.map((r) => r.supplementName)
  const hasPersonalizedStack = stackRows.length > 0
  const [log, setLog] = useState<Record<string, Record<string, boolean>>>(getLocalProtocolLog)
  const [synced, setSynced] = useState(false)
  const [streakDays, setStreakDays] = useState<number>(0)
  const [weekCompleted, setWeekCompleted] = useState<number>(0)
  const todayLog = log[today] ?? {}

  const pointsTotal =
    typeof pointsAvailable === "number" && pointsAvailable > 0 ? Math.round(pointsAvailable) : null

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

  if (!hasPersonalizedStack) {
    return (
      <div className="dashboard-protocol-tracker dashboard-protocol-tracker--empty">
        <p className="dashboard-protocol-empty-title">Personalized protocol</p>
        <p className="dashboard-protocol-empty-desc">
          Add bloodwork to generate a supplement plan aligned with your markers. Daily check-ins live here.
        </p>
        <Link href="/?step=labs" className="dashboard-protocol-empty-cta">
          Add bloodwork
        </Link>
      </div>
    )
  }

  return (
    <div className="dashboard-protocol-tracker">
      <div className="dashboard-protocol-plan-head">
        <div>
          <p className="dashboard-protocol-plan-kicker">Your steps</p>
          <p className="dashboard-protocol-plan-sub">
            Mark each when done — full dosing lives on Plan.
          </p>
        </div>
        {pointsTotal != null && (
          <p className="dashboard-protocol-points-note" aria-live="polite">
            Score impact up to +{pointsTotal} when all steps are logged
          </p>
        )}
      </div>

      <div className="dashboard-protocol-header">
        <div className="dashboard-protocol-progress-wrap">
          <div className="dashboard-protocol-progress-row">
            <span className="dashboard-protocol-progress-count">
              {completed} of {items.length} complete
            </span>
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
                {streakDays > 0 && <span className="dashboard-protocol-streak">{streakDays}-day logging streak</span>}
                {streakDays > 0 && weekCompleted > 0 && <span className="dashboard-protocol-meta-sep"> · </span>}
                {weekCompleted > 0 && <span className="dashboard-protocol-week">This week: {weekCompleted}/7</span>}
              </span>
            )}
          </div>
        </div>
        {allDone && (
          <p className="dashboard-protocol-done-msg">
            {streakDays > 0 ? `Logged ${streakDays} days in a row.` : "All steps logged for today."}
          </p>
        )}
      </div>

      <ul className="dashboard-protocol-list" role="list">
        {rows.map((row) => {
          const item = row.supplementName
          const done = !!todayLog[item]
          const display = supplementProtocolDisplay(row)
          return (
            <li key={item} className="dashboard-protocol-list-item">
              <div className={`dashboard-protocol-row ${done ? "dashboard-protocol-row--done" : ""}`}>
                <button
                  type="button"
                  className={`dashboard-protocol-check ${done ? "dashboard-protocol-check--on" : ""}`}
                  onClick={() => toggle(item)}
                  aria-pressed={done}
                  aria-label={done ? `Mark ${display.title} not done` : `Mark ${display.title} done`}
                >
                  <span className="dashboard-protocol-check-mark" aria-hidden />
                </button>
                <div className="dashboard-protocol-row-main">
                  <span className="dashboard-protocol-glyph" aria-hidden>
                    <ProtocolGlyphIcon kind={display.glyphKind} />
                  </span>
                  <div className="dashboard-protocol-text">
                    <span className="dashboard-protocol-title">{display.title}</span>
                    <span className="dashboard-protocol-sub">{display.line2}</span>
                  </div>
                </div>
                <Link href={PLAN_LINK} className="dashboard-protocol-dosing-link" onClick={(e) => e.stopPropagation()}>
                  Dosing
                </Link>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="dashboard-protocol-footer">
        <p className="dashboard-protocol-footer-hint">
          Full instructions and reorder links on{" "}
          <Link href={PLAN_LINK} className="dashboard-protocol-footer-hint-link">
            Plan
          </Link>
          .
          {pointsTotal != null && (
            <>
              {" "}
              <Link href={finishTodayHref} className="dashboard-protocol-footer-inline-link">
                Jump to protocol
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
