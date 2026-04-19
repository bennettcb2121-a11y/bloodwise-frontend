"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { Circle, Sun, Droplets, Fish, Pill, Leaf } from "lucide-react"
import { getProtocolLog, getProtocolLogHistory, upsertProtocolLog } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { supplementProtocolDisplay } from "@/src/lib/supplementDisplay"
import type { SupplementGlyphKind } from "@/src/lib/supplementDisplay"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { SupplementTimingRow, groupRowsByTimingKind } from "@/src/components/SupplementTimingRow"
import { ProtocolDailySummary } from "@/src/components/dailyTracking/ProtocolDailySummary"
import { buildWeekStrip } from "@/src/lib/protocolWeekStrip"
import { computeCompositeReadiness, hasMeaningfulSignals } from "@/src/lib/readinessComposite"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { stackHasVitaminC as stackSnapshotHasVitaminC } from "@/src/lib/supplementAbsorptionPairings"
import { prepareProtocolRowsWithVitaminCNestingUnderIron } from "@/src/lib/protocolNestIronPairings"
import {
  stackItemStorageKey,
  acquisitionModeIsInStack,
  getEffectiveAcquisitionMode,
  type AcquisitionMode,
  type StackAcquisitionMap,
} from "@/src/lib/stackAcquisition"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { computeStackProductFit } from "@/src/lib/stackProductFit"
import { getStackItemBadgeKind } from "@/src/lib/stackLabSafety"
import { ProtocolLabFitPopover } from "@/src/components/ProtocolLabFitPopover"

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
  groupByTiming = false,
  dailyMetricsForScore,
  /** When true, user has lab data but no stack snapshot yet — show “finish plan” instead of “add bloodwork”. */
  hasLabsButEmptyStack = false,
  /** Dashboard Today tab: inline “what you take” instead of linking away to marketing home. */
  dashboardHome = false,
  onOpenWhatYouTake,
  /** Opens capture → guided “product link + lab fit” wizard (Today tab). */
  onOpenGuidedIntake,
  /** Latest analyzed biomarkers — drives per-row lab fit copy on cards. */
  analysisResults,
  acquisitionMap,
  onAcquisitionChange,
  renderStackRowActions,
  suppressPlanHead = false,
}: {
  stackSnapshot?: BloodworkSaveRow["stack_snapshot"]
  userId?: string | null
  onAllComplete?: () => void
  pointsAvailable?: number | null
  finishTodayHref?: string
  /** AM / PM / Anytime groups with timing badges and avoid notes (Today tab). */
  groupByTiming?: boolean
  /** Daily habit metrics — blended into daily score when meaningful (Home Today). */
  dailyMetricsForScore?: DailyMetrics
  hasLabsButEmptyStack?: boolean
  dashboardHome?: boolean
  onOpenWhatYouTake?: () => void
  onOpenGuidedIntake?: () => void
  analysisResults?: BiomarkerResult[]
  acquisitionMap?: StackAcquisitionMap
  onAcquisitionChange?: (storageKey: string, mode: AcquisitionMode) => void
  /** Per-row menu (e.g. edit / delete) on grouped protocol (Today tab). */
  renderStackRowActions?: (ctx: { row: SavedSupplementStackItem; storageKey: string }) => React.ReactNode
  /** Home v2: hide the "Your steps" kicker + paragraph + "Add or refine" button above the list. */
  suppressPlanHead?: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultNames = ["Iron protocol", "Vitamin D", "Magnesium", "Omega-3"]
  const stackRows: SavedSupplementStackItem[] =
    stackSnapshot && "stack" in stackSnapshot && Array.isArray(stackSnapshot.stack)
      ? (stackSnapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim())
      : []
  /** Saved snapshot exists (even if empty) → do not substitute generic placeholders. */
  const hasSavedStackShape = Boolean(
    stackSnapshot && "stack" in stackSnapshot && Array.isArray(stackSnapshot.stack)
  )
  const rows: SavedSupplementStackItem[] =
    stackRows.length > 0
      ? stackRows
      : hasSavedStackShape
        ? []
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
  /** Server-backed completion by date (merged with local `log` in `completionByDate`). */
  const [historyCompletion, setHistoryCompletion] = useState<Record<string, boolean>>({})
  const [celebrateItem, setCelebrateItem] = useState<string | null>(null)
  const celebrateClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const todayLog = log[today] ?? {}

  const vitCInStack = useMemo(() => stackSnapshotHasVitaminC(rows), [rows])
  const { displayRows, nestedVitaminC, firstIronStorageKey } = useMemo(
    () => prepareProtocolRowsWithVitaminCNestingUnderIron(rows),
    [rows]
  )

  useEffect(() => {
    return () => {
      if (celebrateClearRef.current) clearTimeout(celebrateClearRef.current)
    }
  }, [])

  const pointsTotal =
    typeof pointsAvailable === "number" && pointsAvailable > 0 ? Math.round(pointsAvailable) : null

  /** Once user marks ≥1 supplement as have/ordered/shipped, only those rows earn hero score points. */
  const acquiredCountForScore = useMemo(() => {
    if (!acquisitionMap || !userId) return 0
    const map = acquisitionMap
    return rows.filter((r) =>
      acquisitionModeIsInStack(getEffectiveAcquisitionMode(r, stackItemStorageKey(r), map))
    ).length
  }, [rows, acquisitionMap, userId])

  const pointsDenom = useMemo(() => {
    if (rows.length === 0) return 0
    if (!acquisitionMap || !userId) return rows.length
    if (acquiredCountForScore > 0) return acquiredCountForScore
    return rows.length
  }, [rows.length, acquisitionMap, userId, acquiredCountForScore])

  const pointsForRow = useCallback(
    (row: SavedSupplementStackItem): number | null => {
      if (pointsTotal == null || pointsDenom === 0) return null
      if (acquisitionMap && userId && acquiredCountForScore > 0) {
        const mode = getEffectiveAcquisitionMode(row, stackItemStorageKey(row), acquisitionMap)
        if (!acquisitionModeIsInStack(mode)) return null
      }
      return Math.max(1, Math.round(pointsTotal / pointsDenom))
    },
    [pointsTotal, pointsDenom, acquisitionMap, userId, acquiredCountForScore]
  )

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
    if (!userId) {
      setHistoryCompletion({})
      return
    }
    getProtocolLogHistory(userId, 14)
      .then((history) => {
        const byDate: Record<string, boolean> = {}
        history.forEach(({ log_date, checks }) => {
          byDate[log_date] = dayCompleted(checks)
        })
        setHistoryCompletion(byDate)
      })
      .catch(() => {})
  }, [userId, today])

  const completionByDate = useMemo(() => {
    const m: Record<string, boolean> = { ...historyCompletion }
    for (const [k, checks] of Object.entries(log)) {
      if (checks && typeof checks === "object") {
        m[k] = dayCompleted(checks as Record<string, boolean>)
      }
    }
    m[today] = dayCompleted(todayLog)
    return m
  }, [historyCompletion, log, today, todayLog])

  const streakDays = useMemo(() => {
    let streak = 0
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      if (completionByDate[dateStr]) streak++
      else break
    }
    return streak
  }, [completionByDate])

  const weekStrip = useMemo(() => buildWeekStrip(today, completionByDate), [today, completionByDate])

  const completed = items.filter((i) => todayLog[i]).length
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0
  const combinedDailyScore = useMemo(
    () => computeCompositeReadiness(pct, dailyMetricsForScore ?? {}).score,
    [pct, dailyMetricsForScore]
  )
  const blendsSignalsUi = hasMeaningfulSignals(dailyMetricsForScore ?? {})
  const [dailyScoreDelta, setDailyScoreDelta] = useState<number | null>(null)
  const prevDailyScoreRef = useRef<number | null>(null)
  useEffect(() => {
    if (prevDailyScoreRef.current === null) {
      prevDailyScoreRef.current = combinedDailyScore
      return
    }
    const d = combinedDailyScore - prevDailyScoreRef.current
    prevDailyScoreRef.current = combinedDailyScore
    if (d === 0) return
    setDailyScoreDelta(d)
    const t = setTimeout(() => setDailyScoreDelta(null), 1500)
    return () => clearTimeout(t)
  }, [combinedDailyScore])
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
      const wasDone = !!todayLog[item]
      const nextToday = { ...todayLog, [item]: !todayLog[item] }
      const nextCompleted = items.filter((i) => nextToday[i]).length
      const justCompletedAll = items.length > 0 && nextCompleted === items.length && completed < items.length
      const nextLog = { ...log, [today]: nextToday }
      persist(nextToday, nextLog)
      if (!wasDone && nextToday[item]) {
        setCelebrateItem(item)
        if (celebrateClearRef.current) clearTimeout(celebrateClearRef.current)
        celebrateClearRef.current = setTimeout(() => setCelebrateItem(null), 2600)
      }
      if (justCompletedAll) onAllComplete?.()
    },
    [todayLog, items, completed, log, today, persist, onAllComplete]
  )

  const renderNestedVitaminCRow = useCallback(
    (vitRow: SavedSupplementStackItem) => {
      const item = vitRow.supplementName
      const done = !!todayLog[item]
      const storageKey = stackItemStorageKey(vitRow)
      return (
        <SupplementTimingRow
          key={item}
          row={vitRow}
          done={done}
          onToggle={() => toggle(item)}
          stackHasVitaminC={vitCInStack}
          gamified
          celebrateItem={celebrateItem}
          pointsPerLog={pointsForRow(vitRow)}
          staggerIndex={0}
          actionsSlot={renderStackRowActions?.({ row: vitRow, storageKey })}
          analysisResults={analysisResults}
          acquisitionSlot={
            onAcquisitionChange && acquisitionMap && userId ? (
              <div className="dashboard-protocol-acq" role="group" aria-label="Supply status">
                {(
                  [
                    { mode: "have" as const, label: "Have it" },
                    { mode: "ordered" as const, label: "Ordered" },
                    { mode: "shipped" as const, label: "On the way" },
                  ] as const
                ).map(({ mode, label }) => {
                  const current = getEffectiveAcquisitionMode(vitRow, storageKey, acquisitionMap)
                  const active = current === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`dashboard-protocol-acq-btn${active ? " dashboard-protocol-acq-btn--on" : ""}`}
                      onClick={() => onAcquisitionChange(storageKey, mode)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ) : undefined
          }
        />
      )
    },
    [todayLog, toggle, vitCInStack, celebrateItem, pointsForRow, onAcquisitionChange, acquisitionMap, userId, renderStackRowActions, analysisResults]
  )

  if (!hasPersonalizedStack) {
    if (hasLabsButEmptyStack) {
      const showInlineCapture = Boolean(dashboardHome && onOpenWhatYouTake)
      return (
        <div className="dashboard-protocol-tracker dashboard-protocol-tracker--empty">
          <p className="dashboard-protocol-empty-title">Your protocol</p>
          <p className="dashboard-protocol-empty-desc">
            {showInlineCapture
              ? "No stack saved yet. Tell us what you’re already taking (photo or barcode), or open your full lab-based plan. Daily logging will show up here."
              : "Your labs are saved — finish the results flow on Home to build your stack, or open Plan to see recommendations. Daily logging will appear here."}
          </p>
          <div className="dashboard-protocol-empty-cta-row">
            {showInlineCapture ? (
              <button type="button" className="dashboard-protocol-empty-cta" onClick={onOpenWhatYouTake}>
                What are you taking?
              </button>
            ) : (
              <Link href="/" className="dashboard-protocol-empty-cta">
                Continue on Home
              </Link>
            )}
            <Link href="/dashboard/plan" className="dashboard-protocol-empty-cta dashboard-protocol-empty-cta--secondary">
              Open plan
            </Link>
          </div>
        </div>
      )
    }
    return (
      <div className="dashboard-protocol-tracker dashboard-protocol-tracker--empty">
        <p className="dashboard-protocol-empty-title">Personalized protocol</p>
        <p className="dashboard-protocol-empty-desc">
          Add bloodwork to generate a supplement plan aligned with your markers. Daily logging lives here.
        </p>
        <Link href="/?step=labs" className="dashboard-protocol-empty-cta">
          Add bloodwork
        </Link>
      </div>
    )
  }

  return (
    <div className={`dashboard-protocol-tracker ${groupByTiming ? "dashboard-protocol-tracker--gamified" : ""}`}>
      {celebrateItem ? (
        <p className="dashboard-protocol-celebrate" role="status" aria-live="polite">
          <span className="dashboard-protocol-celebrate-inner">Logged — one step steadier.</span>
        </p>
      ) : null}
      {suppressPlanHead ? null : (
        <div className="dashboard-protocol-plan-head">
          <div className="dashboard-protocol-plan-head-text">
            <p className="dashboard-protocol-plan-kicker">Your steps</p>
            {dashboardHome && analysisResults && analysisResults.length > 0 ? (
              <p className="dashboard-protocol-plan-microcopy">
                Each step ties what you take to your labs. Food, sleep, and training still move markers—this is education
                only, not medical advice.
              </p>
            ) : null}
            {dashboardHome && onOpenGuidedIntake ? (
              <button type="button" className="dashboard-protocol-guided-intake-btn" onClick={onOpenGuidedIntake}>
                Add or refine a product — link + lab check
              </button>
            ) : null}
          </div>
          {pointsTotal != null && !groupByTiming ? (
            <p className="dashboard-protocol-points-note" aria-live="polite">
              Score impact up to +{pointsTotal} when all steps are logged
            </p>
          ) : null}
        </div>
      )}

      {groupByTiming ? (
        <div className="dashboard-protocol-timing-groups" role="list">
          {(() => {
            const { morning, evening, anytime } = groupRowsByTimingKind(displayRows)
            const sections: { id: string; title: string; list: SavedSupplementStackItem[] }[] = [
              { id: "am", title: "Morning", list: morning },
              { id: "pm", title: "Evening", list: evening },
              { id: "any", title: "Anytime / with food", list: anytime },
            ]
            let stagger = 0
            return sections
              .filter((s) => s.list.length > 0)
              .map((section) => (
                <div key={section.id} className="dashboard-protocol-timing-group">
                  <p className="dashboard-protocol-timing-group-title">{section.title}</p>
                  <ul className="dashboard-protocol-list dashboard-protocol-list--timing" role="list">
                    {section.list.map((row) => {
                      const item = row.supplementName
                      const done = !!todayLog[item]
                      const si = stagger++
                      const storageKey = stackItemStorageKey(row)
                      const nestCHere = Boolean(
                        firstIronStorageKey && storageKey === firstIronStorageKey && nestedVitaminC.length > 0
                      )
                      return (
                        <SupplementTimingRow
                          key={`${storageKey}-${item}`}
                          row={row}
                          done={done}
                          onToggle={() => toggle(item)}
                          stackHasVitaminC={vitCInStack}
                          gamified
                          celebrateItem={celebrateItem}
                          pointsPerLog={pointsForRow(row)}
                          staggerIndex={si}
                          actionsSlot={renderStackRowActions?.({ row, storageKey })}
                          nestedVitaminCRows={nestCHere ? nestedVitaminC : undefined}
                          renderNestedProtocolRow={nestCHere ? renderNestedVitaminCRow : undefined}
                          analysisResults={analysisResults}
                          acquisitionSlot={
                            onAcquisitionChange && acquisitionMap && userId ? (
                              <div className="dashboard-protocol-acq" role="group" aria-label="Supply status">
                                {(
                                  [
                                    { mode: "have" as const, label: "Have it" },
                                    { mode: "ordered" as const, label: "Ordered" },
                                    { mode: "shipped" as const, label: "On the way" },
                                  ] as const
                                ).map(({ mode, label }) => {
                                  const current = getEffectiveAcquisitionMode(row, storageKey, acquisitionMap)
                                  const active = current === mode
                                  return (
                                    <button
                                      key={mode}
                                      type="button"
                                      className={`dashboard-protocol-acq-btn${active ? " dashboard-protocol-acq-btn--on" : ""}`}
                                      onClick={() => onAcquisitionChange(storageKey, mode)}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : undefined
                          }
                        />
                      )
                    })}
                  </ul>
                </div>
              ))
          })()}
        </div>
      ) : null}

      {!groupByTiming ? (
        <ul className="dashboard-protocol-list" role="list">
          {rows.map((row) => {
            const item = row.supplementName
            const done = !!todayLog[item]
            const display = supplementProtocolDisplay(row)
            const labFit =
              analysisResults && analysisResults.length > 0
                ? computeStackProductFit(row.supplementName, row.marker, analysisResults)
                : null
            const badgeKind =
              analysisResults && analysisResults.length > 0 ? getStackItemBadgeKind(row, analysisResults) : null
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
                      <span className="dashboard-protocol-title">
                        {display.title}
                        {badgeKind === "maintenance" ? (
                          <span className="dashboard-stack-lab-optional" title="Maintenance context — labs in range; optional for your training profile">
                            !
                          </span>
                        ) : badgeKind === "optional_lab" ? (
                          <span className="dashboard-stack-lab-optional" title="Labs look good — optional review">
                            !
                          </span>
                        ) : badgeKind === "user_product_review" ? (
                          <span
                            className="dashboard-stack-lab-optional"
                            title="Clarion’s lab fit check suggested reviewing this product — you chose to keep logging what you use; discuss with your clinician."
                          >
                            !
                          </span>
                        ) : null}
                      </span>
                      <span className="dashboard-protocol-sub">{display.line2}</span>
                      {labFit ? (
                        <div className="dashboard-protocol-lab-fit-row dashboard-protocol-lab-fit-row--plain" role="note">
                          <ProtocolLabFitPopover
                            chipLabel={labFit.chipLabel}
                            chipTone={labFit.chipTone}
                            rationale={labFit.rationale}
                            contextLabel={display.title}
                          />
                        </div>
                      ) : null}
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
      ) : null}

      {groupByTiming ? (
        <>
          <ProtocolDailySummary
            dailyScore={combinedDailyScore}
            completed={completed}
            total={items.length}
            streakDays={streakDays}
            weekStrip={weekStrip}
            pointsTotal={pointsTotal}
            deltaFlash={dailyScoreDelta}
            blendsSignals={blendsSignalsUi}
          />
          {allDone ? (
            <p className="dashboard-protocol-done-msg dashboard-protocol-done-msg--gamified">
              {streakDays > 0 ? `Logged ${streakDays} days in a row.` : "All steps logged for today."}
            </p>
          ) : null}
        </>
      ) : (
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
              {streakDays > 0 && (
                <span className="dashboard-protocol-pct-meta">
                  <span className="dashboard-protocol-streak">{streakDays}-day logging streak</span>
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
      )}

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
