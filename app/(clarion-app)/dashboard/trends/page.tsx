"use client"

import React, { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getBloodworkHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getTrendInsights } from "@/src/lib/trendInsights"
import { TrendingUp } from "lucide-react"
import { getTrendData } from "@/src/lib/dashboardTrendData"
import { hasLabPersonalizationAccess } from "@/src/lib/accessGate"
import { LabUpgradeCallout } from "@/src/components/LabUpgradeCallout"
import "../dashboard.css"

const BiomarkerTrendChartLazy = dynamic(
  () => import("@/src/components/BiomarkerTrendChartView").then((m) => ({ default: m.BiomarkerTrendChartView })),
  { ssr: false, loading: () => <div className="dashboard-chart-loading">Loading chart…</div> }
)

export default function DashboardTrendsPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => setLoading(true))
    loadSavedState(user.id)
      .then(({ profile: p, bloodwork: b }) => {
        setProfile(p ?? null)
        setBloodwork(b ?? null)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    getBloodworkHistory(user.id, 10).then(setBloodworkHistory).catch(() => setBloodworkHistory([]))
  }, [user?.id])

  const profileForAnalysis = useMemo(
    () =>
      profile
        ? {
            age: profile.age,
            sex: profile.sex,
            sport: profile.sport,
            training_focus: profile.training_focus?.trim() || undefined,
          }
        : {},
    [profile]
  )
  const analysisResults = useMemo(
    () =>
      bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
        ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
        : [],
    [bloodwork, profileForAnalysis]
  )

  const trendData = useMemo(() => getTrendData(bloodworkHistory), [bloodworkHistory])
  const trendInsights = useMemo(
    () => (trendData.length >= 2 ? getTrendInsights(trendData, analysisResults) : []),
    [trendData, analysisResults]
  )
  const chartSummaryText = useMemo(
    () =>
      trendData.length >= 2
        ? "Biomarker trends over time."
        : "Save at least two lab results to see real trends (we don’t show illustrative curves).",
    [trendData.length]
  )

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading trends…</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  const noBloodwork = !bloodwork?.biomarker_inputs || Object.keys(bloodwork.biomarker_inputs).length === 0
  if (noBloodwork) {
    const awaitingUpload = hasLabPersonalizationAccess(profile, bloodwork)
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Trends</h1>
            <p className="dashboard-tab-subtitle">See how your labs change over time.</p>
          </header>
          <LabUpgradeCallout
            awaitingUpload={awaitingUpload}
            intro={
              awaitingUpload
                ? "Add bloodwork to unlock trend charts."
                : "Biomarker trends and change summaries unlock when you add bloodwork and the one-time analysis."
            }
          />
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Trends</h1>
          <p className="dashboard-tab-subtitle">Biomarker curves and change summaries from your saves.</p>
        </header>

        <section className="dashboard-section" aria-labelledby="dashboard-trends-page-heading">
          <h2 id="dashboard-trends-page-heading" className="dashboard-section-title">
            <TrendingUp className="dashboard-section-title-icon" size={18} aria-hidden /> See your trends
          </h2>
          {trendInsights.length > 0 && (
            <div className="dashboard-trend-summary">
              {trendInsights.map((t) => (
                <div key={t.key} className="dashboard-trend-summary-item">
                  <span className="dashboard-trend-label">{t.label}</span>
                  <span className="dashboard-trend-values">
                    {t.first} → {t.last}
                    {t.delta !== 0 && (
                      <span className={t.delta > 0 ? "dashboard-trend-delta-up" : "dashboard-trend-delta-down"}>
                        {" "}
                        ({t.delta > 0 ? "+" : ""}
                        {t.delta})
                      </span>
                    )}
                  </span>
                  {t.targetMin != null && t.targetMin > 0 && (
                    <div className="dashboard-trend-target-bar-wrap">
                      <div
                        className="dashboard-trend-target-bar"
                        style={{
                          width: `${Math.min(100, Math.max(0, (t.last / t.targetMin) * 100))}%`,
                        }}
                      />
                      <span className="dashboard-trend-target-label">
                        Target: {t.targetMin}
                        {t.targetMax != null ? `–${t.targetMax}` : "+"}
                      </span>
                    </div>
                  )}
                  {t.weeksToTarget != null && (
                    <p className="dashboard-trend-weeks">At current rate, may reach target in ~{t.weeksToTarget} weeks.</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="dashboard-card dashboard-chart-card">
            <BiomarkerTrendChartLazy
              data={trendData}
              summaryText={chartSummaryText}
              emptyHint="Add another bloodwork save to see how ferritin, vitamin D, magnesium, and B12 change over time."
            />
          </div>
        </section>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
          {" · "}
          <Link href="/dashboard/biomarkers">Biomarkers</Link>
        </p>
      </div>
    </main>
  )
}
