"use client"

import React from "react"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { HabitLabRow } from "@/src/lib/habitLabCorrelationSeries"

function TooltipBody({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value: number | null; color?: string; dataKey?: string; payload?: HabitLabRow }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="dashboard-chart-tooltip">
      {label && <div className="dashboard-chart-tooltip-label">{label}</div>}
      {row?.isoDate && <div className="dashboard-chart-tooltip-meta">{row.isoDate}</div>}
      {payload
        .filter((p) => p.value != null && typeof p.value === "number" && !Number.isNaN(p.value))
        .map((p) => (
          <div key={String(p.dataKey)} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}
          </div>
        ))}
    </div>
  )
}

export function HabitLabCorrelationChart({ data, summary }: { data: HabitLabRow[]; summary: string }) {
  if (data.length < 2) {
    return (
      <div className="dashboard-tab-card dashboard-habit-lab-chart dashboard-habit-lab-chart--empty">
        <p className="dashboard-tab-muted">
          Log your protocol and daily check-ins for a few days, and add at least two lab results to see habits
          alongside markers.
        </p>
      </div>
    )
  }

  const hasLabs = data.some((r) => r.vitaminDLab != null || r.ferritinLab != null)
  const hasAdherence = data.some((r) => r.adherence != null)

  return (
    <div
      className="dashboard-tab-card dashboard-habit-lab-chart"
      role="img"
      aria-label={summary}
    >
      <p className="dashboard-habit-lab-chart-summary">{summary}</p>
      <div className="dashboard-chart-wrapper" style={{ width: "100%", minWidth: 0, height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: hasLabs ? 12 : 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
            <XAxis dataKey="label" className="dashboard-chart-axis" fontSize={11} interval="preserveStartEnd" />
            <YAxis
              yAxisId="habit"
              className="dashboard-chart-axis"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              label={{ value: "Protocol", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--color-text-muted)" }}
            />
            {hasLabs ? (
              <YAxis
                yAxisId="lab"
                orientation="right"
                className="dashboard-chart-axis"
                fontSize={11}
                domain={["auto", "auto"]}
                label={{ value: "Labs", angle: 90, position: "insideRight", fontSize: 10, fill: "var(--color-text-muted)" }}
              />
            ) : null}
            <Tooltip content={<TooltipBody />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {hasAdherence ? (
              <Line
                yAxisId="habit"
                type="monotone"
                dataKey="adherence"
                name="Protocol done %"
                stroke="var(--color-accent, #22c55e)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            <Line
              yAxisId="habit"
              type="monotone"
              dataKey="activityScaled"
              name="Activity (1–5 → 0–100%)"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {hasLabs ? (
              <>
                <Line
                  yAxisId="lab"
                  type="monotone"
                  dataKey="vitaminDLab"
                  name="Vitamin D (lab)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="lab"
                  type="monotone"
                  dataKey="ferritinLab"
                  name="Ferritin (lab)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </>
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="dashboard-habit-lab-chart-footnote">
        Daily activity comes from your check-in. Lab points appear on the dates you saved results — compare the trend
        after you retest.
      </p>
    </div>
  )
}
