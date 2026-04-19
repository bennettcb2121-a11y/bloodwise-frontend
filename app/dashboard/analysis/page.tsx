"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Crosshair, Lightbulb, Mail, Pill, Printer, Sparkles, Table2 } from "lucide-react"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers, getRangeComparison, type BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { RangeComparisonBar } from "@/src/components/RangeComparisonBar"
import { getStatusTone } from "@/src/lib/priorityEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getPrioritySummary } from "@/src/lib/priorityEngine"
import { getOrderedFocusResults, getOrderedScoreDrivers, getScoreBreakdown } from "@/src/lib/scoreBreakdown"
import { countByStatus, scoreToLabel } from "@/src/lib/scoreEngine"
import { detectPatterns } from "@/src/lib/patternEngine"
import { supplementRecommendations, type SupplementRecommendation } from "@/src/lib/supplements"
import { hasClarionAnalysisAccess, hasLabPersonalizationAccess } from "@/src/lib/accessGate"
import { LabUpgradeCallout } from "@/src/components/LabUpgradeCallout"
import { ComplianceFooter } from "@/src/components/ComplianceFooter"
import { buildAdaptiveRangeBullets } from "@/src/lib/analysisReportCopy"
import type { UserProfile } from "@/src/lib/classifyUser"
import { getBiomarkerProfileNarrative } from "@/src/lib/biomarkerProfileNarrative"

function sortSupplementRecs(recs: SupplementRecommendation[]): SupplementRecommendation[] {
  const order: Record<string, number> = { Core: 0, Conditional: 1, "Context-dependent": 2 }
  return [...recs].sort((a, b) => (order[a.recommendationType] ?? 9) - (order[b.recommendationType] ?? 9))
}

function formatTargetRange(r: BiomarkerResult): string {
  const lo = r.optimalMin
  const hi = r.optimalMax
  if (lo != null && hi != null) return `${lo}–${hi}`
  return "—"
}

/** Maps server/network errors to copy that stays out of the weeds (no env var names). */
function userFacingEmailErrorMessage(apiError?: string): string {
  const raw = (apiError ?? "").toLowerCase()
  if (raw.includes("not signed in")) return "Sign in to email this report."
  if (raw.includes("no email on account")) return "Add an email address to your account to use this."
  if (
    raw.includes("resend") ||
    raw.includes("not configured") ||
    raw.includes("email is not configured")
  ) {
    return "Email delivery isn’t turned on for this environment yet. Use Print or save as PDF to keep a copy."
  }
  if (raw.length > 0) return "We couldn’t send that email. Try again in a moment, or use Print or save as PDF."
  return "We couldn’t reach the email service. Check your connection and try again, or use Print or save as PDF."
}

export default function AnalysisReportPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [showIntroBanner, setShowIntroBanner] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [emailErrorHint, setEmailErrorHint] = useState<string | null>(null)
  /** Per-marker: expanded "Why it matters for you" on the full panel report */
  const [whyExpandedByMarker, setWhyExpandedByMarker] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
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

  const hasReportContent = Boolean(
    bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
  )

  useEffect(() => {
    if (typeof document === "undefined") return
    if (!hasReportContent || !user) return
    document.body.classList.add("clarion-print-report")
    return () => document.body.classList.remove("clarion-print-report")
  }, [hasReportContent, user])

  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URLSearchParams(window.location.search)
    setShowIntroBanner(q.get("intro") === "1")
  }, [])

  const dismissIntroBanner = useCallback(() => {
    setShowIntroBanner(false)
    router.replace("/dashboard/analysis", { scroll: false })
  }, [router])

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print()
  }, [])

  const handleEmailReport = useCallback(async () => {
    setEmailStatus("sending")
    setEmailErrorHint(null)
    try {
      const res = await fetch("/api/send-analysis-report-email", { method: "POST", credentials: "include" })
      let data: { error?: string } = {}
      try {
        data = (await res.json()) as { error?: string }
      } catch {
        /* non-JSON */
      }
      if (!res.ok) {
        setEmailErrorHint(userFacingEmailErrorMessage(data.error))
        setEmailStatus("error")
        return
      }
      setEmailStatus("sent")
    } catch {
      setEmailErrorHint(userFacingEmailErrorMessage())
      setEmailStatus("error")
    }
  }, [])

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
            training_focus: profile.training_focus?.trim() || undefined,
          }
        : ({} as UserProfile),
    [profile?.age, profile?.sex, profile?.sport, profile?.training_focus]
  )

  const analysisResults = useMemo((): BiomarkerResult[] => {
    if (!bloodwork?.biomarker_inputs || Object.keys(bloodwork.biomarker_inputs).length === 0) return []
    return analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
  }, [bloodwork?.biomarker_inputs, profileForAnalysis])

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile), [profile])

  const detectedPatterns = useMemo(() => detectPatterns(analysisResults), [analysisResults])

  const orderedMarkers = useMemo(() => {
    const drivers = getOrderedScoreDrivers(analysisResults, analysisResults.length, priorityContext)
    const driverNames = new Set(drivers.map((d) => d.markerName))
    const rest = analysisResults.filter((r) => !driverNames.has(r.name ?? ""))
    const fromDrivers = drivers
      .map((d) => analysisResults.find((r) => r.name === d.markerName))
      .filter((r): r is BiomarkerResult => r != null)
    return [...fromDrivers, ...rest]
  }, [analysisResults, priorityContext])

  const scoreBreakdown = useMemo(
    () => (analysisResults.length > 0 ? getScoreBreakdown(analysisResults) : null),
    [analysisResults]
  )
  const totalScore = bloodwork?.score ?? scoreBreakdown?.total ?? 0

  const topFocusForSummary = useMemo(
    () => getOrderedFocusResults(analysisResults, 3, priorityContext),
    [analysisResults, priorityContext]
  )
  const statusCounts = useMemo(() => countByStatus(analysisResults), [analysisResults])
  const prioritySummary = useMemo(
    () => getPrioritySummary(analysisResults, topFocusForSummary),
    [analysisResults, topFocusForSummary]
  )
  const bloodwiseSummary = useMemo(() => {
    if (analysisResults.length === 0 || typeof totalScore !== "number") return null
    return getBloodwiseSummary({
      analysisResults,
      score: totalScore,
      statusCounts,
      topFocus: topFocusForSummary,
      prioritySummary,
      detectedPatterns,
    })
  }, [analysisResults, totalScore, statusCounts, topFocusForSummary, prioritySummary, detectedPatterns])

  const scoreUiLabel = useMemo(() => scoreToLabel(totalScore), [totalScore])

  const profileForSupplementRecs = useMemo(
    () =>
      profile
        ? {
            shopping_preference: profile.shopping_preference ?? "Best value",
            diet_preference: profile.diet_preference?.trim() || null,
            supplement_form_preference: profile.supplement_form_preference ?? "any",
            improvement_preference: profile.improvement_preference ?? null,
            sport: profile.sport?.trim() || null,
            goal: profile.goal?.trim() || null,
            profile_type: profile.profile_type?.trim() || null,
            health_goals: profile.health_goals?.trim() || null,
          }
        : null,
    [
      profile?.shopping_preference,
      profile?.diet_preference,
      profile?.supplement_form_preference,
      profile?.improvement_preference,
      profile?.sport,
      profile?.goal,
      profile?.profile_type,
      profile?.health_goals,
    ]
  )

  const supplementRecs = useMemo(() => {
    try {
      const raw =
        supplementRecommendations(analysisResults as BiomarkerResult[], {
          supplementFormPreference: profile?.supplement_form_preference === "no_pills" ? "no_pills" : "any",
          profile: profileForSupplementRecs,
        }) || []
      return sortSupplementRecs(raw)
    } catch {
      return []
    }
  }, [analysisResults, profile?.supplement_form_preference, profileForSupplementRecs])

  const rangeExplanation = useMemo(() => buildAdaptiveRangeBullets(profileForAnalysis), [profileForAnalysis])

  const reportDate =
    bloodwork?.updated_at != null
      ? new Date(bloodwork.updated_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null

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
      <main className="dashboard-tab-shell dashboard-analysis-page">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Analysis report</h1>
            <p className="dashboard-tab-subtitle">Your Clarion targets, labs, and supplement matches in one place.</p>
          </header>
          <LabUpgradeCallout
            awaitingUpload={awaitingUpload}
            intro={
              awaitingUpload
                ? "Add your bloodwork to generate your analysis report with Clarion targets and stack suggestions."
                : "Unlock lab-backed analysis to see custom Clarion targets and lab-matched supplement context."
            }
          />
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
        <style jsx>{analysisReportStyles}</style>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell dashboard-analysis-page">
      <div className="dashboard-tab-container">
        {showIntroBanner ? (
          <div className="dashboard-analysis-intro-banner dashboard-analysis-print-hide" role="status">
            <div className="dashboard-analysis-intro-banner-text">
              <strong>Here&apos;s your Clarion analysis report.</strong> Your adaptive targets, full marker table, and
              lab-matched supplements are below. Use Print to save a PDF copy.
            </div>
            <button type="button" className="dashboard-analysis-intro-dismiss" onClick={dismissIntroBanner}>
              Got it
            </button>
          </div>
        ) : null}

        <header className="dashboard-analysis-header">
          <p className="dashboard-analysis-kicker">Clarion analysis</p>
          <h1 className="dashboard-tab-title dashboard-analysis-title">Your panel, translated</h1>
          <p className="dashboard-tab-subtitle dashboard-analysis-lede">
            One read of your labs against Clarion targets: what&apos;s strong, what needs a nudge, and what to discuss with
            your clinician. Supplements are ranked last—habits and retests come first.
          </p>
          {reportDate ? (
            <p className="dashboard-analysis-meta">Last updated {reportDate}</p>
          ) : null}
          <div className="dashboard-analysis-print-actions dashboard-analysis-print-hide">
            <button type="button" className="dashboard-analysis-action-btn" onClick={handlePrint}>
              <Printer size={18} strokeWidth={2} aria-hidden />
              Print or save PDF
            </button>
            <button
              type="button"
              className="dashboard-analysis-action-btn dashboard-analysis-action-btn--secondary"
              onClick={handleEmailReport}
              disabled={emailStatus === "sending"}
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              {emailStatus === "sending"
                ? "Sending…"
                : emailStatus === "sent"
                  ? "Send again"
                  : emailStatus === "error"
                    ? "Retry email"
                    : "Email report"}
            </button>
          </div>
          {emailStatus === "error" && emailErrorHint ? (
            <p
              className="dashboard-analysis-email-hint dashboard-analysis-email-hint--error dashboard-analysis-print-hide"
              role="alert"
            >
              {emailErrorHint}
            </p>
          ) : null}
          {emailStatus === "sent" ? (
            <p className="dashboard-analysis-email-hint dashboard-analysis-print-hide" role="status">
              Check your inbox for a link to this report.
            </p>
          ) : null}
        </header>

        <section className="dashboard-analysis-mast" aria-labelledby="analysis-score-heading">
          <div className="dashboard-analysis-mast-grid">
            <div className="dashboard-analysis-score-wrap">
              <div className="dashboard-analysis-score-visual">
                <div
                  className="dashboard-analysis-score-ring"
                  style={{ "--score-pct": Math.max(0, Math.min(100, Math.round(totalScore))) } as React.CSSProperties}
                  aria-hidden
                />
                <div className="dashboard-analysis-score-ring-center">
                  <span id="analysis-score-heading" className="dashboard-analysis-score-value">
                    {Math.round(totalScore)}
                  </span>
                  <span className="dashboard-analysis-score-ui-label">{scoreUiLabel}</span>
                </div>
              </div>
              <p className="dashboard-analysis-score-hint">100 = every tracked marker in Clarion&apos;s target band.</p>
            </div>
            {bloodwiseSummary ? (
              <div className="dashboard-analysis-mast-story">
                <p className="dashboard-analysis-story-eyebrow">
                  <Sparkles size={14} strokeWidth={2} className="dashboard-analysis-story-eyebrow-icon" aria-hidden />
                  <span className="dashboard-analysis-story-eyebrow-text">Clarion read</span>
                </p>
                <p className="dashboard-analysis-interpretation">{bloodwiseSummary.overallInterpretation}</p>
              </div>
            ) : null}
          </div>
          <div className="dashboard-analysis-stat-strip" role="list">
            <div className="dashboard-analysis-stat" role="listitem">
              <span className="dashboard-analysis-stat-value">{statusCounts.optimal}</span>
              <span className="dashboard-analysis-stat-label">In target</span>
            </div>
            <div className="dashboard-analysis-stat" role="listitem">
              <span className="dashboard-analysis-stat-value">{statusCounts.borderline}</span>
              <span className="dashboard-analysis-stat-label">Borderline</span>
            </div>
            <div className="dashboard-analysis-stat" role="listitem">
              <span className="dashboard-analysis-stat-value">{statusCounts.flagged}</span>
              <span className="dashboard-analysis-stat-label">Needs attention</span>
            </div>
            <div className="dashboard-analysis-stat" role="listitem">
              <span className="dashboard-analysis-stat-value">{statusCounts.unknown}</span>
              <span className="dashboard-analysis-stat-label">Not in library</span>
            </div>
          </div>
        </section>

        {bloodwiseSummary && (bloodwiseSummary.keyFindings.length > 0 || bloodwiseSummary.topPriorityActions.length > 0) ? (
          <section className="dashboard-analysis-section dashboard-analysis-section--highlight" aria-labelledby="analysis-summary-heading">
            <div className="dashboard-analysis-section-head">
              <span className="dashboard-analysis-section-icon" aria-hidden>
                <Lightbulb size={22} strokeWidth={2} />
              </span>
              <div>
                <h2 id="analysis-summary-heading" className="dashboard-analysis-section-title">
                  What Clarion highlights
                </h2>
                <p className="dashboard-analysis-section-lede">
                  Short, prioritized takeaways—then the full table below for every marker.
                </p>
              </div>
            </div>
            {bloodwiseSummary.keyFindings.length > 0 ? (
              <ul className="dashboard-analysis-insight-cards">
                {bloodwiseSummary.keyFindings.map((k, i) => (
                  <li key={`k-${i}`} className="dashboard-analysis-insight-card">
                    <span className="dashboard-analysis-insight-index" aria-hidden>
                      {i + 1}
                    </span>
                    <p className="dashboard-analysis-insight-text">{k}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {bloodwiseSummary.topPriorityActions.length > 0 ? (
              <>
                <h3 className="dashboard-analysis-subheading">Suggested next steps</h3>
                <ul className="dashboard-analysis-action-list">
                  {bloodwiseSummary.topPriorityActions.map((a, i) => (
                    <li key={`a-${i}`} className="dashboard-analysis-action-item">
                      <span className="dashboard-analysis-action-check" aria-hidden />
                      {a}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        <section className="dashboard-analysis-section" aria-labelledby="analysis-ranges-heading">
          <div className="dashboard-analysis-section-head">
            <span className="dashboard-analysis-section-icon" aria-hidden>
              <Crosshair size={22} strokeWidth={2} />
            </span>
            <div>
              <h2 id="analysis-ranges-heading" className="dashboard-analysis-section-title">
                How Clarion sets your targets
              </h2>
              <p className="dashboard-analysis-section-lede">
                Your profile selects bands from our library. Targets are for coaching—not a diagnosis.
              </p>
            </div>
          </div>
          <ul className="dashboard-analysis-bullet-list dashboard-analysis-bullet-list--tight">
            {rangeExplanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="dashboard-analysis-section" aria-labelledby="analysis-markers-heading">
          <div className="dashboard-analysis-section-head">
            <span className="dashboard-analysis-section-icon" aria-hidden>
              <Table2 size={22} strokeWidth={2} />
            </span>
            <div>
              <h2
                id="analysis-markers-heading"
                className="dashboard-analysis-section-title dashboard-analysis-section-title--report"
              >
                Full panel (priority order)
              </h2>
              <p className="dashboard-analysis-section-lede">
                Lab-style rows: your value, Clarion target, and status—then a short definition. Tap{" "}
                <strong>Why it matters for you</strong> to expand personalized context; fit for goals &amp; training
                stays visible below.
              </p>
            </div>
          </div>
          <ul className="dashboard-analysis-marker-cards dashboard-analysis-marker-report">
            {orderedMarkers.map((r) => {
              const tone = getStatusTone(r.status)
              const statusLower = (r.status ?? "").toLowerCase()
              const unknown = statusLower === "unknown"
              const narrative = getBiomarkerProfileNarrative(r.name, r, profile)
              const whyOpen = Boolean(whyExpandedByMarker[r.name])
              const whyPanelId = `analysis-marker-why-${r.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "marker"}`
              const comparison =
                r.optimalMin != null && r.optimalMax != null
                  ? getRangeComparison(r.name, r.value, profileForAnalysis)
                  : null
              return (
                <li
                  key={r.name}
                  className={`dashboard-analysis-marker-card dashboard-analysis-marker-card--${tone.className}`}
                >
                  <div className="dashboard-analysis-marker-card-top">
                    <h3 className="dashboard-analysis-marker-name">{r.name}</h3>
                    <table className="dashboard-analysis-marker-lab" aria-label={`${r.name} result summary`}>
                      <tbody>
                        <tr>
                          <th scope="row">Your value</th>
                          <td>
                            <span className="dashboard-analysis-marker-lab-value">{unknown ? "—" : r.value}</span>
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Clarion target</th>
                          <td>
                            <span className="dashboard-analysis-marker-lab-value">
                              {unknown ? "—" : formatTargetRange(r)}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Status</th>
                          <td>
                            <span className={`dashboard-analysis-badge dashboard-analysis-badge--${tone.className}`}>
                              {tone.label}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {comparison && comparison.standardMin != null && comparison.personalMin != null ? (
                    <div className="dashboard-analysis-marker-ranges">
                      <RangeComparisonBar
                        marker={r.name}
                        value={r.value}
                        standardMin={comparison.standardMin}
                        standardMax={comparison.standardMax}
                        personalMin={comparison.personalMin}
                        personalMax={comparison.personalMax}
                        mismatch={comparison.mismatch}
                        profileLabel={comparison.profileLabel}
                        labReferenceMin={comparison.labReferenceMin}
                        labReferenceMax={comparison.labReferenceMax}
                        labReferenceSource={comparison.labReferenceSource}
                        standardTiers={comparison.standardTiers}
                        verdict={comparison.verdict}
                        verdictIsFlagged={comparison.verdictIsFlagged}
                      />
                    </div>
                  ) : null}
                  <div className="dashboard-analysis-marker-body">
                    <div className="dashboard-analysis-marker-report-section">
                      <h4 className="dashboard-analysis-marker-story-heading">What it is</h4>
                      <p className="dashboard-analysis-marker-story-text">{narrative.whatItIs}</p>
                    </div>
                    <div className="dashboard-analysis-marker-why">
                      <button
                        type="button"
                        className="dashboard-analysis-marker-why-toggle"
                        id={`${whyPanelId}-btn`}
                        aria-expanded={whyOpen}
                        aria-controls={whyPanelId}
                        onClick={() =>
                          setWhyExpandedByMarker((prev) => ({ ...prev, [r.name]: !prev[r.name] }))
                        }
                      >
                        <span className="dashboard-analysis-marker-why-toggle-label">Why it matters for you</span>
                        <ChevronDown
                          size={18}
                          className={`dashboard-analysis-marker-why-chevron ${whyOpen ? "dashboard-analysis-marker-why-chevron--open" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <div
                        id={whyPanelId}
                        role="region"
                        aria-labelledby={`${whyPanelId}-btn`}
                        aria-hidden={!whyOpen}
                        className={`dashboard-analysis-marker-why-panel ${whyOpen ? "dashboard-analysis-marker-why-panel--open" : ""}`}
                      >
                        <p className="dashboard-analysis-marker-story-text dashboard-analysis-marker-why-copy">
                          {narrative.whyForYou}
                        </p>
                      </div>
                    </div>
                    <div className="dashboard-analysis-marker-report-section">
                      <h4 className="dashboard-analysis-marker-story-heading">Fit for your goals &amp; training</h4>
                      <p className="dashboard-analysis-marker-story-text">{narrative.fitForGoals}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="dashboard-analysis-crosslink">
            <Link href="/dashboard/biomarkers">Biomarkers</Link> — scales, food &amp; lifestyle notes, evidence links.
          </p>
        </section>

        <section className="dashboard-analysis-section" aria-labelledby="analysis-supplements-heading">
          <div className="dashboard-analysis-section-head">
            <span className="dashboard-analysis-section-icon" aria-hidden>
              <Pill size={22} strokeWidth={2} />
            </span>
            <div>
              <h2 id="analysis-supplements-heading" className="dashboard-analysis-section-title">
                Lab-matched supplement ideas
              </h2>
              <p className="dashboard-analysis-section-lede">
                Core first (tightest lab link). Confirm doses and interactions with your clinician—education only, not a
                prescription.
              </p>
            </div>
          </div>
          {supplementRecs.length === 0 ? (
            <p className="dashboard-analysis-muted">No supplement suggestions for this panel snapshot.</p>
          ) : (
            <ul className="dashboard-analysis-supplement-list">
              {supplementRecs.map((rec) => (
                <li key={`${rec.supplementKey}-${rec.marker}`} className="dashboard-analysis-supplement-card">
                  <div className="dashboard-analysis-supplement-top">
                    <span className="dashboard-analysis-supplement-name">{rec.name}</span>
                    <span className={`dashboard-analysis-pill dashboard-analysis-pill--${rec.recommendationType.replace(/\s+/g, "-").toLowerCase()}`}>
                      {rec.recommendationType}
                    </span>
                  </div>
                  <p className="dashboard-analysis-supplement-meta">
                    Linked marker: <strong>{rec.marker}</strong>
                    {rec.dose ? ` · ${rec.dose}` : ""}
                  </p>
                  <p className="dashboard-analysis-supplement-why">{rec.whyThisIsRecommended || rec.whyRecommended}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="dashboard-analysis-crosslink">
            <Link href="/dashboard/plan">Plan &amp; stack</Link> for dosing context, timing, and what you already own.
          </p>
        </section>

        <p className="dashboard-tab-muted dashboard-analysis-print-hide">
          <Link href="/dashboard">Back to Home</Link>
        </p>

        <ComplianceFooter variant="footer" />
      </div>
      <style jsx>{analysisReportStyles}</style>
    </main>
  )
}

const analysisReportStyles = `
  .dashboard-analysis-page :global(.dashboard-tab-container) {
    padding-top: 20px;
    padding-bottom: 32px;
    max-width: 720px;
  }
  .dashboard-analysis-intro-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 20px;
    border-radius: 12px;
    border: 1px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
  }
  .dashboard-analysis-intro-banner-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-primary);
    max-width: 52ch;
  }
  .dashboard-analysis-intro-dismiss {
    flex-shrink: 0;
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-accent);
    color: var(--color-accent-contrast, #fff);
  }
  .dashboard-analysis-print-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }
  .dashboard-analysis-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-accent);
    color: var(--color-accent-contrast, #fff);
  }
  .dashboard-analysis-action-btn:disabled {
    opacity: 0.75;
    cursor: default;
  }
  .dashboard-analysis-action-btn--secondary {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }
  .dashboard-analysis-email-hint {
    margin: 10px 0 0;
    max-width: 42rem;
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-email-hint--error {
    color: color-mix(in srgb, var(--color-error) 55%, var(--color-text-secondary));
  }
  .dashboard-analysis-header {
    margin-bottom: 24px;
  }
  .dashboard-analysis-kicker {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-title {
    margin-bottom: 8px;
  }
  .dashboard-analysis-lede {
    margin: 0 0 8px;
    line-height: 1.55;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-meta {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-mast {
    margin-bottom: 28px;
    padding: 22px 20px;
    border-radius: var(--clarion-card-radius, 14px);
    border: 1px solid color-mix(in srgb, var(--chart-ferritin) 22%, var(--color-border));
    background: linear-gradient(
      165deg,
      color-mix(in srgb, var(--chart-ferritin) 7%, var(--dashboard-surface-l3-bg, var(--color-surface))) 0%,
      var(--dashboard-surface-l3-bg, var(--color-surface)) 55%
    );
    box-shadow:
      var(--shadow-sm),
      inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 6%, transparent);
  }
  .dashboard-analysis-mast-grid {
    display: grid;
    gap: 20px;
    align-items: start;
  }
  @media (min-width: 640px) {
    .dashboard-analysis-mast-grid {
      grid-template-columns: 160px 1fr;
      gap: 28px;
    }
  }
  .dashboard-analysis-score-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  @media (min-width: 640px) {
    .dashboard-analysis-score-wrap {
      align-items: center;
    }
  }
  .dashboard-analysis-score-visual {
    position: relative;
    width: 128px;
    height: 128px;
    flex-shrink: 0;
  }
  .dashboard-analysis-score-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from -90deg,
      var(--color-accent) calc(var(--score-pct) * 3.6deg),
      color-mix(in srgb, var(--color-border) 80%, transparent) 0
    );
  }
  .dashboard-analysis-score-ring-center {
    position: absolute;
    inset: 11px;
    border-radius: 50%;
    background: var(--color-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: 1px solid var(--color-border);
  }
  .dashboard-analysis-score-value {
    margin: 0;
    font-size: 36px;
    font-weight: 700;
    font-family: var(--font-body), system-ui, sans-serif;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-score-ui-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-accent);
  }
  .dashboard-analysis-score-hint {
    margin: 12px 0 0;
    max-width: 200px;
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.4;
  }
  .dashboard-analysis-mast-story {
    min-width: 0;
  }
  .dashboard-analysis-story-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--chart-ferritin);
  }
  .dashboard-analysis-story-eyebrow-icon {
    flex-shrink: 0;
    color: var(--chart-ferritin);
    opacity: 0.95;
  }
  .dashboard-analysis-story-eyebrow-text {
    color: inherit;
  }
  .dashboard-analysis-interpretation {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-stat-strip {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid var(--color-border);
  }
  @media (min-width: 520px) {
    .dashboard-analysis-stat-strip {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .dashboard-analysis-stat {
    padding: 12px 12px;
    border-radius: 10px;
    background: var(--dashboard-surface-l2-bg, var(--color-surface));
    border: 1px solid var(--dashboard-surface-l2-border, var(--color-border));
    text-align: center;
  }
  .dashboard-analysis-stat-value {
    display: block;
    font-size: 22px;
    font-weight: 700;
    font-family: var(--font-body), system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    line-height: 1.2;
  }
  .dashboard-analysis-stat-label {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-section-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .dashboard-analysis-section-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }
  .dashboard-analysis-section-head .dashboard-analysis-section-title {
    margin-bottom: 4px;
  }
  .dashboard-analysis-section-head .dashboard-analysis-section-lede {
    margin-bottom: 0;
  }
  .dashboard-analysis-section--highlight {
    padding: 20px;
    border-radius: var(--clarion-card-radius, 14px);
    border: 1px solid var(--color-accent-border);
    background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
  }
  .dashboard-analysis-insight-cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .dashboard-analysis-insight-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .dashboard-analysis-insight-index {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 8px;
    background: var(--color-accent);
    color: var(--color-accent-contrast, #fff);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .dashboard-analysis-insight-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-action-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .dashboard-analysis-action-item {
    position: relative;
    padding-left: 1.35rem;
    margin-bottom: 10px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-action-check {
    position: absolute;
    left: 0;
    top: 0.35em;
    width: 6px;
    height: 10px;
    border: solid var(--color-accent);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .dashboard-analysis-bullet-list--tight li {
    margin-bottom: 6px;
  }
  .dashboard-analysis-marker-report {
    font-family: var(--font-body), system-ui, -apple-system, sans-serif;
    font-feature-settings: "kern" 1;
  }
  .dashboard-analysis-section-title--report {
    font-family: var(--font-body), system-ui, -apple-system, sans-serif;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .dashboard-analysis-marker-cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .dashboard-analysis-marker-card {
    border-radius: 10px;
    border: 1px solid var(--dashboard-surface-l2-border, var(--color-border));
    background: var(--dashboard-surface-l2-bg, var(--color-surface));
    overflow: hidden;
  }
  .dashboard-analysis-marker-card--tone-green {
    border-left: 3px solid var(--color-success);
  }
  .dashboard-analysis-marker-card--tone-amber {
    border-left: 3px solid var(--color-warning);
  }
  .dashboard-analysis-marker-card--tone-red {
    border-left: 3px solid var(--color-error);
  }
  .dashboard-analysis-marker-card--tone-neutral {
    border-left: 3px solid color-mix(in srgb, var(--color-text-muted) 55%, transparent);
  }
  .dashboard-analysis-marker-card-top {
    padding: 14px 16px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-muted);
  }
  .dashboard-analysis-marker-name {
    margin: 0 0 12px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.25;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-marker-lab {
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
  .dashboard-analysis-marker-lab tbody tr:not(:last-child) th,
  .dashboard-analysis-marker-lab tbody tr:not(:last-child) td {
    border-bottom: 1px solid var(--color-border);
  }
  .dashboard-analysis-marker-lab th {
    text-align: left;
    font-weight: 600;
    font-size: 10px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 11px 12px 11px 14px;
    width: 46%;
    max-width: 200px;
    vertical-align: middle;
    background: color-mix(in srgb, var(--color-text-primary) 2.5%, transparent);
  }
  .dashboard-analysis-marker-lab td {
    text-align: right;
    padding: 11px 14px 11px 12px;
    vertical-align: middle;
    font-variant-numeric: tabular-nums;
    background: var(--color-bg);
  }
  .dashboard-analysis-marker-lab tbody tr:nth-child(even) td {
    background: color-mix(in srgb, var(--color-text-primary) 2%, transparent);
  }
  .dashboard-analysis-marker-lab-value {
    display: inline-block;
    font-size: 15px;
    font-weight: 600;
    font-feature-settings: "tnum" 1;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    letter-spacing: 0;
    line-height: 1.35;
  }
  .dashboard-analysis-marker-ranges {
    padding: 6px 16px 10px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .dashboard-analysis-marker-body {
    padding: 0 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .dashboard-analysis-marker-report-section {
    margin: 0;
    padding: 16px 0 0;
    border-top: 1px solid var(--color-border);
  }
  .dashboard-analysis-marker-body > .dashboard-analysis-marker-report-section:first-of-type {
    border-top: none;
    padding-top: 16px;
  }
  .dashboard-analysis-marker-story-heading {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-marker-story-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-marker-why {
    margin-top: 14px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--chart-ferritin) 28%, var(--color-border-strong));
    background: color-mix(in srgb, var(--chart-ferritin) 5%, var(--color-bg));
    overflow: hidden;
  }
  .dashboard-analysis-marker-why-toggle {
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
  .dashboard-analysis-marker-why-toggle:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .dashboard-analysis-marker-why-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }
  .dashboard-analysis-marker-why-toggle-label {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-primary);
    line-height: 1.35;
  }
  .dashboard-analysis-marker-why-chevron {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    color: var(--chart-ferritin);
    transition: transform 0.2s ease;
  }
  .dashboard-analysis-marker-why-chevron--open {
    transform: rotate(180deg);
  }
  .dashboard-analysis-marker-why-panel {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.28s ease, opacity 0.2s ease;
  }
  .dashboard-analysis-marker-why-panel--open {
    max-height: 560px;
    opacity: 1;
    background: color-mix(in srgb, var(--chart-ferritin) 4%, transparent);
  }
  .dashboard-analysis-marker-why-copy {
    padding: 0 14px 14px;
    border-top: 1px solid color-mix(in srgb, var(--chart-ferritin) 18%, var(--color-border));
    padding-top: 12px;
  }
  @media print {
    .dashboard-analysis-marker-why-panel {
      max-height: none !important;
      opacity: 1 !important;
      overflow: visible !important;
    }
    .dashboard-analysis-marker-why-chevron {
      display: none;
    }
    .dashboard-analysis-marker-why-toggle {
      cursor: default;
      padding-bottom: 8px;
    }
  }
  .dashboard-analysis-section {
    margin-bottom: 28px;
  }
  .dashboard-analysis-section-title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    font-family: var(--font-heading), Georgia, serif;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-section-lede {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-subheading {
    margin: 16px 0 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-bullet-list {
    margin: 0;
    padding-left: 1.15rem;
    color: var(--color-text-secondary);
    line-height: 1.55;
    font-size: 14px;
  }
  .dashboard-analysis-bullet-list li {
    margin-bottom: 8px;
  }
  .dashboard-analysis-table-wrap {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid var(--color-border);
  }
  .dashboard-analysis-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .dashboard-analysis-table th,
  .dashboard-analysis-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  .dashboard-analysis-table thead th {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-text-muted);
    background: var(--color-surface-elevated, var(--color-surface));
  }
  .dashboard-analysis-table tbody th {
    font-weight: 500;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-table tbody tr:nth-child(even) td,
  .dashboard-analysis-table tbody tr:nth-child(even) th {
    background: color-mix(in srgb, var(--color-text-primary) 4%, transparent);
  }
  .dashboard-analysis-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
  .dashboard-analysis-badge--tone-green {
    background: color-mix(in srgb, var(--color-success) 22%, transparent);
    color: var(--color-success);
  }
  .dashboard-analysis-badge--tone-amber {
    background: color-mix(in srgb, var(--color-warning) 22%, transparent);
    color: var(--color-warning);
  }
  .dashboard-analysis-badge--tone-red {
    background: color-mix(in srgb, var(--color-error) 20%, transparent);
    color: var(--color-error);
  }
  .dashboard-analysis-badge--tone-neutral {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-crosslink {
    margin: 12px 0 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-crosslink :global(a) {
    font-weight: 600;
    color: var(--color-accent);
  }
  .dashboard-analysis-muted {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-supplement-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dashboard-analysis-supplement-card {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .dashboard-analysis-supplement-top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }
  .dashboard-analysis-supplement-name {
    font-weight: 600;
    font-size: 16px;
    color: var(--color-text-primary);
  }
  .dashboard-analysis-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .dashboard-analysis-pill--core {
    background: rgba(31, 111, 91, 0.15);
    color: var(--color-accent, #1f6f5b);
  }
  .dashboard-analysis-pill--conditional {
    background: rgba(59, 130, 246, 0.12);
    color: rgb(30, 64, 175);
  }
  .dashboard-analysis-pill--context-dependent {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }
  .dashboard-analysis-supplement-meta {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .dashboard-analysis-supplement-why {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
`
