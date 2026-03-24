"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { hasClarionAnalysisAccess } from "@/src/lib/accessGate"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SavedSupplementStackItem, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { getAffiliateProductForStackItem, getAmazonSearchUrl } from "@/src/lib/stackAffiliate"
import { AFFILIATE_DISCLOSURE, MONTHLY_COST_DISCLAIMER } from "@/src/lib/affiliateProducts"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { getScoreBreakdown, getScoreDrivers, getImprovementForecast, SCORE_CATEGORIES } from "@/src/lib/scoreBreakdown"
import { getRoadmapPhase } from "@/src/lib/healthRoadmap"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import { Package, TrendingUp, BarChart2, CalendarCheck, Bookmark, DollarSign } from "lucide-react"
import { SupplementInventoryTracker } from "@/src/components/SupplementInventoryTracker"
import { notifications } from "@mantine/notifications"
import "../dashboard.css"

export default function DashboardPlanPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)

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

  const hasAccess = hasClarionAnalysisAccess(profile, subscription, bloodwork)

  useEffect(() => {
    if (authLoading || !user) return
    if (profile === null && !loading) return
    if (!hasAccess && profile !== null) router.replace("/paywall")
  }, [authLoading, user, loading, profile, hasAccess, router])

  const profileForAnalysis = profile ? { age: profile.age, sex: profile.sex, sport: profile.sport } : {}
  const analysisResults = useMemo(
    () =>
      bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
        ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
        : [],
    [bloodwork?.biomarker_inputs, profileForAnalysis]
  )
  const retestRecommendations = getRetestRecommendations(analysisResults)

  const scoreBreakdown = useMemo(
    () => (analysisResults.length > 0 ? getScoreBreakdown(analysisResults) : null),
    [analysisResults]
  )
  const scoreDrivers = useMemo(
    () => (analysisResults.length > 0 ? getScoreDrivers(analysisResults, 5) : []),
    [analysisResults]
  )
  const improvementForecast = useMemo(() => {
    if (scoreDrivers.length === 0) return null
    return getImprovementForecast(analysisResults, scoreDrivers[0].markerName)
  }, [analysisResults, scoreDrivers])

  const roadmap = useMemo(
    () => (analysisResults.length > 0 ? getRoadmapPhase(analysisResults) : null),
    [analysisResults]
  )

  const retestWeeks = profile?.retest_weeks ?? 8
  const lastBloodworkAt = bloodwork?.updated_at ?? bloodwork?.created_at ?? null
  const retestCountdown = useMemo(() => {
    if (!lastBloodworkAt || !retestWeeks) return null
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    const dueDate = last + weeksMs
    const now = Date.now()
    if (now < dueDate) {
      const weeksUntil = Math.ceil((dueDate - now) / (7 * 24 * 60 * 60 * 1000))
      return { type: "until" as const, weeks: weeksUntil }
    }
    const weeksOverdue = Math.ceil((now - dueDate) / (7 * 24 * 60 * 60 * 1000))
    return { type: "overdue" as const, weeks: weeksOverdue }
  }, [lastBloodworkAt, retestWeeks])

  const savingsSnapshot = bloodwork?.savings_snapshot as Record<string, unknown> | undefined
  const annualSavings =
    typeof savingsSnapshot?.annualSavings === "number" ? savingsSnapshot.annualSavings : 0
  const optimizedSpend =
    typeof savingsSnapshot?.optimizedSpend === "number" ? savingsSnapshot.optimizedSpend : 0
  const userCurrentSpend =
    typeof savingsSnapshot?.userCurrentSpend === "number" ? savingsSnapshot.userCurrentSpend : 0
  const monthlySavings =
    typeof savingsSnapshot?.estimatedSavingsVsCurrent === "number"
      ? savingsSnapshot.estimatedSavingsVsCurrent
      : userCurrentSpend - optimizedSpend

  const hasBloodwork = Boolean(
    bloodwork && ((bloodwork.selected_panel?.length ?? 0) > 0 || bloodwork.score != null)
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
          <p>Loading plan…</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  if (!hasBloodwork) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Plan & stack</h1>
            <p className="dashboard-tab-subtitle">Roadmap, supplements, and savings.</p>
          </header>
          <div className="dashboard-tab-card dashboard-biomarkers-empty">
            <p className="dashboard-biomarkers-empty-text">Complete a panel to see your plan and stack.</p>
            <Link href="/?step=labs" className="dashboard-actions-cta">
              Add bloodwork
            </Link>
          </div>
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
          <h1 className="dashboard-tab-title">Plan & stack</h1>
          <p className="dashboard-tab-subtitle">Supplements, roadmap, savings, and retest timing.</p>
        </header>

        {(() => {
          const rawStack =
            bloodwork?.stack_snapshot && "stack" in bloodwork.stack_snapshot && Array.isArray(bloodwork.stack_snapshot.stack)
              ? (bloodwork.stack_snapshot.stack as SavedSupplementStackItem[])
              : null
          const valid = rawStack?.filter((s) => s?.supplementName?.trim()) ?? []
          if (valid.length === 0) {
            return (
              <section id="stack" className="dashboard-section" aria-labelledby="dashboard-plan-stack-heading">
                <h2 id="dashboard-plan-stack-heading" className="dashboard-section-title">
                  <Package className="dashboard-section-title-icon" size={18} aria-hidden /> My supplements
                </h2>
                <div className="dashboard-card dashboard-stack-empty">
                  <p className="dashboard-stack-empty-text">
                    You don&apos;t have a supplement plan saved yet. Add your results and build your stack from the analysis.
                  </p>
                  <Link href="/dashboard/plan#stack" className="dashboard-stack-link">
                    Build your stack →
                  </Link>
                </div>
              </section>
            )
          }
          const maxShow = 50
          const show = valid.slice(0, maxShow)
          const rest = valid.length - maxShow
          return (
            <section id="stack" className="dashboard-section" aria-labelledby="dashboard-plan-stack-heading">
              <h2 id="dashboard-plan-stack-heading" className="dashboard-section-title">
                <Package className="dashboard-section-title-icon" size={18} aria-hidden /> My supplements
              </h2>
              <div className="dashboard-stack-card dashboard-card">
                <p className="dashboard-stack-intro">
                  You&apos;re taking {valid.length} supplement{valid.length !== 1 ? "s" : ""} this month.
                </p>
                <ul className="dashboard-stack-list">
                  {show.map((item, i) => {
                    const affiliate = getAffiliateProductForStackItem(item)
                    const reorderUrl = affiliate?.affiliateUrl ?? getAmazonSearchUrl(item.supplementName)
                    const reorderLabel = affiliate ? "Reorder on Amazon" : "View on Amazon"
                    const detail = getSupplementDetail(item.marker, item.supplementName)
                    return (
                      <li key={`${item.supplementName}-${i}`} className="dashboard-stack-row">
                        {affiliate?.imageUrl && (
                          <img src={affiliate.imageUrl} alt="" className="dashboard-stack-row-img" width={48} height={48} />
                        )}
                        {!affiliate?.imageUrl && (
                          <div className="dashboard-stack-row-img dashboard-stack-row-img-placeholder" aria-hidden />
                        )}
                        <div className="dashboard-stack-row-body">
                          <div className="dashboard-stack-row-main">
                            <span className="dashboard-stack-item-name">{item.supplementName}</span>
                            {item.dose && <span className="dashboard-stack-item-dose">{item.dose}</span>}
                            {item.monthlyCost > 0 && <span className="dashboard-stack-item-cost">${item.monthlyCost.toFixed(0)}/mo</span>}
                          </div>
                          {detail && (detail.timing || detail.avoid) && (
                            <div className="dashboard-stack-detail">
                              {detail.timing && <span className="dashboard-stack-timing">{detail.timing}</span>}
                              {detail.avoid && <span className="dashboard-stack-avoid">Avoid: {detail.avoid}</span>}
                            </div>
                          )}
                          <a href={reorderUrl} target="_blank" rel="noopener noreferrer" className="dashboard-stack-reorder-btn">
                            {reorderLabel}
                          </a>
                        </div>
                      </li>
                    )
                  })}
                  {rest > 0 && <li className="dashboard-stack-more">+{rest} more</li>}
                </ul>
                <SupplementInventoryTracker
                  stack={valid}
                  userId={user?.id ?? null}
                  notifyDays={profile?.notify_reorder_days ?? 7}
                  onLowSupply={(items) => {
                    if (items.length === 0) return
                    const first = items[0]
                    notifications.show({
                      title: "Time to reorder",
                      message:
                        items.length === 1
                          ? `${first.name} runs out in ${first.daysLeft} day${first.daysLeft !== 1 ? "s" : ""}. Get it on Amazon to stay on track.`
                          : `${items.length} supplements running low — reorder on Amazon to avoid running out.`,
                      color: "yellow",
                      autoClose: 8000,
                      onClick: () => {
                        if (first?.reorderUrl) window.open(first.reorderUrl, "_blank")
                      },
                    })
                  }}
                />
                <p className="dashboard-stack-disclosure">{AFFILIATE_DISCLOSURE}</p>
                <p className="dashboard-stack-disclosure dashboard-stack-disclosure--secondary">{MONTHLY_COST_DISCLAIMER}</p>
                <Link href="/" className="dashboard-stack-link">
                  Open full analysis flow →
                </Link>
              </div>
            </section>
          )
        })()}

        {roadmap && analysisResults.length > 0 && (
          <section className="dashboard-section" aria-labelledby="dashboard-roadmap-heading">
            <h2 id="dashboard-roadmap-heading" className="dashboard-section-title">
              <TrendingUp className="dashboard-section-title-icon" size={18} aria-hidden /> Your roadmap
            </h2>
            <div className="dashboard-card dashboard-roadmap-card">
              <p className="dashboard-roadmap-phase">Phase: {roadmap.currentPhase.label}</p>
              <ul className="dashboard-roadmap-list">
                {roadmap.currentPhaseProgress.map(({ marker, status }) => (
                  <li key={marker} className="dashboard-roadmap-item">
                    <span className="dashboard-roadmap-marker">{marker}</span>
                    <span className={`dashboard-roadmap-status dashboard-roadmap-status-${status}`}>{status}</span>
                  </li>
                ))}
              </ul>
              {roadmap.nextPhase && <p className="dashboard-roadmap-next">Next: {roadmap.nextPhase.label}</p>}
            </div>
          </section>
        )}

        {scoreBreakdown && analysisResults.length > 0 && (
          <section className="dashboard-section" aria-labelledby="dashboard-score-breakdown-heading">
            <h2 id="dashboard-score-breakdown-heading" className="dashboard-section-title">
              <BarChart2 className="dashboard-section-title-icon" size={18} aria-hidden /> Score breakdown
            </h2>
            <div className="dashboard-card dashboard-score-breakdown-card">
              <div className="dashboard-score-breakdown-bars">
                {SCORE_CATEGORIES.map((cat) => {
                  const value = scoreBreakdown.breakdown[cat]
                  return (
                    <div key={cat} className="dashboard-score-breakdown-row">
                      <span className="dashboard-score-breakdown-label">{cat}</span>
                      <div className="dashboard-score-breakdown-bar-wrap">
                        <div className="dashboard-score-breakdown-bar" style={{ width: `${value}%` }} />
                      </div>
                      <span className="dashboard-score-breakdown-value">{value}</span>
                    </div>
                  )
                })}
              </div>
              {scoreDrivers.length > 0 && (
                <p className="dashboard-score-drivers-line">
                  <strong>Your score is limited by:</strong> {scoreDrivers.map((d) => d.label).join(", ")}
                </p>
              )}
              {improvementForecast && improvementForecast.projectedScore > improvementForecast.currentScore && (
                <p className="dashboard-score-forecast-line">
                  If {improvementForecast.markerName.toLowerCase()} improves
                  {improvementForecast.currentValue != null && improvementForecast.targetValue != null
                    ? ` from ${improvementForecast.currentValue} to ${improvementForecast.targetValue}`
                    : ""}
                  , your score could go {improvementForecast.currentScore} → {improvementForecast.projectedScore}.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="dashboard-section" aria-labelledby="dashboard-savings-heading">
          <h2 id="dashboard-savings-heading" className="dashboard-section-title">
            <DollarSign className="dashboard-section-title-icon" size={18} aria-hidden /> Savings snapshot
          </h2>
          {userCurrentSpend === 0 && (
            <p className="dashboard-savings-nudge">
              <Link href="/settings" className="dashboard-savings-nudge-link">
                Add your supplement spend in Settings
              </Link>{" "}
              to see potential savings.
            </p>
          )}
          {userCurrentSpend > 0 && monthlySavings > 0 && (
            <p className="dashboard-savings-highlight">You could save ${annualSavings.toFixed(0)}/year with your optimized plan.</p>
          )}
          <div className="dashboard-savings-grid-new">
            <div className="dashboard-card dashboard-savings-card">
              <span className="dashboard-savings-label">Current spend</span>
              <div className="dashboard-savings-value">${userCurrentSpend.toFixed(0)}/mo</div>
            </div>
            <div className="dashboard-card dashboard-savings-card">
              <span className="dashboard-savings-label">Optimized spend</span>
              <div className="dashboard-savings-value highlight">${optimizedSpend.toFixed(0)}/mo</div>
            </div>
            <div className="dashboard-card dashboard-savings-card success">
              <span className="dashboard-savings-label">Monthly savings</span>
              <div className="dashboard-savings-value">${Math.max(0, monthlySavings).toFixed(0)}</div>
            </div>
            <div className="dashboard-card dashboard-savings-card success">
              <span className="dashboard-savings-label">Annual savings</span>
              <div className="dashboard-savings-value">${annualSavings.toFixed(0)}</div>
            </div>
          </div>
        </section>

        <section id="retest" className="dashboard-section" aria-labelledby="dashboard-retest-heading">
          <h2 id="dashboard-retest-heading" className="dashboard-section-title">
            <CalendarCheck className="dashboard-section-title-icon" size={18} aria-hidden /> Retest reminder
          </h2>
          <div className="dashboard-card dashboard-retest-card">
            {retestCountdown && (
              <p className="dashboard-retest-countdown">
                {retestCountdown.type === "until"
                  ? `Your retest window opens in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}.`
                  : `Suggested retest was ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""} ago.`}
              </p>
            )}
            {(retestCountdown?.type === "until" || retestCountdown?.type === "overdue") && (
              <div className="dashboard-retest-primary-cta-wrap">
                <Link href="/?step=labs" className="dashboard-cta dashboard-retest-cta">
                  Add new results
                </Link>
              </div>
            )}
            {retestCountdown && retestCountdown.type === "until" && lastBloodworkAt && (
              <p className="dashboard-retest-cta-line">
                <a href="/settings" className="dashboard-retest-cta-link">
                  Remind me
                </a>
                {" · "}
                <a
                  href={(() => {
                    const due = new Date(lastBloodworkAt)
                    due.setDate(due.getDate() + (profile?.retest_weeks ?? 8) * 7)
                    const start = due.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
                    const end = new Date(due.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
                    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Clarion+retest+due&dates=${start}/${end}`
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-retest-cta-link"
                >
                  Add to calendar
                </a>
              </p>
            )}
            {retestRecommendations.length > 0 ? (
              <ul className="dashboard-retest-list">
                {retestRecommendations.slice(0, 12).map((rec, idx) => (
                  <li key={`${rec.marker}-${idx}`}>
                    <span className="dashboard-retest-marker">{rec.marker}</span>
                    <span className="dashboard-retest-timing">{rec.timing}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard-retest-empty">
                <span className="dashboard-retest-empty-icon" aria-hidden>
                  ↻
                </span>
                <p className="dashboard-card-muted">Complete a panel to see when to retest each biomarker.</p>
              </div>
            )}
            {!retestCountdown && (
              <Link href="/?step=labs" className="dashboard-cta dashboard-retest-cta">
                Upload new labs
              </Link>
            )}
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="dashboard-saved-plan-heading">
          <h2 id="dashboard-saved-plan-heading" className="dashboard-section-title">
            <Bookmark className="dashboard-section-title-icon" size={18} aria-hidden /> Saved plan
          </h2>
          <div className="dashboard-card dashboard-saved-plan-card">
            <p className="dashboard-card-muted">Your plan and insights are saved.</p>
            <div className="dashboard-saved-plan-links">
              <Link href="/results/insights" className="dashboard-saved-plan-link">
                Biomarker insights
              </Link>
              <Link href="/results/stack" className="dashboard-saved-plan-link">
                Supplement plan
              </Link>
              <Link href="/?step=survey" className="dashboard-saved-plan-link">
                Open onboarding (full survey)
              </Link>
            </div>
            <div className="dashboard-saved-plan-share-row">
              <button
                type="button"
                className="dashboard-saved-plan-link dashboard-saved-plan-share-btn"
                onClick={() => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/results/insights` : ""
                  if (url && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(() => {
                      notifications.show({ message: "Link copied to clipboard", color: "green" })
                    }).catch(() => {})
                  }
                }}
              >
                Share plan
              </button>
              <button
                type="button"
                className="dashboard-saved-plan-link dashboard-saved-plan-share-btn"
                onClick={() => {
                  if (typeof window === "undefined") return
                  const planUrl = `${window.location.origin}/results/insights`
                  const mailto = `mailto:?subject=${encodeURIComponent("My Clarion health plan")}&body=${encodeURIComponent(`View my health plan and biomarker insights: ${planUrl}`)}`
                  window.location.href = mailto
                }}
              >
                Send to doctor
              </button>
            </div>
          </div>
        </section>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
          {" · "}
          <Link href="/dashboard/trends">Trends</Link>
        </p>
      </div>
    </main>
  )
}
