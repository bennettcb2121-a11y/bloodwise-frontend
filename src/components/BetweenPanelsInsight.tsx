"use client"

import React, { useEffect, useMemo, useState } from "react"
import { getProtocolLogMetricsInRange } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow } from "@/src/lib/bloodwiseDb"
import {
  aggregateMetricsForWindow,
  buildBetweenPanelsNarrative,
  computeMarkerDeltas,
  getBetweenPanelsWindow,
  getImprovedMarkerNamesBetweenPanels,
} from "@/src/lib/betweenPanelsInsight"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type Props = {
  userId: string
  /** Newest panel first: [0]=latest, [1]=previous */
  bloodworkHistory: BloodworkSaveRow[]
  profile: ProfileRow | null
  /** For in-page anchor links (e.g. dashboard #between-panels) */
  sectionId?: string
}

function fmtNum(n: number): string {
  const a = Math.abs(n)
  if (a >= 100) return n.toFixed(0)
  if (a >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

export function BetweenPanelsInsight({ userId, bloodworkHistory, profile, sectionId }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [aggState, setAggState] = useState<ReturnType<typeof aggregateMetricsForWindow> | null>(null)

  const newer = bloodworkHistory[0]
  const older = bloodworkHistory[1]
  const window = useMemo(
    () => (older && newer ? getBetweenPanelsWindow(older, newer) : null),
    [older, newer]
  )

  const profileForAnalysis = useMemo(
    () =>
      profile
        ? { age: profile.age, sex: profile.sex, sport: profile.sport, diet_preference: profile.diet_preference }
        : {},
    [profile?.age, profile?.sex, profile?.sport, profile?.diet_preference]
  )

  const deltas = useMemo(() => {
    if (!older || !newer) return []
    return computeMarkerDeltas(
      older.biomarker_inputs ?? {},
      newer.biomarker_inputs ?? {},
      profileForAnalysis
    )
  }, [older, newer, profileForAnalysis])

  const improvedMarkers = useMemo(() => {
    if (!older || !newer) return []
    const o = analyzeBiomarkers(older.biomarker_inputs ?? {}, profileForAnalysis)
    const n = analyzeBiomarkers(newer.biomarker_inputs ?? {}, profileForAnalysis)
    return getImprovedMarkerNamesBetweenPanels(o, n)
  }, [older, newer, profileForAnalysis])

  const narrative = useMemo(() => {
    const agg = aggState ?? aggregateMetricsForWindow([])
    return buildBetweenPanelsNarrative({
      window,
      agg,
      scoreBefore: older?.score ?? null,
      scoreAfter: newer?.score ?? null,
      improvedMarkers,
    })
  }, [window, aggState, older?.score, newer?.score, improvedMarkers, older, newer])

  useEffect(() => {
    if (!window || !userId) {
      setLoading(false)
      setAggState(null)
      return
    }
    setLoading(true)
    setError(false)
    getProtocolLogMetricsInRange(userId, window.startDate, window.endDate)
      .then((rows) => {
        setAggState(aggregateMetricsForWindow(rows))
      })
      .catch(() => {
        setError(true)
        setAggState(aggregateMetricsForWindow([]))
      })
      .finally(() => setLoading(false))
  }, [userId, window?.startDate, window?.endDate])

  if (!older || !newer || !window) return null

  return (
    <section id={sectionId} className="between-panels" aria-labelledby="between-panels-heading">
      <h2 id="between-panels-heading" className="dashboard-tab-section-title">
        Between your last two panels
      </h2>
      <div className="dashboard-tab-card between-panels-card">
        <p className="between-panels-window">
          Logged habits: <strong>{window.startDate}</strong> → <strong>{window.endDate}</strong>
        </p>
        {loading && <p className="between-panels-muted">Loading habit averages…</p>}
        {error && !loading && (
          <p className="between-panels-muted">Couldn&apos;t load habit logs — biomarker changes still show below.</p>
        )}

        <p className="between-panels-narrative">{narrative}</p>

        {deltas.length > 0 && (
          <div className="between-panels-table-wrap">
            <table className="between-panels-table">
              <caption className="between-panels-caption">
                Largest value shifts (same marker name in both panels)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Marker</th>
                  <th scope="col">Previous</th>
                  <th scope="col">Latest</th>
                  <th scope="col">Change</th>
                </tr>
              </thead>
              <tbody>
                {deltas.map((row) => (
                  <tr key={row.marker}>
                    <td>{row.marker}</td>
                    <td>{fmtNum(row.valueBefore)}</td>
                    <td>{fmtNum(row.valueAfter)}</td>
                    <td>
                      <span className={`between-panels-delta ${row.delta > 0 ? "between-panels-delta--up" : row.delta < 0 ? "between-panels-delta--down" : ""}`}>
                        {row.delta > 0 ? <TrendingUp size={14} aria-hidden /> : row.delta < 0 ? <TrendingDown size={14} aria-hidden /> : <Minus size={14} aria-hidden />}
                        {row.delta > 0 ? "+" : ""}
                        {fmtNum(row.delta)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deltas.length === 0 && !loading && (
          <p className="between-panels-muted">No overlapping scored markers to compare, or values unchanged.</p>
        )}

        <p className="between-panels-disclaimer">
          Habits and lab results are shown together for your reflection only — not diagnosis or proof that one caused the other.
        </p>
      </div>

      <style jsx>{`
        .between-panels-window {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .between-panels-narrative {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.55;
          color: var(--color-text-primary);
        }
        .between-panels-muted {
          margin: 0 0 10px;
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .between-panels-table-wrap {
          overflow-x: auto;
          margin-bottom: 12px;
        }
        .between-panels-caption {
          caption-side: bottom;
          text-align: left;
          font-size: 11px;
          color: var(--color-text-muted);
          padding-top: 8px;
        }
        .between-panels-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .between-panels-table th,
        .between-panels-table td {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid var(--clarion-card-border);
        }
        .between-panels-table th {
          font-weight: 600;
          color: var(--color-text-muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .between-panels-delta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }
        .between-panels-delta--up {
          color: var(--color-accent, #1f6f5b);
        }
        .between-panels-delta--down {
          color: #b45309;
        }
        .between-panels-disclaimer {
          margin: 0;
          font-size: 11px;
          line-height: 1.45;
          color: var(--color-text-muted);
        }
      `}</style>
    </section>
  )
}
