"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers, type BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { getStatusTone } from "@/src/lib/priorityEngine"
import { getInterpretationForMarker } from "@/src/lib/biomarkerInterpretation"
import { getGuidesForBiomarker } from "@/src/lib/guides"
import { PAID_PROTOCOLS } from "@/src/lib/paidProtocols"
import { getScoreBreakdown, getCategoryForMarker, getOrderedScoreDrivers, penaltyForStatus, SCORE_CATEGORIES, type ScoreCategoryId } from "@/src/lib/scoreBreakdown"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getRangeSliderPosition } from "@/src/lib/rangeSlider"
import { getBiomarkerKeys } from "@/src/lib/panelEngine"
import { getActionPlanForBiomarker } from "@/src/lib/actionPlans"
import { getBiomarkerContext } from "@/src/lib/biomarkerContext"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import { getEvidenceForBiomarker } from "@/src/lib/biomarkerEvidence"
import { getEvidenceStrengthForBiomarker } from "@/src/lib/recommendationEvidence"
import { hasClarionAnalysisAccess, hasLabPersonalizationAccess } from "@/src/lib/accessGate"
import { LabUpgradeCallout } from "@/src/components/LabUpgradeCallout"
import { ChevronDown, Droplet, Leaf, Zap, Heart, Flame, TestTube2 } from "lucide-react"
import { BiomarkerAiOverviewModal } from "@/src/components/BiomarkerAiOverviewModal"
import { BiomarkerOverviewTeaser } from "@/src/components/BiomarkerOverviewTeaser"
import {
  buildBiomarkerSnapshotForAi,
  buildBiomarkerTeaserInsights,
  type BiomarkerOverviewPayload,
} from "@/src/lib/biomarkerAiContext"
import { getBiomarkerProfileNarrative } from "@/src/lib/biomarkerProfileNarrative"

export type SortOption = "priority" | "category" | "alphabetical"

function formatTargetRange(r: Pick<BiomarkerResult, "optimalMin" | "optimalMax">): string {
  const lo = r.optimalMin
  const hi = r.optimalMax
  if (lo != null && hi != null) return `${lo}–${hi}`
  return "—"
}

const CATEGORY_ICONS: Record<ScoreCategoryId, React.ComponentType<{ size?: number; className?: string }>> = {
  "Iron status": Droplet,
  "Vitamin status": Leaf,
  "Metabolic markers": Zap,
  "Lipids & cardiovascular": Heart,
  "Inflammation": Flame,
  "Electrolytes & minerals": TestTube2,
}

export default function BiomarkersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMarker, setExpandedMarker] = useState<string | null>(null)
  const [whyExpandedByMarker, setWhyExpandedByMarker] = useState<Record<string, boolean>>({})
  const [sortBy, setSortBy] = useState<SortOption>("priority")
  const [aiOverviewOpen, setAiOverviewOpen] = useState(false)
  const [aiOverviewStatus, setAiOverviewStatus] = useState<"loading" | "error" | "ready">("loading")
  const [aiOverviewPayload, setAiOverviewPayload] = useState<BiomarkerOverviewPayload | null>(null)
  const [aiOverviewError, setAiOverviewError] = useState<string | null>(null)
  const [aiOverviewRetryNonce, setAiOverviewRetryNonce] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => setLoading(true))
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        setProfile(p ?? null)
        setBloodwork(b ?? null)
        setSubscription(sub ?? null)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const hasAccess = hasClarionAnalysisAccess(profile, subscription, bloodwork)

  useEffect(() => {
    if (authLoading || !user) return
    if (profile === null && !loading) return
    if (!hasAccess && profile !== null) router.replace("/paywall")
  }, [authLoading, user, loading, profile, hasAccess, router])

  const profileForAnalysis = useMemo(
    () =>
      profile
        ? {
            age: profile.age,
            sex: profile.sex,
            sport: profile.sport,
            diet_preference: profile.diet_preference,
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

  const scoreBreakdown = useMemo(
    () => (analysisResults.length > 0 ? getScoreBreakdown(analysisResults) : null),
    [analysisResults]
  )
  const totalScore = bloodwork?.score ?? scoreBreakdown?.total ?? 0
  const optimalCount = analysisResults.filter((r: { status?: string }) => (r.status ?? "").toLowerCase() === "optimal").length
  const needsAttentionCount = analysisResults.length - optimalCount
  const teaserInsights = useMemo(() => buildBiomarkerTeaserInsights(analysisResults, 3), [analysisResults])

  const biomarkerSnapshotForAi = useMemo(
    () => buildBiomarkerSnapshotForAi(analysisResults, { healthScore: totalScore, profile }),
    [analysisResults, totalScore, profile]
  )

  useEffect(() => {
    if (analysisResults.length === 0) {
      queueMicrotask(() => {
        setAiOverviewPayload(null)
        setAiOverviewError(null)
      })
      return
    }
    const ac = new AbortController()
    queueMicrotask(() => {
      setAiOverviewStatus("loading")
      setAiOverviewError(null)
      setAiOverviewPayload(null)
    })
    ;(async () => {
      try {
        const res = await fetch("/api/biomarkers-overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ biomarkerSnapshot: biomarkerSnapshotForAi }),
          signal: ac.signal,
        })
        const data = (await res.json()) as BiomarkerOverviewPayload & { error?: string }
        if (!res.ok) {
          setAiOverviewStatus("error")
          setAiOverviewError(data?.error ?? "Could not generate overview.")
          return
        }
        if (data.error) {
          setAiOverviewStatus("error")
          setAiOverviewError(data.error)
          return
        }
        setAiOverviewPayload({
          headline: data.headline ?? "",
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          attention: Array.isArray(data.attention) ? data.attention : [],
          fullOverview: data.fullOverview ?? "",
          reassurance: typeof data.reassurance === "string" ? data.reassurance : "",
        })
        setAiOverviewStatus("ready")
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setAiOverviewStatus("error")
        setAiOverviewError("Unable to reach the server.")
      }
    })()
    return () => ac.abort()
  }, [biomarkerSnapshotForAi, analysisResults.length, aiOverviewRetryNonce])

  const allMarkerKeys = useMemo(() => getBiomarkerKeys(), [])

  /** Match analysis result by display key (e.g. "Vitamin D" matches result.name "25-OH Vitamin D"). */
  const findResultForMarker = useCallback(
    (markerName: string) =>
      analysisResults.find(
        (r: { name?: string }) =>
          r.name === markerName || (markerName === "Vitamin D" && r.name === "25-OH Vitamin D")
      ),
    [analysisResults]
  )

  type DisplayItem = { markerName: string; result?: BiomarkerResult }
  const fullDisplayItems = useMemo<DisplayItem[]>(() => {
    return allMarkerKeys.map((markerName) => ({
      markerName,
      result: findResultForMarker(markerName) ?? undefined,
    }))
  }, [allMarkerKeys, findResultForMarker])

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile), [profile])

  const orderedByPriority = useMemo(() => {
    const drivers = getOrderedScoreDrivers(analysisResults, analysisResults.length, priorityContext)
    const driverNames = new Set(drivers.map((d) => d.markerName))
    const rest = analysisResults.filter((r: { name?: string }) => !driverNames.has(r.name ?? ""))
    const fromDrivers = drivers.map((d) => analysisResults.find((r: { name?: string }) => r.name === d.markerName)).filter((r): r is (typeof analysisResults)[number] => r != null)
    return [...fromDrivers, ...rest]
  }, [analysisResults, priorityContext])

  /** Full list grouped by category: each item is DisplayItem. Categories include all markers. */
  const groupedByCategoryFull = useMemo(() => {
    const byCat: Partial<Record<ScoreCategoryId, DisplayItem[]>> = {}
    for (const item of fullDisplayItems) {
      const cat = getCategoryForMarker(item.markerName)
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat]!.push(item)
    }
    return SCORE_CATEGORIES.map((cat) => ({ category: cat, items: byCat[cat] ?? [] })).filter((g) => g.items.length > 0)
  }, [fullDisplayItems])

  /** Priority order over full list: with-result (by priority) first, then no-result alphabetically. */
  const sortedFullByPriority = useMemo(() => {
    const withResultItems: DisplayItem[] = orderedByPriority.map((r: BiomarkerResult) => {
      const name = r.name ?? ""
      const markerName = name === "25-OH Vitamin D" ? "Vitamin D" : name
      return { markerName, result: r }
    })
    const noResult = fullDisplayItems.filter((item) => !item.result).sort((a, b) => a.markerName.localeCompare(b.markerName))
    return [...withResultItems, ...noResult]
  }, [fullDisplayItems, orderedByPriority])

  const sortedForDisplay = useMemo(() => {
    if (sortBy === "alphabetical") {
      return [...fullDisplayItems].sort((a, b) => a.markerName.localeCompare(b.markerName))
    }
    if (sortBy === "priority") return sortedFullByPriority
    return fullDisplayItems
  }, [sortBy, fullDisplayItems, sortedFullByPriority])

  const sectionsToRender = useMemo(() => {
    if (sortBy !== "category") return [{ category: null as ScoreCategoryId | null, items: sortedForDisplay }]
    return groupedByCategoryFull.map((g) => ({ category: g.category, items: g.items }))
  }, [sortBy, sortedForDisplay, groupedByCategoryFull])

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading…</p>
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
            <h1 className="dashboard-tab-title">Biomarkers</h1>
            <p className="dashboard-tab-subtitle">Your results at a glance.</p>
          </header>
          <LabUpgradeCallout
            awaitingUpload={awaitingUpload}
            intro={
              awaitingUpload
                ? "Add your bloodwork to see your biomarker cards and simple explanations for each result."
                : "Panel score, biomarker cards, and lab-matched supplement context unlock when you add bloodwork and the one-time analysis."
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
    <main className="dashboard-tab-shell dashboard-biomarkers-page">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header dashboard-biomarkers-header">
          <h1 className="dashboard-tab-title dashboard-biomarkers-title">Biomarkers</h1>
          <p className="dashboard-tab-subtitle dashboard-biomarkers-subtitle">Your health diagnostics at a glance.</p>
        </header>

        <div className="dashboard-biomarkers-hero">
          <div className="dashboard-biomarkers-hero-plate">
            <div className="dashboard-biomarkers-hero-row">
              <span className="dashboard-biomarkers-hero-score" aria-live="polite">
                {totalScore}
              </span>
              <span className="dashboard-biomarkers-hero-label">Health score</span>
            </div>
            <span className="dashboard-biomarkers-hero-meta">
              {optimalCount} optimal • {needsAttentionCount} to review
            </span>
          </div>
        </div>

        {analysisResults.length > 0 && (
          <BiomarkerOverviewTeaser
            status={aiOverviewStatus}
            payload={aiOverviewPayload}
            errorMessage={aiOverviewError}
            onRetry={() => {
              setAiOverviewRetryNonce((n) => n + 1)
            }}
            onFullReview={() => setAiOverviewOpen(true)}
            needsAttentionCount={needsAttentionCount}
            teaserInsights={teaserInsights}
          />
        )}

        <BiomarkerAiOverviewModal
          open={aiOverviewOpen}
          onClose={() => setAiOverviewOpen(false)}
          analysisResults={analysisResults}
          profile={profile}
          healthScore={totalScore}
          prefilledOverview={aiOverviewPayload?.fullOverview ?? null}
        />

        <section className="dashboard-biomarkers-list" aria-labelledby="biomarkers-heading">
          <div className="dashboard-biomarkers-list-head">
            <h2 id="biomarkers-heading" className="dashboard-biomarkers-list-title">
              Your results
            </h2>
            <div className="dashboard-biomarkers-sort" role="group" aria-label="Sort biomarkers">
              <span className="dashboard-biomarkers-sort-label">Sort</span>
              {(["priority", "category", "alphabetical"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`dashboard-biomarkers-sort-btn ${sortBy === opt ? "dashboard-biomarkers-sort-btn--active" : ""}`}
                  onClick={() => setSortBy(opt)}
                >
                  {opt === "priority" ? "Priority" : opt === "category" ? "Category" : "A–Z"}
                </button>
              ))}
            </div>
          </div>
          {sectionsToRender.map((section, sectionIdx) => (
            <div key={section.category ?? `all-${sectionIdx}`} className="dashboard-biomarkers-section">
              {section.category && (
                <h3 className="dashboard-biomarkers-section-title">
                  {CATEGORY_ICONS[section.category] && (
                    <span className="dashboard-biomarkers-section-icon" aria-hidden>
                      {React.createElement(CATEGORY_ICONS[section.category], { size: 18 })}
                    </span>
                  )}
                  {section.category}
                </h3>
              )}
              {section.items.map((displayItem: DisplayItem, idx: number) => {
                const markerName = displayItem.markerName
                const item = displayItem.result
                const hasValue = Boolean(item)

                if (!markerName) return null

                if (!hasValue) {
                  const dbEntry = biomarkerDatabase[markerName]
                  return (
                    <article
                      key={`${markerName}-${sectionIdx}-${idx}`}
                      className="dashboard-biomarker-card dashboard-biomarker-card--tone-neutral"
                    >
                      <div className="dashboard-biomarker-card-visible">
                        <div className="dashboard-biomarker-card-top">
                          <span className="dashboard-biomarker-card-name">{markerName}</span>
                          <span className="dashboard-biomarker-card-badge dashboard-biomarker-card-badge--tone-neutral">
                            No value
                          </span>
                        </div>
                        <p className="dashboard-biomarker-value-large dashboard-biomarker-value-large--muted">
                          — Not entered
                        </p>
                        {dbEntry?.description && (
                          <p className="dashboard-biomarker-insight dashboard-biomarker-insight--muted">
                            {dbEntry.description}
                          </p>
                        )}
                        <Link href="/?step=labs" className="dashboard-biomarker-cta">
                          Add your result
                        </Link>
                      </div>
                    </article>
                  )
                }

                const tone = getStatusTone(item!.status)
                const interpretation = getInterpretationForMarker(markerName, item!.status ?? "", profile)
                const isExpanded = expandedMarker === markerName
                const guide = getGuidesForBiomarker(markerName === "25-OH Vitamin D" ? "Vitamin D" : markerName)[0]
                const paidProtocol = PAID_PROTOCOLS.find(
                  (p) => p.biomarkerKey && markerName.toLowerCase().includes(p.biomarkerKey.toLowerCase())
                )
                const statusLower = (item!.status ?? "").toLowerCase()
                const isUnknownStatus = statusLower === "unknown"
                const impact = penaltyForStatus(item!.status ?? "")
                const slider = getRangeSliderPosition(
                  markerName,
                  Number(item!.value) || 0,
                  item!.optimalMin,
                  item!.optimalMax
                )
                const dbEntry = biomarkerDatabase[markerName === "25-OH Vitamin D" ? "Vitamin D" : markerName]
                const causesLow = getBiomarkerContext(markerName, "low", profile)
                const causesHigh = getBiomarkerContext(markerName, "high", profile)
                const direction = (item!.status ?? "").toLowerCase() === "high" ? "high" : "low"
                const causes = direction === "high" ? causesHigh : causesLow
                const actionPlan = getActionPlanForBiomarker(markerName, analysisResults)
                const evidenceStrength = getEvidenceStrengthForBiomarker(markerName)
                const evidenceLinks = getEvidenceForBiomarker(markerName)
                const foodsText = (item?.foods ?? dbEntry?.foods)?.trim()
                const lifestyleText = (item?.lifestyle ?? dbEntry?.lifestyle)?.trim()
                const supplementNotesText = (item?.supplementNotes ?? dbEntry?.supplementNotes)?.trim()
                const profileNarrative = getBiomarkerProfileNarrative(item!.name, item!, profile)
                const whyOpen = Boolean(whyExpandedByMarker[markerName])
                const whyPanelId = `biomarker-why-${markerName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "marker"}`

                return (
                  <article
                    key={`${markerName}-${sectionIdx}-${idx}`}
                    className={`dashboard-biomarker-card dashboard-biomarker-card--${tone.className} dashboard-biomarker-card--report`}
                  >
                    <div className="dashboard-biomarker-card-visible">
                      <div className="dashboard-biomarker-report-header">
                        <h3 className="dashboard-biomarker-card-name">{markerName}</h3>
                        <table className="dashboard-biomarker-lab" aria-label={`${markerName} result summary`}>
                          <tbody>
                            <tr>
                              <th scope="row">Your value</th>
                              <td>
                                <span className="dashboard-biomarker-lab-value">
                                  {isUnknownStatus ? "—" : (item!.value ?? "—")}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Clarion target</th>
                              <td>
                                <span className="dashboard-biomarker-lab-value">
                                  {isUnknownStatus ? "—" : formatTargetRange(item!)}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Status</th>
                              <td>
                                <span className={`dashboard-biomarker-card-badge dashboard-biomarker-card-badge--${tone.className}`}>
                                  {tone.label}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {isUnknownStatus ? (
                        <p className="dashboard-biomarker-insight dashboard-biomarker-insight--muted">
                          Range bar hidden—Clarion doesn’t have reference ranges for this label yet.
                        </p>
                      ) : (
                        <div
                          className="dashboard-biomarker-slider-wrap"
                          role="img"
                          aria-label="Lab value on scale from lower to higher (center band is Clarion target)"
                        >
                          <span className="dashboard-biomarker-slider-label">Lower</span>
                          <div className="dashboard-biomarker-slider-bar">
                            <div className="dashboard-biomarker-slider-seg dashboard-biomarker-slider-seg--low" />
                            <div className="dashboard-biomarker-slider-seg dashboard-biomarker-slider-seg--mid" />
                            <div className="dashboard-biomarker-slider-seg dashboard-biomarker-slider-seg--high" />
                            <span
                              className="dashboard-biomarker-slider-dot"
                              style={{ left: `${slider.dotPositionPercent}%` }}
                              aria-hidden
                            />
                          </div>
                          <span className="dashboard-biomarker-slider-label">Higher</span>
                        </div>
                      )}
                      {impact > 0 && (
                        <p className="dashboard-biomarker-impact">Impact on Health Score: −{impact} points</p>
                      )}
                      <p className="dashboard-biomarker-insight">{interpretation.headline}</p>
                      <Link href="/dashboard/actions" className="dashboard-biomarker-cta">
                        View Recommendations
                      </Link>
                      <button
                        type="button"
                        className="dashboard-biomarker-expand-btn"
                        onClick={() => setExpandedMarker(isExpanded ? null : markerName)}
                        aria-expanded={isExpanded}
                        aria-controls={`biomarker-details-${sectionIdx}-${idx}`}
                        id={`biomarker-btn-${sectionIdx}-${idx}`}
                      >
                        {isExpanded ? "Less" : "Why it matters, causes, nutrition & habits"}
                        <ChevronDown size={18} className={`dashboard-biomarker-card-chevron ${isExpanded ? "dashboard-biomarker-card-chevron--open" : ""}`} aria-hidden />
                      </button>
                    </div>
                    <div
                      id={`biomarker-details-${sectionIdx}-${idx}`}
                      role="region"
                      aria-labelledby={`biomarker-btn-${sectionIdx}-${idx}`}
                      className={`dashboard-biomarker-card-back ${isExpanded ? "dashboard-biomarker-card-back--open" : ""}`}
                    >
                      <div className="dashboard-biomarker-expand-block dashboard-biomarker-expand-block--report">
                        <div className="dashboard-biomarker-report-section">
                          <h4 className="dashboard-biomarker-report-heading">What it is</h4>
                          <p className="dashboard-biomarker-report-text">{profileNarrative.whatItIs}</p>
                        </div>
                        <div className="dashboard-biomarker-why">
                          <button
                            type="button"
                            className="dashboard-biomarker-why-toggle"
                            id={`${whyPanelId}-btn`}
                            aria-expanded={whyOpen}
                            aria-controls={whyPanelId}
                            onClick={() =>
                              setWhyExpandedByMarker((prev) => ({ ...prev, [markerName]: !prev[markerName] }))
                            }
                          >
                            <span className="dashboard-biomarker-why-toggle-label">Why it matters for you</span>
                            <ChevronDown
                              size={18}
                              className={`dashboard-biomarker-why-chevron ${whyOpen ? "dashboard-biomarker-why-chevron--open" : ""}`}
                              aria-hidden
                            />
                          </button>
                          <div
                            id={whyPanelId}
                            role="region"
                            aria-labelledby={`${whyPanelId}-btn`}
                            aria-hidden={!whyOpen}
                            className={`dashboard-biomarker-why-panel ${whyOpen ? "dashboard-biomarker-why-panel--open" : ""}`}
                          >
                            <p className="dashboard-biomarker-report-text dashboard-biomarker-why-copy">
                              {profileNarrative.whyForYou}
                            </p>
                          </div>
                        </div>
                        <div className="dashboard-biomarker-report-section">
                          <h4 className="dashboard-biomarker-report-heading">Fit for your goals &amp; training</h4>
                          <p className="dashboard-biomarker-report-text">{profileNarrative.fitForGoals}</p>
                        </div>
                      </div>
                      {dbEntry?.whyItMatters && (
                        <div className="dashboard-biomarker-expand-block">
                          <h4 className="dashboard-biomarker-expand-title">Why it matters</h4>
                          <p className="dashboard-biomarker-expand-text">{dbEntry.whyItMatters}</p>
                        </div>
                      )}
                      {causes.length > 0 && (
                        <div className="dashboard-biomarker-expand-block">
                          <h4 className="dashboard-biomarker-expand-title">Common causes of {direction} {markerName}</h4>
                          <ul className="dashboard-biomarker-expand-list">
                            {causes.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {foodsText ? (
                        <div className="dashboard-biomarker-expand-block">
                          <h4 className="dashboard-biomarker-expand-title">Food &amp; nutrition</h4>
                          <p className="dashboard-biomarker-expand-text">{foodsText}</p>
                        </div>
                      ) : null}
                      {lifestyleText ? (
                        <div className="dashboard-biomarker-expand-block">
                          <h4 className="dashboard-biomarker-expand-title">Lifestyle &amp; habits</h4>
                          <p className="dashboard-biomarker-expand-text">{lifestyleText}</p>
                        </div>
                      ) : null}
                      {supplementNotesText ? (
                        <div className="dashboard-biomarker-expand-block">
                          <h4 className="dashboard-biomarker-expand-title">Supplement context</h4>
                          <p className="dashboard-biomarker-expand-text">{supplementNotesText}</p>
                        </div>
                      ) : null}
                      <div className="dashboard-biomarker-expand-block">
                        <h4 className="dashboard-biomarker-expand-title">Recommended actions</h4>
                        {actionPlan?.dailyActions?.length ? (
                          <ul className="dashboard-biomarker-expand-list">
                            {actionPlan.dailyActions.slice(0, 3).map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                            {actionPlan.retestWindow && <li>Retest: {actionPlan.retestWindow}</li>}
                          </ul>
                        ) : (
                          <p className="dashboard-biomarker-expand-text">{interpretation.nextStepCopy}</p>
                        )}
                      </div>
                      {(evidenceStrength || evidenceLinks.length > 0) && (
                        <div className="dashboard-biomarker-expand-block dashboard-biomarker-expand-block--evidence">
                          <h4 className="dashboard-biomarker-expand-title">Evidence &amp; sources</h4>
                          {evidenceStrength && (
                            <p className="dashboard-biomarker-evidence-strength">
                              <strong>Recommendation strength:</strong> {evidenceStrength.label}
                            </p>
                          )}
                          {evidenceLinks.length > 0 && (
                            <>
                              <p className="dashboard-biomarker-evidence-lede">
                                Education only—verify with your clinician. Official references and peer-reviewed links:
                              </p>
                              <ul className="dashboard-biomarker-evidence-list">
                                {evidenceLinks.map((e, i) => (
                                  <li key={`${e.url}-${i}`}>
                                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="dashboard-biomarker-evidence-link">
                                      {e.title}
                                    </a>
                                    <span className="dashboard-biomarker-evidence-source"> — {e.source}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                      {(guide || paidProtocol) && (
                        <div className="dashboard-biomarker-links">
                          {paidProtocol && (
                            <Link href={`/protocols/${paidProtocol.slug}`} className="dashboard-biomarker-link">
                              View {paidProtocol.title}
                            </Link>
                          )}
                          {guide && (
                            <Link href={`/guides/${guide.slug}`} className="dashboard-biomarker-link">
                              Read guide
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
        </section>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>

      <style jsx>{`
        .dashboard-biomarkers-page :global(.dashboard-tab-container) {
          padding-top: 20px;
          padding-bottom: 24px;
        }
        .dashboard-biomarkers-empty {
          padding: 24px;
          text-align: center;
        }
        .dashboard-biomarkers-empty-text {
          margin: 0 0 16px;
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .dashboard-actions-cta {
          display: inline-block;
          padding: 12px 24px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          font-weight: 600;
          text-decoration: none;
          border-radius: 10px;
        }
        .dashboard-actions-cta:hover {
          opacity: 0.95;
        }
        .dashboard-biomarkers-header {
          margin-bottom: 20px;
        }
        .dashboard-biomarkers-title {
          font-family: var(--font-heading), Georgia, "Times New Roman", serif;
          font-weight: 600;
          letter-spacing: -0.03em;
        }
        .dashboard-biomarkers-subtitle {
          margin-top: 4px;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--color-text-muted);
          line-height: 1.45;
        }
        .dashboard-biomarkers-hero {
          margin-bottom: 16px;
          padding: 0;
        }
        .dashboard-biomarkers-hero-plate {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
          padding: 14px 18px 12px;
          border-radius: 18px;
          color: var(--color-text-primary);
          background:
            radial-gradient(
              ellipse 95% 85% at 14% 42%,
              color-mix(in srgb, var(--env-accent, var(--color-accent)) 26%, transparent) 0%,
              transparent 62%
            ),
            linear-gradient(
              168deg,
              color-mix(in srgb, var(--env-accent, var(--color-accent)) 12%, var(--color-bg)) 0%,
              color-mix(in srgb, var(--env-accent, var(--color-accent)) 5%, var(--color-bg)) 100%
            );
          border: 1px solid color-mix(in srgb, var(--env-accent, var(--color-accent)) 18%, var(--color-border));
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 10%, transparent),
            inset 0 -1px 0 color-mix(in srgb, var(--color-text-primary) 5%, transparent),
            var(--shadow-sm);
        }
        .dashboard-biomarkers-hero-row {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 12px 16px;
        }
        .dashboard-biomarkers-hero-score {
          font-family: var(--font-heading), Georgia, "Times New Roman", serif;
          font-size: clamp(3.25rem, 11vw, 5rem);
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-primary);
        }
        .dashboard-biomarkers-hero-label {
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .dashboard-biomarkers-hero-meta {
          margin-top: 6px;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-muted);
          letter-spacing: 0.01em;
        }
        .dashboard-biomarkers-list-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px 16px;
          margin-bottom: 12px;
        }
        .dashboard-biomarkers-sort {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0;
          padding: 0;
        }
        .dashboard-biomarkers-sort-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-muted);
          margin-right: 2px;
        }
        .dashboard-biomarkers-sort-btn {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .dashboard-biomarkers-sort-btn:hover {
          background: var(--color-surface-hover, rgba(255,255,255,0.06));
          color: var(--color-text-primary);
        }
        .dashboard-biomarkers-sort-btn--active {
          background: var(--env-accent-soft, var(--color-accent-soft));
          color: var(--env-accent, var(--color-accent));
          border-color: var(--env-accent, var(--color-accent));
        }
        .dashboard-biomarkers-list-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
          margin: 0;
        }
        .dashboard-biomarkers-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dashboard-biomarkers-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dashboard-biomarkers-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 4px;
        }
        .dashboard-biomarkers-section-icon {
          display: inline-flex;
          color: var(--env-accent, var(--color-accent));
        }
        .dashboard-biomarker-card {
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: 14px;
          overflow: hidden;
          border-left: 4px solid var(--color-border);
          padding: 18px 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .dashboard-biomarker-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-biomarker-card:hover {
            transform: none;
          }
        }
        .dashboard-biomarker-card--tone-green {
          border-left-color: var(--color-success, #22c55e);
        }
        .dashboard-biomarker-card--tone-amber {
          border-left-color: var(--color-warning);
        }
        .dashboard-biomarker-card--tone-red {
          border-left-color: var(--color-error, #c53030);
        }
        .dashboard-biomarker-card--tone-neutral {
          border-left-color: var(--color-border);
        }
        .dashboard-biomarker-card-visible {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dashboard-biomarker-card--report {
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
        }
        .dashboard-biomarker-report-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dashboard-biomarker-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .dashboard-biomarker-card-name {
          margin: 0;
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.25;
          color: var(--color-text-primary);
        }
        .dashboard-biomarker-lab {
          width: 100%;
          table-layout: fixed;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--color-border-strong);
          background: var(--color-bg);
        }
        .dashboard-biomarker-lab tbody tr:not(:last-child) th,
        .dashboard-biomarker-lab tbody tr:not(:last-child) td {
          border-bottom: 1px solid var(--color-border);
        }
        .dashboard-biomarker-lab th {
          text-align: left;
          font-weight: 600;
          font-size: 10px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          padding: 11px 12px 11px 14px;
          width: 46%;
          vertical-align: middle;
          background: color-mix(in srgb, var(--color-text-primary) 2.5%, transparent);
        }
        .dashboard-biomarker-lab td {
          text-align: right;
          padding: 11px 14px 11px 12px;
          vertical-align: middle;
          font-variant-numeric: tabular-nums;
          background: var(--color-bg);
        }
        .dashboard-biomarker-lab tbody tr:nth-child(even) td {
          background: color-mix(in srgb, var(--color-text-primary) 2%, transparent);
        }
        .dashboard-biomarker-lab-value {
          display: inline-block;
          font-size: 15px;
          font-weight: 600;
          font-feature-settings: "tnum" 1;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-primary);
          line-height: 1.35;
        }
        .dashboard-biomarker-card-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .dashboard-biomarker-card-badge--tone-green {
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }
        .dashboard-biomarker-card-badge--tone-amber {
          background: var(--color-warning-soft, rgba(245, 158, 11, 0.15));
          color: var(--color-warning);
        }
        .dashboard-biomarker-card-badge--tone-red {
          background: var(--color-error-soft, rgba(197, 48, 48, 0.12));
          color: var(--color-error, #c53030);
        }
        .dashboard-biomarker-card-badge--tone-neutral {
          background: var(--color-surface);
          color: var(--color-text-muted);
        }
        .dashboard-biomarker-value-large {
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: clamp(1.35rem, 4vw, 1.6rem);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .dashboard-biomarker-value-large--muted {
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
        .dashboard-biomarker-insight--muted {
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .dashboard-biomarker-target {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .dashboard-biomarker-slider-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0 2px;
        }
        .dashboard-biomarker-slider-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          flex-shrink: 0;
          min-width: 44px;
        }
        .dashboard-biomarker-slider-label:first-of-type {
          text-align: right;
        }
        .dashboard-biomarker-slider-bar {
          position: relative;
          flex: 1;
          height: 8px;
          border-radius: 999px;
          overflow: visible;
          display: flex;
          gap: 2px;
          padding: 2px;
          background: var(--biomarker-range-track);
          box-sizing: border-box;
        }
        .dashboard-biomarker-slider-seg {
          flex: 1;
          height: 100%;
          min-height: 4px;
          border-radius: 4px;
        }
        .dashboard-biomarker-slider-seg--low {
          background: var(--biomarker-range-low-bg);
          border-radius: 999px 3px 3px 999px;
        }
        .dashboard-biomarker-slider-seg--mid {
          background: var(--biomarker-range-optimal-bg);
        }
        .dashboard-biomarker-slider-seg--high {
          background: var(--biomarker-range-high-bg);
          border-radius: 3px 999px 999px 3px;
        }
        .dashboard-biomarker-slider-dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: var(--color-accent);
          border: 2px solid var(--clarion-card-bg);
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent),
            0 2px 6px rgba(0, 0, 0, 0.18);
          pointer-events: none;
        }
        .dashboard-biomarker-impact {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-error, #c53030);
          margin: 0;
        }
        .dashboard-biomarker-insight {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin: 0;
        }
        .dashboard-biomarker-cta {
          display: inline-block;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
          margin-top: 4px;
        }
        .dashboard-biomarker-cta:hover {
          text-decoration: underline;
        }
        .dashboard-biomarker-expand-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 8px 0;
          font-size: 13px;
          color: var(--color-text-muted);
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
        }
        .dashboard-biomarker-expand-btn:hover {
          color: var(--color-accent);
        }
        .dashboard-biomarker-card-chevron {
          flex-shrink: 0;
          color: inherit;
          transition: transform 0.2s ease;
        }
        .dashboard-biomarker-card-chevron--open {
          transform: rotate(180deg);
        }
        .dashboard-biomarker-card-back {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
        }
        .dashboard-biomarker-card-back--open {
          max-height: 2000px;
        }
        .dashboard-biomarker-card-back > * {
          padding: 14px 0 0;
        }
        .dashboard-biomarker-expand-block--report {
          margin-bottom: 14px;
        }
        .dashboard-biomarker-report-section {
          padding: 14px 0 0;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-biomarker-expand-block--report > .dashboard-biomarker-report-section:first-child {
          border-top: none;
          padding-top: 0;
        }
        .dashboard-biomarker-report-heading {
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .dashboard-biomarker-report-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text-secondary);
        }
        .dashboard-biomarker-why {
          margin-top: 14px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--chart-ferritin) 28%, var(--color-border-strong));
          background: color-mix(in srgb, var(--chart-ferritin) 5%, var(--color-bg));
          overflow: hidden;
        }
        .dashboard-biomarker-why-toggle {
          display: flex;
          width: 100%;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          margin: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: inherit;
          color: var(--color-text-primary);
          transition: background 0.15s ease;
        }
        .dashboard-biomarker-why-toggle:hover {
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
        }
        .dashboard-biomarker-why-toggle:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: -2px;
        }
        .dashboard-biomarker-why-toggle-label {
          flex: 1 1 auto;
          min-width: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          line-height: 1.35;
        }
        .dashboard-biomarker-why-chevron {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          color: var(--chart-ferritin);
          transition: transform 0.2s ease;
        }
        .dashboard-biomarker-why-chevron--open {
          transform: rotate(180deg);
        }
        .dashboard-biomarker-why-panel {
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.28s ease, opacity 0.2s ease;
        }
        .dashboard-biomarker-why-panel--open {
          max-height: 560px;
          opacity: 1;
          background: color-mix(in srgb, var(--chart-ferritin) 4%, transparent);
        }
        .dashboard-biomarker-why-copy {
          padding: 0 14px 14px;
          border-top: 1px solid color-mix(in srgb, var(--chart-ferritin) 18%, var(--color-border));
          padding-top: 12px;
        }
        .dashboard-biomarker-expand-block {
          margin-bottom: 12px;
        }
        .dashboard-biomarker-expand-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 6px;
        }
        .dashboard-biomarker-expand-text {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }
        .dashboard-biomarker-expand-list {
          margin: 0;
          padding-left: 1.2em;
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .dashboard-biomarker-expand-block--evidence {
          padding-top: 4px;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-biomarker-evidence-strength {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.45;
        }
        .dashboard-biomarker-evidence-lede {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.45;
        }
        .dashboard-biomarker-evidence-list {
          margin: 0;
          padding-left: 1.2em;
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .dashboard-biomarker-evidence-list li {
          margin-bottom: 4px;
        }
        .dashboard-biomarker-evidence-link {
          color: var(--color-accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .dashboard-biomarker-evidence-link:hover {
          opacity: 0.9;
        }
        .dashboard-biomarker-evidence-source {
          color: var(--color-text-muted);
        }
        .dashboard-biomarker-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 8px;
        }
        .dashboard-biomarker-link {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
        }
        .dashboard-biomarker-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </main>
  )
}
