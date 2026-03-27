"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { getProtocolLogRow, getProtocolLogHistory, upsertProtocolMetrics } from "@/src/lib/bloodwiseDb"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { clampDailyMetrics } from "@/src/lib/dailyMetrics"
import { Activity, Droplets, Moon, Sun, Scale } from "lucide-react"

const DEBOUNCE_MS = 650

type Props = {
  userId: string | null | undefined
  /** Scroll target for #daily-check-in links */
  anchorId?: string
}

export function DailyHealthCheckIn({ userId, anchorId }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [metrics, setMetrics] = useState<DailyMetrics>({})
  const [weekSummary, setWeekSummary] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
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
        <p className="dashboard-tab-muted">Loading check-in…</p>
      </div>
    )
  }

  return (
    <div id={anchorId} className="dashboard-tab-card dashboard-daily-metrics">
      <div className="dashboard-daily-metrics-head">
        <h3 className="dashboard-daily-metrics-title">Daily check-in</h3>
        <p className="dashboard-daily-metrics-sub">
          Quick logs between labs — trends are for your insight only, not medical measurements.
        </p>
        {saved && (
          <span className="dashboard-daily-metrics-saved" aria-live="polite">
            Saved
          </span>
        )}
      </div>

      <div className="dashboard-daily-metrics-grid">
        <label className="dashboard-daily-field">
          <span className="dashboard-daily-label">
            <Activity size={16} strokeWidth={2} aria-hidden /> Activity
          </span>
          <div className="dashboard-daily-step-row" role="group" aria-label="Activity level 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`dashboard-daily-step ${metrics.activity_level === n ? "dashboard-daily-step--on" : ""}`}
                aria-pressed={metrics.activity_level === n}
                onClick={() => update({ activity_level: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <label className="dashboard-daily-field">
          <span className="dashboard-daily-label">
            <Sun size={16} strokeWidth={2} aria-hidden /> Sun (min)
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={metrics.sun_minutes ?? 0}
            onChange={(e) => update({ sun_minutes: Number(e.target.value) })}
            className="dashboard-daily-range"
          />
          <span className="dashboard-daily-value">{metrics.sun_minutes ?? 0} min</span>
        </label>

        <label className="dashboard-daily-field">
          <span className="dashboard-daily-label">
            <Droplets size={16} strokeWidth={2} aria-hidden /> Hydration (cups)
          </span>
          <input
            type="range"
            min={0}
            max={16}
            step={1}
            value={metrics.hydration_cups ?? 0}
            onChange={(e) => update({ hydration_cups: Number(e.target.value) })}
            className="dashboard-daily-range"
          />
          <span className="dashboard-daily-value">{metrics.hydration_cups ?? 0}</span>
        </label>

        <label className="dashboard-daily-field">
          <span className="dashboard-daily-label">
            <Moon size={16} strokeWidth={2} aria-hidden /> Sleep (hrs)
          </span>
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={metrics.sleep_hours ?? 0}
            onChange={(e) => update({ sleep_hours: Number(e.target.value) })}
            className="dashboard-daily-range"
          />
          <span className="dashboard-daily-value">{metrics.sleep_hours ?? 0} h</span>
        </label>

        <label className="dashboard-daily-field dashboard-daily-field--weight">
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
      </div>

      <label className="dashboard-daily-field dashboard-daily-notes">
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

      {weekSummary && <p className="dashboard-daily-week">{weekSummary}</p>}

      <p className="dashboard-daily-disclaimer">
        Correlations with future labs are estimates — many things affect biomarkers. Use this to notice patterns, not to diagnose.
      </p>

      <style jsx>{`
        .dashboard-daily-metrics {
          position: relative;
        }
        .dashboard-daily-metrics-head {
          margin-bottom: 16px;
        }
        .dashboard-daily-metrics-title {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .dashboard-daily-metrics-sub {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-text-muted);
        }
        .dashboard-daily-metrics-saved {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
        }
        .dashboard-daily-metrics-grid {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 560px) {
          .dashboard-daily-metrics-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .dashboard-daily-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dashboard-daily-field--weight {
          grid-column: 1 / -1;
        }
        .dashboard-daily-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .dashboard-daily-step-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dashboard-daily-step {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-secondary);
          font-weight: 600;
          cursor: pointer;
        }
        .dashboard-daily-step:hover {
          background: var(--color-surface-elevated);
        }
        .dashboard-daily-step--on {
          border-color: var(--color-accent);
          color: var(--color-text-primary);
          background: rgba(31, 111, 91, 0.12);
        }
        .dashboard-daily-range {
          width: 100%;
          accent-color: var(--color-accent);
        }
        .dashboard-daily-value {
          font-size: 13px;
          color: var(--color-text-muted);
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
        .dashboard-daily-notes {
          margin-top: 8px;
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
