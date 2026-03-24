"use client"

import React, { useEffect, useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export type TrendPoint = { date: string; ferritin: number; vitaminD: number; magnesium: number; b12: number }

type SeriesKey = "ferritin" | "vitaminD" | "magnesium" | "b12"

const SERIES: Array<{ key: SeriesKey; dataKey: keyof TrendPoint; name: string }> = [
  { key: "ferritin", dataKey: "ferritin", name: "Ferritin" },
  { key: "vitaminD", dataKey: "vitaminD", name: "Vitamin D" },
  { key: "magnesium", dataKey: "magnesium", name: "Magnesium" },
  { key: "b12", dataKey: "b12", name: "B12" },
]

const FALLBACK_COLORS: Record<SeriesKey, string> = {
  ferritin: "#0d9488",
  vitaminD: "#d97706",
  magnesium: "#7c3aed",
  b12: "#2563eb",
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="dashboard-chart-tooltip">
      <div className="dashboard-chart-tooltip-label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  )
}

export function BiomarkerTrendChartView({
  data,
  summaryText,
  emptyHint,
}: {
  data: TrendPoint[]
  summaryText: string
  /** Shown when there are fewer than two data points (no illustrative chart). */
  emptyHint?: string
}) {
  const [colors, setColors] = useState(FALLBACK_COLORS)
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    ferritin: true,
    vitaminD: true,
    magnesium: true,
    b12: true,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const root = document.documentElement
    const cs = getComputedStyle(root)
    const next = { ...FALLBACK_COLORS }
    for (const k of Object.keys(FALLBACK_COLORS) as SeriesKey[]) {
      const v = cs.getPropertyValue(`--chart-${k}`).trim()
      if (v) next[k] = v
    }
    setColors(next)
  }, [])

  const activeSeries = useMemo(() => SERIES.filter((s) => visible[s.key]), [visible])

  const toggleSeries = (key: SeriesKey) => {
    setVisible((v) => ({ ...v, [key]: !v[key] }))
  }

  if (!data.length) {
    return (
      <div
        className="dashboard-chart-wrapper dashboard-chart-wrapper--empty"
        style={{ width: "100%", minWidth: 0, minHeight: 200 }}
        role="status"
      >
        <p className="dashboard-chart-empty-hint">
          {emptyHint ?? "Save at least two lab results to see trends over time."}
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-chart-with-controls">
      <div className="dashboard-chart-series-toggles" role="group" aria-label="Show or hide lines">
        {SERIES.map(({ key, name }) => (
          <button
            key={key}
            type="button"
            className={`dashboard-chart-toggle ${visible[key] ? "dashboard-chart-toggle--on" : ""}`}
            style={{ borderColor: colors[key], color: visible[key] ? colors[key] : undefined }}
            onClick={() => toggleSeries(key)}
          >
            <span className="dashboard-chart-toggle-dot" style={{ background: colors[key] }} aria-hidden />
            {name}
          </button>
        ))}
      </div>
      <div
        className="dashboard-chart-wrapper"
        style={{ width: "100%", minWidth: 0, height: 260, overflow: "hidden" }}
        role="img"
        aria-label={summaryText}
      >
        <p className="dashboard-chart-sr-only" aria-hidden>{summaryText}</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
            <XAxis dataKey="date" className="dashboard-chart-axis" fontSize={12} />
            <YAxis className="dashboard-chart-axis" fontSize={12} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            {activeSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={colors[s.key]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
