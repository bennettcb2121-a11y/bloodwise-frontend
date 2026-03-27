"use client"

import React, { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getBloodworkHistory, getProtocolLogHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow } from "@/src/lib/bloodwiseDb"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { ProtocolTracker } from "@/src/components/ProtocolTracker"
import { DailyHealthCheckIn } from "@/src/components/DailyHealthCheckIn"
import { BetweenPanelsInsight } from "@/src/components/BetweenPanelsInsight"
import { buildHabitLabCorrelationSeries, extractStackNamesFromSnapshot } from "@/src/lib/habitLabCorrelationSeries"

const HabitLabCorrelationChartLazy = dynamic(
  () => import("@/src/components/HabitLabCorrelationChart").then((m) => ({ default: m.HabitLabCorrelationChart })),
  { ssr: false, loading: () => <div className="dashboard-tab-card dashboard-chart-loading">Loading chart…</div> }
)

export default function TrackingPage() {
  const { user } = useAuth()
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [protocolHistory, setProtocolHistory] = useState<
    { log_date: string; checks: Record<string, boolean>; metrics: DailyMetrics }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadSavedState(user.id)
      .then(({ profile: p, bloodwork: b }) => {
        setProfile(p ?? null)
        setBloodwork(b ?? null)
      })
      .catch(() => setBloodwork(null))
      .finally(() => setLoading(false))
    getBloodworkHistory(user.id, 15)
      .then(setBloodworkHistory)
      .catch(() => setBloodworkHistory([]))
    getProtocolLogHistory(user.id, 90)
      .then((rows) => setProtocolHistory(rows))
      .catch(() => setProtocolHistory([]))
  }, [user?.id])

  const habitLabSeries = useMemo(() => {
    const stack = extractStackNamesFromSnapshot(bloodwork?.stack_snapshot)
    return buildHabitLabCorrelationSeries(protocolHistory, stack, bloodworkHistory)
  }, [protocolHistory, bloodwork, bloodworkHistory])

  const habitLabSummary = useMemo(() => {
    const labs = bloodworkHistory.filter((r) => r.created_at).length
    return `Protocol logging, daily activity, and ${labs} lab snapshot${labs !== 1 ? "s" : ""} on a shared timeline.`
  }, [bloodworkHistory])

  if (loading) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading tracking…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Tracking</h1>
          <p className="dashboard-tab-subtitle">
            Log habits between labs — your protocol, daily check-ins, and score history.
          </p>
        </header>

        <section id="daily-check-in" className="dashboard-tab-section" aria-labelledby="tracking-daily-heading">
          <h2 id="tracking-daily-heading" className="dashboard-tab-section-title">
            Today&apos;s habits
          </h2>
          <DailyHealthCheckIn userId={user?.id} />
        </section>

        <section className="dashboard-tab-section" aria-labelledby="tracking-protocol-heading">
          <h2 id="tracking-protocol-heading" className="dashboard-tab-section-title">Today&apos;s plan</h2>
          <ProtocolTracker stackSnapshot={bloodwork?.stack_snapshot} userId={user?.id} />
        </section>

        {user?.id && bloodworkHistory.length >= 2 && (
          <BetweenPanelsInsight
            userId={user.id}
            bloodworkHistory={bloodworkHistory}
            profile={profile}
            sectionId="between-panels"
          />
        )}

        {user?.id && (protocolHistory.length >= 1 || bloodworkHistory.length >= 1) && (
          <section className="dashboard-tab-section" aria-labelledby="tracking-habit-lab-heading">
            <h2 id="tracking-habit-lab-heading" className="dashboard-tab-section-title">
              Habits vs labs
            </h2>
            <p className="dashboard-tab-subtitle dashboard-tab-subtitle--tight">
              See how daily protocol completion and activity line up with your lab values when you retest.
            </p>
            <HabitLabCorrelationChartLazy data={habitLabSeries} summary={habitLabSummary} />
          </section>
        )}

        {bloodworkHistory.length >= 2 && (
          <section className="dashboard-tab-section" aria-labelledby="tracking-journey-heading">
            <h2 id="tracking-journey-heading" className="dashboard-tab-section-title">Your journey</h2>
            <div className="dashboard-tab-card">
              <p className="dashboard-tab-journey-scores">
                {[...bloodworkHistory].reverse().map((row, i) => {
                  const d = row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"
                  const s = row.score != null ? row.score : "—"
                  return `${d}: ${s}`
                }).join(" · ")}
              </p>
              <Link href="/?step=labs" className="dashboard-tab-link">Add new results</Link>
            </div>
          </section>
        )}

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>
    </main>
  )
}
