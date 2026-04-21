"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { getProtocolLogRow, getProtocolLogHistory, upsertProtocolMetrics } from "@/src/lib/bloodwiseDb"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { clampDailyMetrics } from "@/src/lib/dailyMetrics"
import {
  areCoreSignalsComplete,
  computeSignalsBlend,
  readinessFromSignalsOnly,
} from "@/src/lib/readinessComposite"
import { PerformanceSignalInputs } from "@/src/components/dailyTracking/PerformanceSignalInputs"
import { Scale } from "lucide-react"
import Link from "next/link"

const DEBOUNCE_MS = 650

type Props = {
  userId: string | null | undefined
  /** Scroll target for #daily-check-in links */
  anchorId?: string
  /** Section heading id for aria-labelledby (single visible heading, no duplicate titles). */
  headingId?: string
  /** Fires whenever metrics change (including initial load) — used to blend Home daily score. */
  onMetricsChange?: (m: DailyMetrics) => void
}

export function DailyHealthCheckIn({ userId, anchorId, headingId, onMetricsChange }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [metrics, setMetrics] = useState<DailyMetrics>({})
  const [weekSummary, setWeekSummary] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [completeBurst, setCompleteBurst] = useState(false)

  /** Never call `onMetricsChange` during a state updater — sync in an effect instead. */
  useEffect(() => {
    if (!userId || loading) return
    onMetricsChange?.(metrics)
  }, [metrics, loading, onMetricsChange, userId])

  const load = useCallback(() => {
    if (!userId) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => setLoading(true))
    Promise.all([getProtocolLogRow(userId, today), getProtocolLogHistory(userId, 14)])
      .then(([row, history]) => {
        setMetrics(row.metrics)
        const last7 = history.filter((h) => {
          const d = new Date(h.log_date).getTime()
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
          return d >= cutoff
        })
        const nums = (k: keyof DailyMetrics) =>
          last7.map((h) => h.metrics[k]).filter((v): v is number => typeof v === "number")
        const parts: string[] = []
        const act = nums("activity_level")
        if (act.length) parts.push(`activity avg ${(act.reduce((a, b) => a + b, 0) / act.length).toFixed(1)}/5`)
        const sun = nums("sun_minutes")
        if (sun.length) parts.push(`sun ~${Math.round(sun.reduce((a, b) => a + b, 0) / sun.length)} min/d`)
        const hyd = nums("hydration_cups")
        if (hyd.length) parts.push(`hydration ~${(hyd.reduce((a, b) => a + b, 0) / hyd.length).toFixed(1)} cups/d`)
        setWeekSummary(parts.length ? `Last 7 days: ${parts.join(" · ")}` : null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, today])

  useEffect(() => {
    load()
  }, [load])

  const scheduleSave = useCallback(
    (next: DailyMetrics) => {
      if (!userId) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const m = clampDailyMetrics(next)
        upsertProtocolMetrics(userId, today, m)
          .then(() => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          })
          .catch(() => {})
      }, DEBOUNCE_MS)
    },
    [userId, today]
  )

  const update = (partial: Partial<DailyMetrics>) => {
    setMetrics((prev) => {
      const merged = { ...prev, ...partial }
      scheduleSave(merged)
      return merged
    })
  }

  const coreComplete = areCoreSignalsComplete(metrics)
  const signalBonus = readinessFromSignalsOnly(computeSignalsBlend(metrics))
  const wasCompleteRef = useRef(false)

  useEffect(() => {
    if (coreComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true
      queueMicrotask(() => setCompleteBurst(true))
      const t = setTimeout(() => setCompleteBurst(false), 3200)
      return () => clearTimeout(t)
    }
    if (!coreComplete) wasCompleteRef.current = false
  }, [coreComplete])

  if (!userId) {
    return (
      <div id={anchorId} className="dashboard-tab-card dashboard-daily-metrics">
        <p className="dashboard-tab-muted">Sign in to log daily habits.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div id={anchorId} className="dashboard-tab-card dashboard-daily-metrics">
        <p className="dashboard-tab-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div
      id={anchorId}
      className={`dashboard-performance-signals dashboard-performance-signals--section dashboard-daily-metrics ${
        coreComplete ? "dashboard-performance-signals--complete" : ""
      }`}
    >
      <AnimatePresence>
        {completeBurst ? (
          <motion.div
            initial={{ opacity: 0.85, scale: 0.98 }}
            animate={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="dashboard-performance-signals-flash"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
      <div className="dashboard-performance-signals-inner relative z-[2]">
      <div className="dashboard-daily-metrics-head">
        <div className="dashboard-daily-metrics-head-row">
          <h3 id={headingId} className="dashboard-daily-metrics-title">
            Performance signals
          </h3>
          <div className="dashboard-daily-metrics-head-actions">
            <Link href="/dashboard/tracking#daily-check-in" className="dashboard-daily-metrics-tracking-link">
              Tracking page →
            </Link>
            {saved ? (
              <span className="dashboard-daily-metrics-saved" aria-live="polite">
                Saved
              </span>
            ) : null}
          </div>
        </div>
        <p className="dashboard-daily-metrics-sub">
          Log sleep, hydration, sun, and activity — they blend into your daily score with your protocol.
        </p>
      </div>

      <PerformanceSignalInputs metrics={metrics} onUpdate={update} />

      <label className="dashboard-daily-field dashboard-daily-field--weight mt-5">
        <span className="dashboard-daily-label">
          <Scale size={16} strokeWidth={2} aria-hidden /> Weight (optional, kg)
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={30}
          max={250}
          step={0.1}
          placeholder="—"
          value={metrics.weight_kg != null ? metrics.weight_kg : ""}
          onChange={(e) => {
            const raw = e.target.value.trim()
            if (raw === "") {
              update({ weight_kg: undefined })
              return
            }
            const v = Number(raw)
            if (!Number.isNaN(v)) update({ weight_kg: v })
          }}
          className="dashboard-daily-input"
        />
      </label>

      <label className="dashboard-daily-field dashboard-daily-notes mt-3">
        <span className="dashboard-daily-label">Notes</span>
        <textarea
          rows={2}
          maxLength={280}
          placeholder="Energy, stress, training load…"
          value={metrics.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          className="dashboard-daily-textarea"
        />
      </label>

      <AnimatePresence>
        {coreComplete ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="dashboard-performance-signals-complete"
          >
            <p className="dashboard-performance-signals-complete-title">
              <span className="dashboard-performance-signals-check" aria-hidden>
                ✓
              </span>{" "}
              Day logged
            </p>
            <motion.p
              className="dashboard-performance-signals-complete-bonus"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 400, damping: 22 }}
            >
              {signalBonus > 0
                ? `+${signalBonus} daily score from signals`
                : "Signals locked in — daily score blend is active."}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {weekSummary ? <p className="dashboard-daily-week">{weekSummary}</p> : null}

      <p className="dashboard-daily-disclaimer">
        Correlations with future labs are estimates — many things affect biomarkers. Use this to notice patterns, not to diagnose.
      </p>
      </div>

      <style jsx>{`
        .dashboard-daily-metrics-head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .dashboard-daily-metrics {
          position: relative;
        }
        .dashboard-daily-metrics-head {
          margin-bottom: var(--dashboard-block-gap, 18px);
        }
        .dashboard-daily-metrics-title {
          flex: 1;
          min-width: 0;
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 650;
          color: var(--color-text-primary);
        }
        .dashboard-daily-metrics-head-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .dashboard-daily-metrics-tracking-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
          white-space: nowrap;
        }
        .dashboard-daily-metrics-tracking-link:hover {
          text-decoration: underline;
        }
        .dashboard-daily-metrics-sub {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-muted);
          max-width: 52ch;
        }
        .dashboard-daily-metrics-saved {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
        }
        .dashboard-daily-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dashboard-daily-field--weight {
          max-width: 200px;
        }
        .dashboard-daily-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .dashboard-daily-input {
          max-width: 140px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 14px;
        }
        .dashboard-daily-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 14px;
          resize: vertical;
          min-height: 56px;
        }
        .dashboard-daily-week {
          margin: 14px 0 0;
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        .dashboard-daily-disclaimer {
          margin: 12px 0 0;
          font-size: 11px;
          line-height: 1.4;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}
