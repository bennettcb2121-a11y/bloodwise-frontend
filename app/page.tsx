"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import BiomarkerGauge from "@/src/components/BiomarkerGauge"
import { AuthUI } from "@/src/components/AuthUI"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile, saveBloodwork, getBloodworkHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { calculateScore } from "@/src/lib/calculateScore"
import { supplementRecommendations } from "@/src/lib/supplements"
import { optimizeStack } from "@/src/lib/stackOptimizer"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import { scoreToLabel, countByStatus } from "@/src/lib/scoreEngine"
import {
  getBiomarkerKeys,
  getAdaptiveRecommendedMarkers,
  getMarkerReason,
  getInputPlaceholder,
  getActivePanel,
  getEnteredBiomarkers,
  hasEnoughLabs,
  normalize,
  titleCase,
  type ProfileState,
} from "@/src/lib/panelEngine"
import { computeSavings } from "@/src/lib/savingsEngine"
import {
  getStatusTone,
  buildTopFocus,
  inferWhyItMatters,
  inferNextStep,
  getPrioritySummary,
} from "@/src/lib/priorityEngine"
import { detectPatterns } from "@/src/lib/patternEngine"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"

type BiomarkerInputMap = Record<string, string | number>

type AnalysisResult = {
  name?: string
  marker?: string
  value?: number
  optimalMin?: number | null
  optimalMax?: number | null
  status?: string
  description?: string
  whyItMatters?: string
  foods?: string
  lifestyle?: string
  supplementNotes?: string
  retest?: string
  recommendedTests?: string[]
  researchSummary?: string
  [key: string]: any
}

type ProgressStep = {
  id: number
  label: string
  unlocked: boolean
  active: boolean
  done: boolean
}

const SEX_OPTIONS = ["Male", "Female"]
const SPORT_OPTIONS = ["Endurance", "Strength", "Hybrid", "General health"]
const GOAL_OPTIONS = ["Performance optimization", "Recovery", "Energy", "General wellness"]
const SHOPPING_OPTIONS = ["Best value", "Balanced", "Premium brands"]

function StepBadge({ children }: { children: React.ReactNode }) {
  return <div className="step-badge">{children}</div>
}

function SectionTitle({
  step,
  title,
  subtitle,
}: {
  step: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="section-title">
      <StepBadge>{step}</StepBadge>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  )
}

export default function Page() {
  const { user } = useAuth()
  const hasLoadedSaveRef = useRef(false)
  const biomarkerKeys = useMemo(() => getBiomarkerKeys(), [])

  const [profile, setProfile] = useState<ProfileState>({
    age: "",
    sex: "",
    sport: "",
    goal: "",
  })

  const [inputs, setInputs] = useState<BiomarkerInputMap>(() => {
    const initial: BiomarkerInputMap = {}
    biomarkerKeys.forEach((key) => {
      initial[key] = ""
    })
    return initial
  })

  const [currentSupplementSpend, setCurrentSupplementSpend] = useState("")
  const [currentSupplements, setCurrentSupplements] = useState("")
  const [shoppingPreference, setShoppingPreference] = useState("Best value")
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPanel, setSelectedPanel] = useState<string[]>([])
  const [hasLoadedExample, setHasLoadedExample] = useState(false)
  const [openScienceMarkers, setOpenScienceMarkers] = useState<Record<string, boolean>>({})
  const [openCompareCards, setOpenCompareCards] = useState<Record<string, boolean>>({})
  const [previousReports, setPreviousReports] = useState<BloodworkSaveRow[]>([])
  const [previousReportsLoading, setPreviousReportsLoading] = useState(false)
  const [lastBloodworkAt, setLastBloodworkAt] = useState<string | null>(null)
  const [retestWeeks, setRetestWeeks] = useState(8)
  const [analyzing, setAnalyzing] = useState(false)

  const isProfileReady =
    profile.age.trim() !== "" &&
    profile.sex.trim() !== "" &&
    profile.sport.trim() !== "" &&
    profile.goal.trim() !== ""

  const recommendedMarkers = useMemo(() => {
    if (!isProfileReady) return []
    return getAdaptiveRecommendedMarkers(profile, biomarkerKeys)
  }, [profile, biomarkerKeys, isProfileReady])

  useEffect(() => {
    if (isProfileReady && currentStep === 1) {
      setCurrentStep(2)
    }
  }, [isProfileReady, currentStep])

  useEffect(() => {
    if (recommendedMarkers.length && selectedPanel.length === 0) {
      setSelectedPanel(recommendedMarkers)
    }
  }, [recommendedMarkers, selectedPanel.length])

  const activePanel = useMemo(
    () => getActivePanel(selectedPanel, recommendedMarkers),
    [selectedPanel, recommendedMarkers]
  )

  const enteredBiomarkers = useMemo(
    () => getEnteredBiomarkers(activePanel, inputs),
    [inputs, activePanel]
  )

  const enteredCount = Object.keys(enteredBiomarkers).length
  const hasEnoughLabsFlag = hasEnoughLabs(enteredCount, activePanel.length)

  const analysisResults = useMemo(() => {
    try {
      const analysisProfile = {
        ...(profile.age.trim() ? { age: Number(profile.age) } : {}),
        ...(profile.sex.trim() ? { sex: profile.sex } : {}),
        ...(profile.sport.trim() ? { sport: profile.sport } : {}),
        ...(profile.goal.trim() ? { goal: profile.goal } : {}),
      }

      return analyzeBiomarkers(
        enteredBiomarkers,
        analysisProfile as any
      ) as AnalysisResult[]
    } catch {
      return [] as AnalysisResult[]
    }
  }, [enteredBiomarkers, profile])

  const score = useMemo(() => {
    if (!analysisResults.length) return 0
    try {
      return calculateScore(analysisResults as any) || 0
    } catch {
      return 0
    }
  }, [analysisResults])

  const topFocus = useMemo(() => buildTopFocus(analysisResults), [analysisResults])

  const supplementRecs = useMemo(() => {
    try {
      return supplementRecommendations(analysisResults as any) || []
    } catch {
      return []
    }
  }, [analysisResults])

  const optimizedStack = useMemo(() => {
    try {
      return optimizeStack(supplementRecs as any)
    } catch {
      return {
        stack: [],
        totalMonthlyCost: 0,
        totalUniqueSupplements: 0,
        savingsVsHighestPotency: 0,
        cheapestPlanMonthlyCost: 0,
        highestPotencyPlanMonthlyCost: 0,
      }
    }
  }, [supplementRecs])

  const statusCounts = useMemo(() => countByStatus(analysisResults), [analysisResults])

  const savings = useMemo(
    () => computeSavings(Number(currentSupplementSpend || 0), optimizedStack),
    [currentSupplementSpend, optimizedStack]
  )
  const { userCurrentSpend, optimizedSpend, estimatedSavingsVsCurrent, annualSavings } = savings

  const prioritySummary = useMemo(
    () => getPrioritySummary(analysisResults, topFocus),
    [analysisResults, topFocus]
  )
  const { biggestDrag, strongestMarker, nextBestAction } = prioritySummary

  const detectedPatterns = useMemo(
    () => detectPatterns(analysisResults as any),
    [analysisResults]
  )

  const retestRecommendations = useMemo(
    () => getRetestRecommendations(analysisResults as any),
    [analysisResults]
  )

  const bloodwiseSummary = useMemo(
    () =>
      getBloodwiseSummary({
        analysisResults,
        score,
        statusCounts,
        topFocus,
        prioritySummary,
        detectedPatterns,
      }),
    [analysisResults, score, statusCounts, topFocus, prioritySummary, detectedPatterns]
  )

  const hasResults = analysisResults.length > 0
  const hasSupplements = Boolean(optimizedStack.stack?.length)

  const userId = user?.id ?? null

  const isDueForRetest = useMemo(() => {
    if (!lastBloodworkAt || !retestWeeks) return false
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    return Date.now() - last >= weeksMs
  }, [lastBloodworkAt, retestWeeks])

  // On login: load saved profile and bloodwork from Supabase and populate form fields
  const loadDeps: [string | null] = [userId]
  useEffect(() => {
    if (!userId || hasLoadedSaveRef.current) return
    hasLoadedSaveRef.current = true
    loadSavedState(userId)
      .then(({ profile: p, bloodwork: b }) => {
        if (p) {
          setProfile({
            age: p.age ?? "",
            sex: p.sex ?? "",
            sport: p.sport ?? "",
            goal: p.goal ?? "",
          })
          setCurrentSupplementSpend(p.current_supplement_spend ?? "")
          setCurrentSupplements(p.current_supplements ?? "")
          setShoppingPreference(p.shopping_preference ?? "Best value")
          setRetestWeeks(p.retest_weeks ?? 8)
          // Keep profile email in sync for retest reminder emails
          if (user?.email && p.email !== user.email) {
            upsertProfile(userId, {
              age: p.age ?? "",
              sex: p.sex ?? "",
              sport: p.sport ?? "",
              goal: p.goal ?? "",
              current_supplement_spend: p.current_supplement_spend ?? "",
              current_supplements: p.current_supplements ?? "",
              shopping_preference: p.shopping_preference ?? "Best value",
              email: user.email,
              phone: p.phone ?? undefined,
              retest_weeks: p.retest_weeks ?? 8,
            }).catch(() => {})
          }
        } else {
          // Ensure every signed-in user has a profile row so their data can be saved (include email for retest reminders)
          upsertProfile(userId, {
            age: "",
            sex: "",
            sport: "",
            goal: "",
            current_supplement_spend: "",
            current_supplements: "",
            shopping_preference: "Best value",
            email: user?.email ?? undefined,
            retest_weeks: 8,
          }).catch(() => {})
        }
        if (b) {
          setLastBloodworkAt(b.updated_at ?? b.created_at ?? null)
          if (Array.isArray(b.selected_panel) && b.selected_panel.length > 0) {
            setSelectedPanel(b.selected_panel)
          }
          if (b.biomarker_inputs && typeof b.biomarker_inputs === "object") {
            setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
          }
          if (typeof b.current_step === "number" && b.current_step >= 1 && b.current_step <= 6) {
            setCurrentStep(b.current_step)
          }
        } else {
          setLastBloodworkAt(null)
        }
      })
      .catch(() => {})
  }, loadDeps)

  // Reset load flag and retest state when user logs out
  const resetDeps: [string | null] = [userId]
  useEffect(() => {
    if (!userId) {
      hasLoadedSaveRef.current = false
      setLastBloodworkAt(null)
      setRetestWeeks(8)
    }
  }, resetDeps)

  // Fetch previous reports for logged-in users (Previous Reports section)
  const prevReportsDeps: [string | null] = [userId]
  useEffect(() => {
    if (!userId) {
      setPreviousReports([])
      return
    }
    setPreviousReportsLoading(true)
    getBloodworkHistory(userId)
      .then((list) => setPreviousReports(list))
      .catch(() => setPreviousReports([]))
      .finally(() => setPreviousReportsLoading(false))
  }, prevReportsDeps)

  // Save profile when user and profile/habits change (debounced). Tuple ensures deps array length is always 8.
  const saveProfileRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileDeps: [
    string | null,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] = [
    userId,
    profile.age,
    profile.sex,
    profile.sport,
    profile.goal,
    currentSupplementSpend,
    currentSupplements,
    shoppingPreference,
  ]
  useEffect(() => {
    if (!userId) return
    // Only create/update profile when user has entered at least one profile field (avoids empty row before load; creates row on first save)
    const hasProfileData =
      profile.age.trim() !== "" ||
      profile.sex.trim() !== "" ||
      profile.sport.trim() !== "" ||
      profile.goal.trim() !== ""
    if (!hasProfileData) return
    saveProfileRef.current = setTimeout(() => {
      upsertProfile(userId, {
        age: profile.age,
        sex: profile.sex,
        sport: profile.sport,
        goal: profile.goal,
        current_supplement_spend: currentSupplementSpend,
        current_supplements: currentSupplements,
        shopping_preference: shoppingPreference,
      }).catch(() => {})
    }, 800)
    return () => {
      if (saveProfileRef.current) clearTimeout(saveProfileRef.current)
    }
  }, profileDeps)

  // Save bloodwork panel to Supabase when user reaches step 5 or 6 (associated with logged-in user)
  const lastSavedStepRef = useRef(0)
  const bloodworkSaveDeps: [string | null, number] = [userId, currentStep]
  useEffect(() => {
    if (!userId || currentStep < 5) return
    if (currentStep === lastSavedStepRef.current) return
    lastSavedStepRef.current = currentStep
    const keyFlagged = analysisResults.filter((r) => r.status !== "optimal").map((r) => r.name).filter((n): n is string => Boolean(n))
    saveBloodwork(userId, {
      selected_panel: activePanel,
      biomarker_inputs: inputs,
      current_step: currentStep,
      score,
      detected_patterns: detectedPatterns.map((p) => ({
        title: p.title,
        explanation: p.explanation,
        focusActions: p.focusActions,
        significance: p.significance,
        markers: p.markers,
      })),
      key_flagged_biomarkers: keyFlagged,
      stack_snapshot: hasSupplements
        ? {
            stack: optimizedStack.stack.map((rec: any): SavedSupplementStackItem => ({
              supplementName: rec.name ?? "",
              dose: rec.dose ?? "",
              monthlyCost: Number(rec.estimatedMonthlyCost) || 0,
              recommendationType: rec.recommendationType ?? "Core",
              reason: rec.whyThisIsRecommended ?? rec.whyRecommended ?? "",
            })),
            totalMonthlyCost: optimizedStack.totalMonthlyCost,
          }
        : { stack: [], totalMonthlyCost: 0 },
      savings_snapshot: {
        userCurrentSpend,
        optimizedSpend,
        estimatedSavingsVsCurrent,
        annualSavings,
        monthlySavings: optimizedSpend,
      },
    }).catch(() => {})
  }, bloodworkSaveDeps)

  const progressSteps: ProgressStep[] = [
    { id: 1, label: "Profile", unlocked: true, active: currentStep === 1, done: currentStep > 1 },
    { id: 2, label: "Habits", unlocked: isProfileReady, active: currentStep === 2, done: currentStep > 2 },
    { id: 3, label: "Panel", unlocked: currentStep >= 2, active: currentStep === 3, done: currentStep > 3 },
    { id: 4, label: "Labs", unlocked: activePanel.length > 0, active: currentStep === 4, done: currentStep > 4 },
    { id: 5, label: "Results", unlocked: hasEnoughLabsFlag, active: currentStep === 5, done: currentStep > 5 },
    { id: 6, label: "Stack", unlocked: hasResults, active: currentStep === 6, done: currentStep > 6 },
  ]

  function handleProfileChange(field: keyof ProfileState, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  function handleInputChange(key: string, value: string) {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function togglePanelMarker(marker: string) {
    setSelectedPanel((prev) =>
      prev.includes(marker) ? prev.filter((m) => m !== marker) : [...prev, marker]
    )
  }

  function useRecommendedPanel() {
    setSelectedPanel(recommendedMarkers)
    setCurrentStep(4)
  }

  function loadExampleData() {
    const demo: BiomarkerInputMap = {
      Ferritin: 22,
      "Vitamin D": 19,
      Magnesium: 1.8,
      "Vitamin B12": 310,
      CRP: 3.2,
      Testosterone: 490,
    }

    const next = { ...inputs }
    activePanel.forEach((key) => {
      next[key] = demo[key] ?? ""
    })

    setInputs(next)
    setHasLoadedExample(true)
  }

  function handleOpenReport(save: BloodworkSaveRow) {
    if (save.biomarker_inputs && typeof save.biomarker_inputs === "object") {
      setInputs((prev) => ({ ...prev, ...save.biomarker_inputs }))
    }
    if (Array.isArray(save.selected_panel) && save.selected_panel.length > 0) {
      setSelectedPanel(save.selected_panel)
    }
    const step = typeof save.current_step === "number" && save.current_step >= 1 && save.current_step <= 6 ? save.current_step : 5
    setCurrentStep(step)
  }

  function toggleScience(marker: string) {
    setOpenScienceMarkers((prev) => ({ ...prev, [marker]: !prev[marker] }))
  }

  function toggleCompare(key: string) {
    setOpenCompareCards((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <main className="bw-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />
      <div className="grid-glow" />

      <AnimatePresence>
        {analyzing && (
          <motion.div
            className="journey-analysis-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="journey-analysis-card"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="journey-analysis-dots"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <span /><span /><span />
              </motion.div>
              <h2 className="journey-analysis-title">Analyzing your results</h2>
              <p className="journey-analysis-subtitle">We’re interpreting your panel and building your personalized insights.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bw-container">
        {currentStep > 1 ? (
        <div className="journey-progress-bar">
          {progressSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`journey-progress-dot ${step.unlocked ? "unlocked" : ""} ${step.active ? "active" : ""} ${step.done ? "done" : ""}`}
              onClick={() => step.unlocked && setCurrentStep(step.id)}
              aria-label={`Step ${step.id}: ${step.label}`}
              disabled={!step.unlocked}
            >
              <span className="journey-progress-dot-inner">{step.id}</span>
            </button>
          ))}
          <div className="journey-progress-labels">
            {progressSteps.map((step) => (
              <span key={step.id} className={`journey-progress-label ${step.active ? "active" : ""} ${step.done ? "done" : ""}`}>
                {step.label}
              </span>
            ))}
          </div>
        </div>
        ) : null}

        <section className="hero-card">
          <div className="hero-topline">
            <div className="brand-pill brand-pill-large">CLARION LABS</div>
            <div className="hero-topline-right">
              {userId ? (
                <>
                  <SubscribeButton className="hero-dashboard-link hero-subscribe-btn">
                    Subscribe
                  </SubscribeButton>
                  <Link href="/dashboard" className="hero-dashboard-link">
                    Dashboard
                  </Link>
                </>
              ) : null}
              <AuthUI />
            </div>
          </div>

          <div className="hero-copy">
            <h1>Decode your blood. Optimize your health.</h1>
            <p>
              Feel good and save money.
            </p>
          </div>

          {userId && isDueForRetest && (
            <div className="retest-reminder-banner">
              <span className="retest-reminder-text">It’s been {retestWeeks}+ weeks since your last panel. Time to retest?</span>
              <Link href="/#step-1" className="retest-reminder-cta">Add new results</Link>
            </div>
          )}

          {userId ? (
            <div className="subscribe-section">
              <div className="subscribe-card">
                <h3 className="subscribe-title">Subscribe to Clarion Labs</h3>
                <p className="subscribe-desc">Full access to insights, optimized stacks, and retest reminders. Cancel anytime.</p>
                <SubscribeButton className="subscribe-btn">Subscribe — monthly</SubscribeButton>
              </div>
            </div>
          ) : null}

          {userId && lastBloodworkAt ? (
            <div className="retest-status-section">
              <div className="retest-status-card">
                <span className="retest-status-label">Retest reminders</span>
                <p className="retest-status-text">
                  {isDueForRetest
                    ? `It's been ${retestWeeks}+ weeks since your last panel. We'll email you too.`
                    : `Last panel saved. We'll remind you in ${retestWeeks} weeks (email + in-app).`}
                </p>
                <Link href="/dashboard" className="retest-status-link">Set reminder preferences →</Link>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
          <div className="hero-grid">
            <div className="glass-card hero-score-card">
              <div className="mini-heading">Health score</div>

              {hasResults ? (
                <>
                  <div className="score-row">
                    <div className="score-number">{score}</div>
                    <div className="score-label">{scoreToLabel(score)}</div>
                  </div>

                  <div className="stats-grid">
                    <div className="stat-chip green">
                      <span>Optimal</span>
                      <strong>{statusCounts.optimal}</strong>
                    </div>
                    <div className="stat-chip amber">
                      <span>Borderline</span>
                      <strong>{statusCounts.borderline}</strong>
                    </div>
                    <div className="stat-chip red">
                      <span>Flagged</span>
                      <strong>{statusCounts.flagged}</strong>
                    </div>
                  </div>

                  <div className="hero-mini-summary">
                    <div className="mini-summary-card">
                      <span>Biggest drag</span>
                      <strong>{biggestDrag}</strong>
                    </div>
                    <div className="mini-summary-card">
                      <span>Strongest marker</span>
                      <strong>{strongestMarker}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="awaiting-state">
                  <div className="awaiting-title">Awaiting labs</div>
                  <div className="awaiting-copy">
                    Complete your profile and recommended panel first. Clarion Labs should not pretend to have a result before the journey starts.
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card hero-context-card">
              <div className="mini-heading">Step 1 — choose profile</div>

              <div className="field-grid">
                <label className="field">
                  <span>Age</span>
                  <input
                    value={profile.age}
                    onChange={(e) => handleProfileChange("age", e.target.value)}
                    placeholder="19"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="option-group">
                <div className="option-label">Sex</div>
                <div className="pill-row">
                  {SEX_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`choice-pill ${profile.sex === option ? "active" : ""}`}
                      onClick={() => handleProfileChange("sex", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">Sport</div>
                <div className="pill-row">
                  {SPORT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`choice-pill ${profile.sport === option ? "active" : ""}`}
                      onClick={() => handleProfileChange("sport", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">Goal</div>
                <div className="pill-row">
                  {GOAL_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`choice-pill ${profile.goal === option ? "active" : ""}`}
                      onClick={() => handleProfileChange("goal", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hero-footer-note">
                Clarion Labs branches based on who the user is before deciding what to recommend.
              </div>
              <div className="journey-step-actions">
                <button
                  type="button"
                  className="primary-cta"
                  disabled={!isProfileReady}
                  onClick={() => setCurrentStep(2)}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
          ) : null}
        </section>

        {userId ? (
          <section className="flow-section previous-reports-section">
            <h3 className="previous-reports-title">Previous Reports</h3>
            <p className="previous-reports-subtitle">
              Open a saved report to load its biomarker values and view results.
            </p>
            {previousReportsLoading ? (
              <div className="previous-reports-loading">Loading reports…</div>
            ) : previousReports.length === 0 ? (
              <div className="glass-card previous-reports-empty">
                No saved reports yet. Complete the flow to step 5 or 6 to save a report.
              </div>
            ) : (
              <div className="previous-reports-grid">
                {previousReports.map((report) => (
                  <div key={report.id ?? report.created_at ?? Math.random()} className="glass-card previous-report-card">
                    <div className="previous-report-date">
                      {report.created_at
                        ? new Date(report.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="previous-report-score">
                      <span className="previous-report-score-label">Score</span>
                      <strong className="previous-report-score-value">{report.score ?? "—"}</strong>
                    </div>
                    <div className="previous-report-flagged">
                      <span className="previous-report-flagged-label">Flagged biomarkers</span>
                      {report.key_flagged_biomarkers && report.key_flagged_biomarkers.length > 0 ? (
                        <span className="previous-report-flagged-list">
                          {report.key_flagged_biomarkers.join(", ")}
                        </span>
                      ) : (
                        <span className="previous-report-flagged-none">None</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="previous-report-open-btn"
                      onClick={() => handleOpenReport(report)}
                    >
                      Open report
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {currentStep === 2 && (
          <section className="flow-section journey-step-section">
            <button type="button" className="journey-back-btn" onClick={() => setCurrentStep(1)}>← Back</button>
            <SectionTitle
              step="Step 2"
              title="What are you spending on supplements now?"
              subtitle="Use your current monthly supplement spend as the baseline for Clarion Labs savings and optimization."
            />

            <div className="flow-grid">
              <div className="glass-card">
                <div className="mini-heading">Current supplement habits</div>

                <div className="field-grid">
                  <label className="field">
                    <span>Current monthly supplement spend</span>
                    <input
                      value={currentSupplementSpend}
                      onChange={(e) => setCurrentSupplementSpend(e.target.value)}
                      placeholder="e.g. 65"
                      inputMode="decimal"
                    />
                  </label>

                  <label className="field">
                    <span>What do you currently take? (optional)</span>
                    <input
                      value={currentSupplements}
                      onChange={(e) => setCurrentSupplements(e.target.value)}
                      placeholder="Fish oil, magnesium, vitamin D..."
                    />
                  </label>
                </div>

                <div className="option-group">
                  <div className="option-label">Shopping preference</div>
                  <div className="pill-row">
                    {SHOPPING_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`choice-pill ${shoppingPreference === option ? "active" : ""}`}
                        onClick={() => setShoppingPreference(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div className="mini-heading">Savings preview</div>

                <div className="economics-grid">
                  <div className="economics-card dark">
                    <span>Your current spend</span>
                    <strong>${Number(currentSupplementSpend || 0).toFixed(2)}/mo</strong>
                  </div>

                  <div className="economics-card blue">
                    <span>Potential optimized spend</span>
                    <strong>${optimizedSpend.toFixed(2)}/mo</strong>
                  </div>

                  <div className="economics-card green">
                    <span>Possible annual savings</span>
                    <strong>${annualSavings.toFixed(2)}/yr</strong>
                  </div>
                </div>

                <div className="panel-summary">
                  <div className="panel-summary-title">Why this matters</div>
                  <div className="panel-summary-body">
                    Clarion Labs becomes much easier to trust when it compares your current routine against a cleaner, evidence-supported stack.
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="primary-cta"
                    onClick={() => setCurrentStep(3)}
                    disabled={!isProfileReady}
                  >
                    Continue to recommended panel
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="flow-section journey-step-section">
            <button type="button" className="journey-back-btn" onClick={() => setCurrentStep(2)}>← Back</button>
            <SectionTitle
              step="Step 3"
              title="Start with the right panel"
              subtitle="Now that the profile is known, Clarion Labs can recommend the biomarkers that matter most first."
            />

            <div className="flow-grid">
              <div className="glass-card">
                <div className="mini-heading">Recommended for this profile</div>

                <div className="recommend-chip-wrap">
                  {recommendedMarkers.map((marker) => (
                    <div key={marker} className="recommend-chip">
                      {titleCase(marker)}
                    </div>
                  ))}
                </div>

                <div className="reason-list">
                  {recommendedMarkers.map((marker) => (
                    <div key={marker} className="reason-card">
                      <div className="reason-title">{titleCase(marker)}</div>
                      <div className="reason-body">{getMarkerReason(marker, profile)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card">
                <div className="mini-heading">Customize panel</div>

                <div className="pill-row">
                  {biomarkerKeys.map((marker) => (
                    <button
                      key={marker}
                      type="button"
                      className={`choice-pill ${activePanel.includes(marker) ? "active" : ""}`}
                      onClick={() => togglePanelMarker(marker)}
                    >
                      {titleCase(marker)}
                    </button>
                  ))}
                </div>

                <div className="panel-summary">
                  <div className="panel-summary-title">Active panel</div>
                  <div className="panel-summary-body">
                    {activePanel.length
                      ? activePanel.map(titleCase).join(" • ")
                      : "Choose at least one biomarker."}
                  </div>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="primary-cta"
                    onClick={useRecommendedPanel}
                    disabled={!recommendedMarkers.length}
                  >
                    Use recommended panel
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {currentStep === 4 && (
          <section className="flow-section journey-step-section">
            <button type="button" className="journey-back-btn" onClick={() => setCurrentStep(3)}>← Back</button>
            <SectionTitle
              step="Step 4"
              title="Enter results for the selected panel"
              subtitle="Only the active panel should be shown here. This keeps the flow focused and adaptive."
            />

            <div className="glass-card">
              <div className="input-stack">
                {activePanel.map((key) => (
                  <div className="biomarker-input-card" key={key}>
                    <div className="biomarker-copy">
                      <div className="biomarker-title">{titleCase(key)}</div>
                      <div className="biomarker-desc">
                        {biomarkerDatabase?.[key]?.description || "Enter your measured lab value."}
                      </div>
                    </div>

                    <input
                      value={String(inputs[key] ?? "")}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={getInputPlaceholder(key)}
                      inputMode="decimal"
                      className="number-input"
                    />
                  </div>
                ))}
              </div>

              <div className="button-row">
                <button type="button" className="ghost-button" onClick={loadExampleData}>
                  {hasLoadedExample ? "Reload example panel" : "Load example panel"}
                </button>

                <button
                  type="button"
                  className="primary-cta"
                  disabled={!hasEnoughLabsFlag}
                  onClick={() => {
                    if (hasEnoughLabsFlag) {
                      setAnalyzing(true)
                      setTimeout(() => {
                        setCurrentStep(5)
                        setAnalyzing(false)
                      }, 2600)
                    }
                  }}
                >
                  Analyze panel
                </button>
              </div>
            </div>
          </section>
        )}

        {currentStep === 5 && (
          <section className="flow-section journey-step-section">
            <button type="button" className="journey-back-btn" onClick={() => setCurrentStep(4)}>← Back</button>
            <SectionTitle
              step="Step 5"
              title="See what matters most"
              subtitle="Once results exist, reward the user immediately with the snapshot, top priorities, and a clear next action."
            />

            {!hasResults ? (
              <div className="glass-card empty-card">
                Clarion Labs could not generate results from the current panel.
              </div>
            ) : (
              <>
                <div className="snapshot-grid">
                  <div className="glass-card snapshot-main">
                    <div className="mini-heading">Health snapshot</div>
                    <div className="snapshot-score-row">
                      <div className="snapshot-score">{score}</div>
                      <div className="snapshot-label">{scoreToLabel(score)}</div>
                    </div>

                    <p className="snapshot-copy">
                      {topFocus.length
                        ? `You have ${topFocus.length} priority area${topFocus.length > 1 ? "s" : ""} to focus on right now.`
                        : "Most entered biomarkers look solid right now. Keep monitoring and retest on schedule."}
                    </p>

                    <div className="stats-grid stats-grid-4">
                      <div className="stat-chip green">
                        <span>Optimal</span>
                        <strong>{statusCounts.optimal}</strong>
                      </div>
                      <div className="stat-chip amber">
                        <span>Borderline</span>
                        <strong>{statusCounts.borderline}</strong>
                      </div>
                      <div className="stat-chip red">
                        <span>Flagged</span>
                        <strong>{statusCounts.flagged}</strong>
                      </div>
                      <div className="stat-chip blue">
                        <span>Supplements</span>
                        <strong>{optimizedStack.totalUniqueSupplements || 0}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card retest-card">
                    <div className="mini-heading">Next retest</div>
                    <div className="retest-number">8–12 weeks</div>
                    <div className="retest-copy">
                      Best for seeing whether your action plan actually moved the needle.
                    </div>

                    <div className="hero-mini-summary retest-insights">
                      <div className="mini-summary-card">
                        <span>Biggest drag</span>
                        <strong>{biggestDrag}</strong>
                      </div>
                      <div className="mini-summary-card">
                        <span>Best next action</span>
                        <strong>{nextBestAction}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {retestRecommendations.length > 0 ? (
                  <div className="retest-recommendations-section">
                    <h3 className="retest-recommendations-title">Retest recommendations</h3>
                    <p className="retest-recommendations-subtitle">
                      When to retest each biomarker and why that timing is suggested.
                    </p>
                    <div className="retest-recommendations-list">
                      {retestRecommendations.map((rec, idx) => (
                        <div className="glass-card retest-recommendation-card" key={`${rec.marker}-${idx}`}>
                          <div className="retest-recommendation-header">
                            <span className="retest-recommendation-marker">{rec.marker}</span>
                            <span className="retest-recommendation-timing">{rec.timing}</span>
                          </div>
                          <p className="retest-recommendation-explanation">{rec.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="priority-cards">
                  {!topFocus.length ? (
                    <div className="glass-card empty-card">
                      No major priorities surfaced yet from the current panel.
                    </div>
                  ) : (
                    topFocus.map((item, index) => {
                      const marker = String(item.name || item.marker || "Biomarker")
                      const tone = getStatusTone(item.status)

                      return (
                        <div className="glass-card priority-focus-card" key={`${marker}-${index}`}>
                          <div className="priority-card-top">
                            <div>
                              <div className="priority-kicker">Priority {index + 1}</div>
                              <div className="priority-title">{marker}</div>
                            </div>

                            <div className={`status-chip ${tone.className}`}>
                              <span>{tone.icon}</span>
                              <span>{tone.label}</span>
                            </div>
                          </div>

                          <div className="priority-value">{item.value ?? "—"}</div>
                          <div className="priority-copy">
                            <strong>Why:</strong> {item.whyItMatters || inferWhyItMatters(marker)}
                          </div>
                          <div className="priority-copy">
                            <strong>Next:</strong> {inferNextStep(marker, item.status)}
                          </div>

                          <button
                            type="button"
                            className="ghost-button slim"
                            onClick={() => toggleScience(marker)}
                          >
                            {openScienceMarkers[marker] ? "Hide science" : "View science"}
                          </button>

                          {openScienceMarkers[marker] ? (
                            <div className="science-drawer">
                              {item.researchSummary ? (
                                <div className="science-block">
                                  <span>Science</span>
                                  <p>{item.researchSummary}</p>
                                </div>
                              ) : null}

                              {item.foods ? (
                                <div className="science-block">
                                  <span>Food support</span>
                                  <p>{item.foods}</p>
                                </div>
                              ) : null}

                              {item.lifestyle ? (
                                <div className="science-block">
                                  <span>Lifestyle</span>
                                  <p>{item.lifestyle}</p>
                                </div>
                              ) : null}

                              {item.supplementNotes ? (
                                <div className="science-block">
                                  <span>Supplement notes</span>
                                  <p>{item.supplementNotes}</p>
                                </div>
                              ) : null}

                              {item.retest ? (
                                <div className="science-block">
                                  <span>Retest guidance</span>
                                  <p>{item.retest}</p>
                                </div>
                              ) : null}

                              {item.recommendedTests?.length ? (
                                <div className="science-block">
                                  <span>Recommended follow-up tests</span>
                                  <p>{item.recommendedTests.join(" • ")}</p>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="primary-cta"
                    onClick={() => setCurrentStep(6)}
                  >
                    Continue to full breakdown and stack
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {currentStep === 6 && (
          <section className="flow-section journey-step-section">
            <button type="button" className="journey-back-btn" onClick={() => setCurrentStep(5)}>← Back</button>
            <SectionTitle
              step="Step 6"
              title="Supplement Stack Optimizer"
              subtitle="Your personalized supplement recommendations, best-value picks, and estimated savings."
            />

            {!hasResults ? (
              <div className="glass-card empty-card">
                Biomarker breakdown is unavailable until results are generated.
              </div>
            ) : (
              <>
                <div className="analysis-grid">
                  {analysisResults.map((item, index) => {
                    const marker = String(item.name || item.marker || `Marker ${index + 1}`)
                    const tone = getStatusTone(item.status)

                    return (
                      <div className="glass-card analysis-card" key={`${marker}-${index}`}>
                        <div className="analysis-header">
                          <div>
                            <div className="analysis-title">{marker}</div>
                            <div className="analysis-subtitle">{tone.label}</div>
                          </div>

                          <div className={`status-chip ${tone.className}`}>
                            <span>{tone.icon}</span>
                            <span>{tone.label}</span>
                          </div>
                        </div>

                        <div className="analysis-value">{item.value ?? "—"}</div>

                        <div className="gauge-wrap">
                          <BiomarkerGauge
                            value={item.value ?? 0}
                            optimalMin={item.optimalMin ?? 0}
                            optimalMax={item.optimalMax ?? 0}
                          />
                        </div>

                        <div className="analysis-desc">
                          {item.description || inferWhyItMatters(marker)}
                        </div>

                        {(item.whyItMatters || item.researchSummary || item.recommendedTests?.length) ? (
                          <button
                            type="button"
                            className="ghost-button slim"
                            onClick={() => toggleScience(`analysis-${marker}`)}
                          >
                            {openScienceMarkers[`analysis-${marker}`] ? "Hide science" : "View science"}
                          </button>
                        ) : null}

                        {openScienceMarkers[`analysis-${marker}`] ? (
                          <div className="science-drawer">
                            {item.whyItMatters ? (
                              <div className="science-block">
                                <span>Why it matters</span>
                                <p>{item.whyItMatters}</p>
                              </div>
                            ) : null}
                            {item.researchSummary ? (
                              <div className="science-block">
                                <span>Research summary</span>
                                <p>{item.researchSummary}</p>
                              </div>
                            ) : null}
                            {item.recommendedTests?.length ? (
                              <div className="science-block">
                                <span>Suggested follow-up tests</span>
                                <p>{item.recommendedTests.join(" • ")}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {detectedPatterns.length > 0 ? (
                  <div className="pattern-section">
                    <h3 className="pattern-section-title">Detected biomarker patterns</h3>
                    <p className="pattern-section-subtitle">
                      Multi-marker patterns that may guide where to focus first.
                    </p>
                    <div className="pattern-cards">
                      {detectedPatterns.map((pattern, idx) => (
                        <div
                          key={`${pattern.title}-${idx}`}
                          className={`glass-card pattern-card pattern-${pattern.significance}`}
                        >
                          <div className="pattern-card-header">
                            <h4 className="pattern-title">{pattern.title}</h4>
                            <span className="pattern-markers">{pattern.markers.join(" · ")}</span>
                          </div>
                          <p className="pattern-explanation">{pattern.explanation}</p>
                          <div className="pattern-focus">
                            <div className="pattern-focus-label">Recommended focus actions</div>
                            <ul className="pattern-focus-list">
                              {pattern.focusActions.map((action, i) => (
                                <li key={i}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasResults ? (
                  <div className="bloodwise-summary-section">
                    <h3 className="bloodwise-summary-title">Clarion Summary</h3>
                    <p className="bloodwise-summary-subtitle">
                      A concise take on your results and what to do next.
                    </p>
                    <div className="glass-card bloodwise-summary-card">
                      <div className="bloodwise-summary-block">
                        <div className="bloodwise-summary-label">Overall</div>
                        <p className="bloodwise-summary-overall">{bloodwiseSummary.overallInterpretation}</p>
                      </div>
                      {bloodwiseSummary.keyFindings.length > 0 ? (
                        <div className="bloodwise-summary-block">
                          <div className="bloodwise-summary-label">Most important findings</div>
                          <ul className="bloodwise-summary-findings">
                            {bloodwiseSummary.keyFindings.map((finding, i) => (
                              <li key={i}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {bloodwiseSummary.topPriorityActions.length > 0 ? (
                        <div className="bloodwise-summary-block">
                          <div className="bloodwise-summary-label">Top priority actions</div>
                          <ul className="bloodwise-summary-actions">
                            {bloodwiseSummary.topPriorityActions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="stack-optimizer-intro">
                  <h3 className="stack-optimizer-heading">Your personalized supplement stack</h3>
                  <p className="stack-optimizer-subtitle">
                    Based on your results, we’ve curated recommendations with best-value picks and clear pricing. Each card shows why it’s recommended and a short science summary.
                  </p>
                </div>

                {hasSupplements ? (
                  <div className="stack-optimizer-savings-card">
                    <div className="stack-optimizer-savings-row">
                      <div className="stack-optimizer-savings-item">
                        <span className="stack-optimizer-savings-label">Your current spend</span>
                        <strong className="stack-optimizer-savings-value">${userCurrentSpend.toFixed(2)}/mo</strong>
                      </div>
                      <div className="stack-optimizer-savings-item highlight">
                        <span className="stack-optimizer-savings-label">Optimized stack</span>
                        <strong className="stack-optimizer-savings-value">${optimizedSpend.toFixed(2)}/mo</strong>
                      </div>
                      <div className="stack-optimizer-savings-item success">
                        <span className="stack-optimizer-savings-label">Estimated savings</span>
                        <strong className="stack-optimizer-savings-value">${estimatedSavingsVsCurrent.toFixed(2)}/mo</strong>
                      </div>
                    </div>
                    <p className="stack-optimizer-savings-note">~${annualSavings.toFixed(2)}/yr vs. your current spend</p>
                  </div>
                ) : null}

                {!hasSupplements ? (
                  <div className="glass-card empty-card stack-optimizer-empty">
                    No supplement interventions were triggered by the current results. Your panel may not suggest additional supplements at this time.
                  </div>
                ) : (
                  <>
                    <div className="stack-list stack-optimizer-list">
                      {optimizedStack.stack.map((rec: any, idx: number) => {
                        const compareKey = `${rec.supplementKey}-${idx}`
                        const markerScience = analysisResults.find(
                          (result) =>
                            normalize(String(result.name || result.marker || "")) ===
                            normalize(String(rec.marker || ""))
                        )

                        const best = rec.bestOverall ?? rec.bestValue
                        const breakdown = rec.monthlyCostBreakdown

                        return (
                          <div className="glass-card stack-card stack-optimizer-card" key={compareKey}>
                            <div className="stack-optimizer-card-inner">
                            <div className="stack-top">
                              <div>
                                <div className="stack-kicker-row">
                                  <span className="stack-kicker">Triggered by {rec.marker}</span>
                                  {rec.recommendationType ? (
                                    <span className={`stack-type-badge stack-type-${String(rec.recommendationType).toLowerCase().replace(/-/g, "")}`}>
                                      {rec.recommendationType}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="stack-title">{rec.name}</div>
                                <div className="stack-dose">{rec.dose}</div>
                              </div>

                              <div className="stack-price-pill">
                                ${Number(rec.estimatedMonthlyCost || 0).toFixed(2)}/mo
                              </div>
                            </div>

                            <div className="recommended-pick-grid">
                              <div className="best-card best-overall">
                                <div className="best-label">Best overall</div>
                                <div className="best-name">{best?.productName}</div>
                                <div className="best-meta">
                                  {best?.amountPerUnit} {best?.activeUnit} per{" "}
                                  {String(best?.form || "").toLowerCase()}
                                </div>
                                <div className="best-meta">
                                  ${Number(best?.price ?? 0).toFixed(2)} • {best?.unitsPerBottle} units
                                </div>
                                {breakdown ? (
                                  <div className="cost-breakdown">
                                    <div className="cost-breakdown-label">Monthly cost</div>
                                    <div className="cost-breakdown-math">
                                      (${breakdown.bottlePrice.toFixed(2)} ÷ {breakdown.unitsPerBottle} servings) × {breakdown.daysPerMonth} days
                                      {breakdown.unitsPerDay !== 1 ? ` × ${breakdown.unitsPerDay}/day` : ""} ≈ ${breakdown.monthlyCost.toFixed(2)}/mo
                                    </div>
                                  </div>
                                ) : (
                                  <div className="best-meta">
                                    Estimated monthly cost: ${Number(rec.estimatedMonthlyCost || 0).toFixed(2)}
                                  </div>
                                )}
                                <div className="stack-card-savings">
                                  Adds ${Number(rec.estimatedMonthlyCost || 0).toFixed(2)}/mo to stack. Savings vs your current spend below.
                                </div>

                                {best?.url ? (
                                  <a
                                    href={best.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ghost-button link-button"
                                  >
                                    View product
                                  </a>
                                ) : null}
                              </div>

                              <div className="stack-why-card">
                                <div className="best-label">Why this is recommended</div>
                                <p className="why-recommended-short">{rec.whyThisIsRecommended ?? rec.whyRecommended ?? (markerScience?.whyItMatters || inferWhyItMatters(String(rec.marker || "")))}</p>
                                {markerScience?.whyItMatters && (rec.whyThisIsRecommended || rec.whyRecommended) ? (
                                  <p className="why-detail">{markerScience.whyItMatters}</p>
                                ) : null}
                                {rec.expectedBenefit ? (
                                  <>
                                    <div className="best-label stack-why-sublabel">Expected benefit</div>
                                    <p className="stack-why-benefit">{rec.expectedBenefit}</p>
                                  </>
                                ) : null}
                                {rec.dosingGuidance ? (
                                  <>
                                    <div className="best-label stack-why-sublabel">Dosing guidance</div>
                                    <p className="stack-why-dosing">{rec.dosingGuidance}</p>
                                  </>
                                ) : null}
                                {markerScience?.supplementNotes ? (
                                  <p>{markerScience.supplementNotes}</p>
                                ) : null}
                                {markerScience?.researchSummary ? (
                                  <div className="inline-science-note">
                                    <strong>Science:</strong> {markerScience.researchSummary}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="button-row">
                              <button
                                type="button"
                                className="ghost-button slim"
                                onClick={() => toggleCompare(compareKey)}
                              >
                                {openCompareCards[compareKey] ? "Hide compare options" : "Compare options"}
                              </button>
                            </div>

                            {openCompareCards[compareKey] ? (
                              <>
                                <div className="best-grid best-grid-three">
                                  <div className="best-card best-value">
                                    <div className="best-label">Best value</div>
                                    <div className="best-name">{rec.bestValue?.productName}</div>
                                    <div className="best-meta">
                                      {rec.bestValue?.amountPerUnit} {rec.bestValue?.activeUnit} per{" "}
                                      {String(rec.bestValue?.form || "").toLowerCase()}
                                    </div>
                                    <div className="best-meta">
                                      ${Number(rec.bestValue?.price || 0).toFixed(2)} • {rec.bestValue?.unitsPerBottle} units
                                    </div>
                                  </div>

                                  <div className="best-card best-overall-inline">
                                    <div className="best-label">Best overall</div>
                                    <div className="best-name">{rec.bestOverall?.productName ?? rec.bestValue?.productName}</div>
                                    <div className="best-meta">
                                      {rec.bestOverall?.amountPerUnit ?? rec.bestValue?.amountPerUnit} {rec.bestOverall?.activeUnit ?? rec.bestValue?.activeUnit} per{" "}
                                      {String((rec.bestOverall ?? rec.bestValue)?.form || "").toLowerCase()}
                                    </div>
                                    <div className="best-meta">
                                      ${Number((rec.bestOverall ?? rec.bestValue)?.price ?? 0).toFixed(2)} • {(rec.bestOverall ?? rec.bestValue)?.unitsPerBottle} units
                                    </div>
                                  </div>

                                  <div className="best-card best-potency">
                                    <div className="best-label">Highest potency</div>
                                    <div className="best-name">{rec.highestPotency?.productName}</div>
                                    <div className="best-meta">
                                      {rec.highestPotency?.amountPerUnit} {rec.highestPotency?.activeUnit} per{" "}
                                      {String(rec.highestPotency?.form || "").toLowerCase()}
                                    </div>
                                    <div className="best-meta">
                                      ${Number(rec.highestPotency?.price || 0).toFixed(2)} •{" "}
                                      {rec.highestPotency?.unitsPerBottle} units
                                    </div>
                                  </div>
                                </div>

                                <div className="leaderboard-title">Compare options</div>

                                <div className="leaderboard-list">
                                  {(rec.leaderboard || []).map((item: any) => (
                                    <div className="leaderboard-row" key={item.id}>
                                      <div className="leaderboard-name">
                                        #{item.rankByValue} by value — {item.productName}
                                      </div>
                                      <div className="leaderboard-meta">
                                        Rank #{item.rankByPotency} by potency • {item.amountPerUnit} {item.activeUnit} per unit • $
                                        {Number(item.price || 0).toFixed(2)}
                                      </div>

                                      {item.notes ? <div className="leaderboard-note">{item.notes}</div> : null}
                                      {item.assumptions?.length ? (
                                        <div className="leaderboard-warning">
                                          Assumptions: {item.assumptions.join(" ")}
                                        </div>
                                      ) : null}
                                      {item.caution?.length ? (
                                        <div className="leaderboard-danger">
                                          Caution: {item.caution.join(" ")}
                                        </div>
                                      ) : null}

                                      {item.url ? (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="ghost-button link-button"
                                        >
                                          View product
                                        </a>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="final-grid">
                      <div className="glass-card">
                        <div className="mini-heading">Savings comparison</div>

                        <div className="economics-grid">
                          <div className="economics-card dark">
                            <span>Your current spend</span>
                            <strong>${userCurrentSpend.toFixed(2)}/mo</strong>
                          </div>

                          <div className="economics-card blue">
                            <span>Clarion optimized stack</span>
                            <strong>${optimizedSpend.toFixed(2)}/mo</strong>
                          </div>

                          <div className="economics-card green">
                            <span>Estimated monthly savings</span>
                            <strong>${estimatedSavingsVsCurrent.toFixed(2)}/mo</strong>
                          </div>

                          <div className="economics-card dark">
                            <span>Projected annual savings</span>
                            <strong>${annualSavings.toFixed(2)}/yr</strong>
                          </div>
                        </div>

                        <div className="panel-summary">
                          <div className="panel-summary-title">Current stack notes</div>
                          <div className="panel-summary-body">
                            {currentSupplements.trim()
                              ? `Current stack entered: ${currentSupplements}`
                              : "No current stack entered yet."}
                          </div>
                        </div>
                      </div>

                      <div className="glass-card">
                        <div className="mini-heading">Trust + transparency</div>

                        <div className="trust-stack">
                          <div className="trust-card">
                            <div className="trust-title">Range logic</div>
                            <div className="trust-body">
                              Show whether a biomarker is being judged against a lab range, athlete range, or Clarion optimal range.
                            </div>
                          </div>

                          <div className="trust-card">
                            <div className="trust-title">Action framing</div>
                            <div className="trust-body">
                              Keep interpretation educational and action-oriented: what it means, what your result suggests, and what to do next.
                            </div>
                          </div>

                          <div className="trust-card">
                            <div className="trust-title">Export + discussion</div>
                            <div className="trust-body">
                              Add a future shareable report so users can discuss results with a clinician, coach, or lab provider.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div>

      <style jsx>{`
        .bw-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, rgba(201, 169, 98, 0.12), transparent 32%),
            radial-gradient(circle at 85% 20%, rgba(123, 155, 178, 0.1), transparent 28%),
            radial-gradient(circle at 70% 80%, rgba(232, 165, 152, 0.08), transparent 30%),
            linear-gradient(180deg, #faf9f6 0%, #f5f2eb 50%, #faf9f6 100%);
          color: #2d2a26;
          position: relative;
          overflow-x: hidden;
        }

        .bw-container {
          position: relative;
          z-index: 2;
          max-width: 720px;
          margin: 0 auto;
          padding: 24px 20px 80px;
        }

        .bg-orb {
          position: fixed;
          border-radius: 999px;
          filter: blur(100px);
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: rgba(201, 169, 98, 0.15);
          top: -100px;
          left: -80px;
        }

        .orb-2 {
          width: 320px;
          height: 320px;
          background: rgba(123, 155, 178, 0.12);
          top: 60px;
          right: -60px;
        }

        .orb-3 {
          width: 360px;
          height: 360px;
          background: rgba(232, 165, 152, 0.1);
          bottom: 20px;
          right: 20%;
        }

        .grid-glow {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(45, 42, 38, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 42, 38, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .journey-analysis-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(250, 249, 246, 0.92);
          backdrop-filter: blur(8px);
        }

        .journey-analysis-card {
          text-align: center;
          padding: 48px 40px;
          border-radius: 24px;
          background: #fffefb;
          box-shadow: 0 24px 64px rgba(45, 42, 38, 0.12);
          border: 1px solid rgba(201, 169, 98, 0.2);
          max-width: 400px;
        }

        .journey-analysis-dots {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 24px;
        }

        .journey-analysis-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--clarion-muted-gold, #c9a962);
        }

        .journey-analysis-title {
          margin: 0 0 10px;
          font-size: 24px;
          font-weight: 600;
          color: #2d2a26;
          letter-spacing: -0.02em;
        }

        .journey-analysis-subtitle {
          margin: 0;
          font-size: 15px;
          color: #6b6560;
          line-height: 1.5;
        }

        .journey-progress-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
          padding: 12px 0;
        }

        .journey-progress-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid rgba(45, 42, 38, 0.15);
          background: #fffefb;
          color: #6b6560;
          font-size: 13px;
          font-weight: 600;
          cursor: default;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .journey-progress-dot.unlocked {
          cursor: pointer;
          border-color: rgba(201, 169, 98, 0.4);
          color: #2d2a26;
        }

        .journey-progress-dot.unlocked:hover {
          background: rgba(201, 169, 98, 0.12);
          border-color: rgba(201, 169, 98, 0.6);
        }

        .journey-progress-dot.active {
          background: #c9a962;
          border-color: #c9a962;
          color: #fff;
        }

        .journey-progress-dot.done {
          background: rgba(74, 155, 142, 0.2);
          border-color: #4a9b8e;
          color: #4a9b8e;
        }

        .journey-progress-labels {
          display: none;
        }

        .journey-back-btn {
          background: none;
          border: none;
          color: #6b6560;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 16px;
          padding: 4px 0;
          transition: color 0.2s ease;
        }

        .journey-back-btn:hover {
          color: #2d2a26;
        }

        .journey-step-section {
          animation: journeyFadeIn 0.35s ease;
        }

        @keyframes journeyFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .journey-step-actions {
          margin-top: 24px;
        }

        .hero-card,
        .flow-section {
          margin-bottom: 20px;
        }

        .previous-reports-section {
          margin-top: 24px;
        }

        .previous-reports-title {
          margin: 0 0 6px;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .previous-reports-subtitle {
          margin: 0 0 16px;
          font-size: 14px;
          color: rgba(226,232,240,0.7);
          line-height: 1.5;
        }

        .previous-reports-loading {
          font-size: 14px;
          color: rgba(226,232,240,0.6);
        }

        .previous-reports-empty {
          color: rgba(226,232,240,0.65);
          font-size: 14px;
        }

        .previous-reports-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }

        .previous-report-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
        }

        .previous-report-date {
          font-size: 13px;
          font-weight: 600;
          color: rgba(226,232,240,0.85);
        }

        .previous-report-score {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .previous-report-score-label {
          font-size: 12px;
          color: rgba(226,232,240,0.6);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .previous-report-score-value {
          font-size: 22px;
          color: #f8fafc;
        }

        .previous-report-flagged {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .previous-report-flagged-label {
          font-size: 11px;
          color: rgba(226,232,240,0.5);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .previous-report-flagged-list,
        .previous-report-flagged-none {
          font-size: 13px;
          color: rgba(226,232,240,0.8);
          line-height: 1.4;
        }

        .previous-report-flagged-none {
          font-style: italic;
          color: rgba(226,232,240,0.5);
        }

        .previous-report-open-btn {
          margin-top: 4px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 12px;
          border: 1px solid rgba(124,140,255,0.35);
          background: linear-gradient(135deg, rgba(124,140,255,0.22), rgba(69,214,255,0.1));
          color: #e8ecff;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .previous-report-open-btn:hover {
          background: linear-gradient(135deg, rgba(124,140,255,0.32), rgba(69,214,255,0.18));
          border-color: rgba(124,140,255,0.45);
        }

        .hero-card {
          position: relative;
          padding: 32px 28px;
          border-radius: 24px;
          border: 1px solid rgba(201, 169, 98, 0.18);
          background: #fffefb;
          box-shadow: 0 4px 24px rgba(45, 42, 38, 0.06), 0 1px 0 rgba(255,255,255,0.8) inset;
        }

        .hero-topline {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
        }

        .hero-topline-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hero-dashboard-link {
          font-size: 13px;
          font-weight: 600;
          color: #6b6560;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 10px;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .hero-dashboard-link:hover {
          color: #2d2a26;
          background: rgba(201, 169, 98, 0.12);
        }

        .auth-ui {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .auth-ui-loading {
          color: rgba(226,232,240,0.6);
          font-size: 13px;
          font-weight: 500;
        }

        .auth-ui-loading-text {
          font-size: 13px;
        }

        .auth-ui-idle {
          flex-direction: column;
          gap: 12px;
        }

        .auth-ui-oauth-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .auth-ui-oauth-row.auth-ui-oauth-in-form {
          margin-bottom: 4px;
        }

        .auth-ui-btn-oauth {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.12);
        }

        .auth-ui-btn-oauth:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.18);
        }

        .auth-ui-divider-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .auth-ui-divider {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }

        .auth-ui-divider-text {
          font-size: 12px;
          color: rgba(226,232,240,0.5);
          text-transform: lowercase;
        }

        .auth-ui-email-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .auth-ui-idle-divider {
          color: rgba(226,232,240,0.35);
          font-weight: 300;
          font-size: 14px;
          user-select: none;
        }

        .auth-ui-signed-in {
          flex-wrap: wrap;
          gap: 10px;
        }

        .auth-ui-email {
          font-size: 13px;
          color: rgba(226,232,240,0.85);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .auth-ui-btn {
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          background: rgba(255,255,255,0.06);
          color: #f8fafc;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .auth-ui-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.14);
        }

        .auth-ui-btn-primary {
          background: linear-gradient(135deg, rgba(124,140,255,0.32), rgba(69,214,255,0.14));
          border-color: rgba(124,140,255,0.4);
          color: #e8ecff;
        }

        .auth-ui-btn-primary:hover {
          background: linear-gradient(135deg, rgba(124,140,255,0.42), rgba(69,214,255,0.22));
          border-color: rgba(124,140,255,0.5);
        }

        .auth-ui-btn-ghost {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.08);
        }

        .auth-ui-btn-ghost:hover {
          background: rgba(255,255,255,0.09);
        }

        .auth-ui-btn-out {
          padding: 7px 14px;
          font-size: 12px;
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }

        .auth-ui-form-wrap {
          position: relative;
        }

        .auth-ui-form-card {
          min-width: 280px;
          padding: 28px 40px 32px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(16, 22, 42, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255,255,255,0.04) inset;
        }

        .auth-ui-form-title {
          margin: 0 0 18px;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .auth-ui-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-ui-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-ui-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: rgba(226,232,240,0.75);
          text-transform: uppercase;
        }

        .auth-ui-input {
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.28);
          color: #f8fafc;
          font-size: 14px;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .auth-ui-input:focus {
          outline: none;
          border-color: rgba(124,140,255,0.45);
          background: rgba(0,0,0,0.35);
        }

        .auth-ui-input::placeholder {
          color: rgba(226,232,240,0.4);
        }

        .auth-ui-form-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .auth-ui-btn-submit {
          padding: 11px 20px;
          font-size: 14px;
        }

        .auth-ui-btn-back {
          padding: 10px 16px;
          font-size: 13px;
          color: rgba(226,232,240,0.9);
        }

        .auth-ui-message {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .auth-ui-message-error {
          color: #ff6b7a;
        }

        .auth-ui-message-ok {
          color: #2bd4a0;
        }

        .brand-pill,
        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .brand-pill {
          background: rgba(201, 169, 98, 0.12);
          border: 1px solid rgba(201, 169, 98, 0.25);
          color: #5c4d2e;
        }

        .brand-pill-large {
          font-size: 18px;
          padding: 12px 18px;
          letter-spacing: 0.16em;
        }

        .ghost-cta,
        .ghost-button,
        .choice-pill {
          border: 1px solid rgba(45, 42, 38, 0.15);
          background: #fffefb;
          color: #2d2a26;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .ghost-cta:hover,
        .ghost-button:hover,
        .choice-pill:hover {
          background: rgba(201, 169, 98, 0.1);
          border-color: rgba(201, 169, 98, 0.3);
        }

        .ghost-button.slim {
          padding: 9px 12px;
          margin-top: 12px;
          color: #6b6560;
        }

        .choice-pill.active {
          background: rgba(201, 169, 98, 0.18);
          border-color: rgba(201, 169, 98, 0.5);
          color: #2d2a26;
        }

        .primary-cta {
          border: none;
          background: linear-gradient(135deg, #b8954a, #c9a962);
          color: #fff;
          border-radius: 14px;
          padding: 14px 28px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(184, 149, 74, 0.3);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .primary-cta:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(184, 149, 74, 0.35);
        }

        .primary-cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .hero-copy h1 {
          color: #2d2a26;
        }

        .hero-copy p {
          color: #6b6560;
        }

        .hero-copy {
          max-width: 860px;
          margin-bottom: 20px;
        }

        .hero-copy h1 {
          margin: 0;
          font-size: 56px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          font-weight: 600;
          max-width: 920px;
          color: #f8fafc;
        }

        .retest-reminder-banner {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin: 14px 0;
          padding: 12px 18px;
          background: rgba(124, 140, 255, 0.12);
          border: 1px solid rgba(124, 140, 255, 0.25);
          border-radius: 12px;
        }
        .retest-reminder-text {
          font-size: 14px;
          color: rgba(232, 236, 255, 0.95);
        }
        .retest-reminder-cta {
          font-size: 13px;
          font-weight: 600;
          color: #a5b4fc;
        }
        .retest-reminder-cta:hover {
          color: #c7d2fe;
        }

        .subscribe-section {
          margin: 18px 0;
        }
        .subscribe-card {
          padding: 20px 24px;
          border-radius: 16px;
          border: 1px solid rgba(124, 140, 255, 0.3);
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.15), rgba(69, 214, 255, 0.06));
        }
        .subscribe-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
        }
        .subscribe-desc {
          margin: 0 0 16px;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.85);
          line-height: 1.5;
        }
        .subscribe-btn {
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.4), rgba(69, 214, 255, 0.2));
          border: 1px solid rgba(124, 140, 255, 0.5);
          color: #e8ecff;
          cursor: pointer;
        }
        .subscribe-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.5), rgba(69, 214, 255, 0.3));
        }

        .retest-status-section {
          margin: 14px 0 20px;
        }
        .retest-status-card {
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(16, 22, 42, 0.6);
        }
        .retest-status-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.55);
        }
        .retest-status-text {
          margin: 6px 0 8px;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.5;
        }
        .retest-status-link {
          font-size: 13px;
          font-weight: 600;
          color: #a5b4fc;
        }
        .retest-status-link:hover {
          color: #c7d2fe;
        }

        .hero-copy p,
        .section-title p,
        .snapshot-copy,
        .analysis-desc,
        .reason-body,
        .leaderboard-meta,
        .leaderboard-note,
        .leaderboard-warning,
        .leaderboard-danger,
        .trust-body,
        .retest-copy,
        .hero-footer-note,
        .awaiting-copy,
        .stack-dose,
        .biomarker-desc,
        .stack-section-header p,
        .stack-why-card p,
        .science-block p {
          color: rgba(226,232,240,0.78);
          line-height: 1.65;
        }

        .progress-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 18px 0 22px;
        }

        .progress-step {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(226,232,240,0.52);
          font-size: 13px;
          font-weight: 700;
        }

        .progress-step.unlocked {
          color: rgba(226,232,240,0.82);
        }

        .progress-step.active {
          background: linear-gradient(135deg, rgba(124,140,255,0.20), rgba(69,214,255,0.12));
          border-color: rgba(124,140,255,0.28);
          color: #fff;
        }

        .progress-step.done {
          border-color: rgba(43,212,160,0.2);
        }

        .progress-dot {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
          font-size: 11px;
          font-weight: 900;
        }

        .hero-grid,
        .flow-grid,
        .snapshot-grid,
        .priority-cards,
        .analysis-grid,
        .stack-list,
        .leaderboard-list,
        .best-grid,
        .trust-stack,
        .input-stack,
        .reason-list,
        .recommended-pick-grid,
        .hero-mini-summary {
          display: grid;
          gap: 16px;
        }

        .stack-list {
          gap: 12px;
        }

        .final-grid {
          display: grid;
          gap: 12px;
        }

        .hero-grid {
          grid-template-columns: 1.04fr 0.96fr;
        }

        .flow-grid {
          grid-template-columns: 1fr 1fr;
        }

        .snapshot-grid {
          grid-template-columns: 1.08fr 0.92fr;
        }

        .priority-cards {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 16px;
        }

        .analysis-grid {
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
        }

        .best-grid,
        .final-grid,
        .recommended-pick-grid {
          grid-template-columns: 1fr 1fr;
        }

        .hero-mini-summary {
          grid-template-columns: 1fr 1fr;
          margin-top: 14px;
        }

        .glass-card {
          padding: 22px 24px;
          border-radius: 20px;
          background: #fffefb;
          border: 1px solid rgba(201, 169, 98, 0.15);
          box-shadow: 0 4px 20px rgba(45, 42, 38, 0.06);
        }

        .mini-heading {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          color: #6b6560;
          margin-bottom: 12px;
        }

        .awaiting-state {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .awaiting-title {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 8px;
          color: #2d2a26;
        }

        .awaiting-copy {
          color: #6b6560;
        }

        .score-row,
        .snapshot-score-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .score-number,
        .snapshot-score {
          font-size: 58px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .score-label,
        .snapshot-label {
          font-size: 24px;
          font-weight: 700;
          color: #6b6560;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .stats-grid-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .stat-chip {
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(45,42,38,0.08);
          min-height: 92px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .stat-chip span {
          font-size: 13px;
          color: #6b6560;
        }

        .stat-chip strong {
          font-size: 34px;
          line-height: 1;
          font-weight: 900;
        }

        .stat-chip.green {
          background: linear-gradient(135deg, rgba(74,155,142,0.18), rgba(74,155,142,0.06));
        }
        .stat-chip.green strong { color: #4a9b8e; }

        .stat-chip.amber {
          background: linear-gradient(135deg, rgba(196,149,46,0.2), rgba(196,149,46,0.08));
        }
        .stat-chip.amber strong { color: #c4952e; }

        .stat-chip.red {
          background: linear-gradient(135deg, rgba(199,92,92,0.18), rgba(199,92,92,0.06));
        }
        .stat-chip.red strong { color: #c75c5c; }

        .stat-chip.blue {
          background: linear-gradient(135deg, rgba(123,155,178,0.18), rgba(123,155,178,0.08));
        }
        .stat-chip.blue strong { color: #7b9bb2; }

        .mini-summary-card {
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .mini-summary-card span {
          display: block;
          font-size: 12px;
          color: rgba(226,232,240,0.56);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mini-summary-card strong {
          font-size: 15px;
          line-height: 1.5;
        }

        .field-grid,
        .button-row,
        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .field span,
        .option-label {
          font-size: 12px;
          color: #6b6560;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .field input,
        .number-input {
          width: 100%;
          border: 1px solid rgba(45,42,38,0.12);
          background: #fffefb;
          color: #2d2a26;
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
          font-size: 15px;
        }

        .field input::placeholder,
        .number-input::placeholder {
          color: rgba(226,232,240,0.42);
        }

        .field input:focus,
        .number-input:focus {
          border-color: rgba(124,140,255,0.5);
          box-shadow: 0 0 0 4px rgba(124,140,255,0.10);
        }

        .option-group {
          margin-top: 14px;
        }

        .hero-footer-note,
        .panel-summary,
        .retest-card,
        .reason-card,
        .best-card,
        .leaderboard-row,
        .trust-card,
        .economics-card,
        .biomarker-input-card,
        .empty-card,
        .stack-why-card,
        .science-drawer,
        .premium-lock {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .hero-footer-note,
        .panel-summary,
        .empty-card,
        .premium-lock {
          padding: 14px;
          border-radius: 18px;
        }

        .panel-summary-title,
        .reason-title,
        .trust-title,
        .leaderboard-title {
          font-weight: 800;
        }

        .panel-summary-body {
          margin-top: 6px;
          color: rgba(226,232,240,0.78);
          line-height: 1.6;
        }

        .recommend-chip-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .recommend-chip {
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(124,140,255,0.12);
          border: 1px solid rgba(124,140,255,0.18);
          color: #d9deff;
          font-size: 13px;
          font-weight: 700;
        }

        .reason-card,
        .best-card,
        .trust-card,
        .economics-card,
        .leaderboard-row,
        .biomarker-input-card,
        .stack-why-card,
        .science-drawer {
          padding: 14px;
          border-radius: 18px;
        }

        .biomarker-input-card {
          display: grid;
          grid-template-columns: 1fr 150px;
          gap: 12px;
          align-items: center;
        }

        .biomarker-title,
        .analysis-title,
        .stack-title,
        .best-name,
        .priority-title {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
        }

        .section-title {
          margin-bottom: 20px;
        }

        .step-badge {
          background: rgba(201, 169, 98, 0.15);
          color: #8a7342;
          border: 1px solid rgba(201, 169, 98, 0.25);
          margin-bottom: 10px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: -0.02em;
          font-weight: 600;
          color: #2d2a26;
        }

        .section-title p {
          color: #6b6560;
        }

        .priority-focus-card {
          min-height: 300px;
        }

        .priority-card-top,
        .analysis-header,
        .stack-top,
        .stack-section-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .pattern-section {
          margin: 28px 0 24px;
        }

        .pattern-section-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .pattern-section-subtitle {
          margin: 0 0 16px;
          font-size: 14px;
          color: rgba(226,232,240,0.7);
          line-height: 1.5;
        }

        .pattern-cards {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }

        .pattern-card {
          padding: 16px 18px;
          border-radius: 20px;
        }

        .pattern-card.pattern-high {
          border-color: rgba(255,107,122,0.2);
          background: rgba(255,107,122,0.04);
        }

        .pattern-card.pattern-moderate {
          border-color: rgba(248,184,78,0.2);
          background: rgba(248,184,78,0.04);
        }

        .pattern-card.pattern-low {
          border-color: rgba(124,140,255,0.2);
          background: rgba(124,140,255,0.04);
        }

        .pattern-card-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .pattern-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.25;
        }

        .pattern-markers {
          font-size: 12px;
          color: rgba(226,232,240,0.55);
        }

        .pattern-explanation {
          margin: 0 0 14px;
          font-size: 14px;
          color: rgba(226,232,240,0.82);
          line-height: 1.55;
        }

        .pattern-focus {
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .pattern-focus-label {
          font-size: 12px;
          font-weight: 800;
          color: rgba(226,232,240,0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .pattern-focus-list {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          color: rgba(226,232,240,0.8);
          line-height: 1.55;
        }

        .pattern-focus-list li {
          margin-bottom: 6px;
        }

        .pattern-focus-list li:last-child {
          margin-bottom: 0;
        }

        .bloodwise-summary-section {
          margin: 28px 0 24px;
        }

        .bloodwise-summary-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .bloodwise-summary-subtitle {
          margin: 0 0 14px;
          font-size: 14px;
          color: rgba(226,232,240,0.7);
          line-height: 1.5;
        }

        .bloodwise-summary-card {
          padding: 20px 22px;
          border-radius: 22px;
        }

        .bloodwise-summary-block {
          margin-bottom: 18px;
        }

        .bloodwise-summary-block:last-child {
          margin-bottom: 0;
        }

        .bloodwise-summary-label {
          font-size: 12px;
          font-weight: 800;
          color: rgba(226,232,240,0.55);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .bloodwise-summary-overall {
          margin: 0;
          font-size: 15px;
          color: rgba(226,232,240,0.9);
          line-height: 1.6;
        }

        .bloodwise-summary-findings,
        .bloodwise-summary-actions {
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
          color: rgba(226,232,240,0.85);
          line-height: 1.55;
        }

        .bloodwise-summary-findings li,
        .bloodwise-summary-actions li {
          margin-bottom: 8px;
        }

        .bloodwise-summary-findings li:last-child,
        .bloodwise-summary-actions li:last-child {
          margin-bottom: 0;
        }

        .stack-optimizer-intro {
          margin: 28px 0 24px;
        }

        .stack-optimizer-heading {
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #2d2a26;
        }

        .stack-optimizer-subtitle {
          margin: 0;
          font-size: 15px;
          color: #6b6560;
          line-height: 1.55;
        }

        .stack-optimizer-savings-card {
          padding: 24px 28px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(74, 155, 142, 0.12), rgba(201, 169, 98, 0.08));
          border: 1px solid rgba(74, 155, 142, 0.25);
          margin-bottom: 28px;
        }

        .stack-optimizer-savings-row {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: baseline;
        }

        .stack-optimizer-savings-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stack-optimizer-savings-item.highlight .stack-optimizer-savings-value {
          color: #5c4d2e;
        }

        .stack-optimizer-savings-item.success .stack-optimizer-savings-value {
          color: #4a9b8e;
        }

        .stack-optimizer-savings-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #6b6560;
        }

        .stack-optimizer-savings-value {
          font-size: 24px;
          font-weight: 700;
          color: #2d2a26;
        }

        .stack-optimizer-savings-note {
          margin: 14px 0 0;
          font-size: 14px;
          color: #6b6560;
        }

        .stack-optimizer-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .stack-optimizer-card {
          padding: 26px 28px;
          border-radius: 20px;
          border: 1px solid rgba(201, 169, 98, 0.2);
          background: #fffefb;
          box-shadow: 0 4px 20px rgba(45, 42, 38, 0.06);
        }

        .stack-optimizer-card .stack-title {
          font-size: 20px;
          font-weight: 600;
          color: #2d2a26;
        }

        .stack-optimizer-card .stack-price-pill {
          background: rgba(201, 169, 98, 0.18);
          color: #5c4d2e;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 15px;
        }

        .stack-optimizer-card .best-card.best-overall {
          border-color: rgba(201, 169, 98, 0.25);
          background: rgba(201, 169, 98, 0.06);
          border-radius: 14px;
          padding: 18px;
        }

        .stack-optimizer-card .best-label {
          color: #6b6560;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stack-optimizer-card .best-name {
          color: #2d2a26;
        }

        .stack-section-header {
          margin: 26px 0 16px;
          align-items: center;
        }

        .stack-section-header h3 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #2d2a26;
        }

        .premium-lock {
          max-width: 360px;
        }

        .premium-lock span {
          display: block;
          font-size: 12px;
          color: #6b6560;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          font-weight: 800;
        }

        .premium-lock strong {
          font-size: 14px;
          line-height: 1.6;
          color: #2d2a26;
        }

        .priority-kicker,
        .stack-kicker,
        .analysis-subtitle {
          font-size: 12px;
          color: rgba(226,232,240,0.56);
          margin-bottom: 4px;
        }

        .stack-kicker-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .stack-type-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .stack-type-core {
          background: rgba(43,212,160,0.18);
          color: #2BD4A0;
          border: 1px solid rgba(43,212,160,0.25);
        }

        .stack-type-conditional {
          background: rgba(248,184,78,0.18);
          color: #F8B84E;
          border: 1px solid rgba(248,184,78,0.25);
        }

        .stack-type-contextdependent {
          background: rgba(124,140,255,0.18);
          color: #a5b4fc;
          border: 1px solid rgba(124,140,255,0.25);
        }

        .best-card.best-overall {
          border-color: rgba(124,140,255,0.2);
          background: rgba(124,140,255,0.06);
        }

        .cost-breakdown {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .cost-breakdown-label {
          font-size: 12px;
          color: rgba(226,232,240,0.6);
          margin-bottom: 4px;
        }

        .cost-breakdown-math {
          font-size: 13px;
          color: rgba(226,232,240,0.78);
          font-family: ui-monospace, monospace;
          line-height: 1.5;
          letter-spacing: 0.03em;
        }

        .stack-card-savings {
          font-size: 13px;
          color: rgba(226,232,240,0.7);
          margin-top: 10px;
          line-height: 1.45;
        }

        .why-recommended-short {
          font-weight: 600;
          color: rgba(226,232,240,0.95);
        }

        .why-detail {
          margin-top: 6px;
          color: rgba(226,232,240,0.78);
        }

        .best-grid-three {
          grid-template-columns: repeat(3, 1fr);
        }

        .priority-value,
        .analysis-value {
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin: 14px 0 10px;
        }

        .priority-copy {
          color: rgba(226,232,240,0.78);
          line-height: 1.65;
          font-size: 14px;
          margin-top: 8px;
        }

        .priority-copy strong {
          color: #fff;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .tone-green {
          background: rgba(43,212,160,0.14);
          color: #2BD4A0;
          border-color: rgba(43,212,160,0.18);
        }

        .tone-amber {
          background: rgba(248,184,78,0.16);
          color: #F8B84E;
          border-color: rgba(248,184,78,0.18);
        }

        .tone-red {
          background: rgba(255,107,122,0.14);
          color: #FF6B7A;
          border-color: rgba(255,107,122,0.18);
        }

        .tone-neutral {
          background: rgba(255,255,255,0.08);
          color: rgba(226,232,240,0.78);
          border-color: rgba(255,255,255,0.10);
        }

        .retest-number {
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 8px;
        }

        .retest-insights {
          margin-top: 16px;
          grid-template-columns: 1fr;
        }

        .retest-recommendations-section {
          margin: 24px 0 20px;
        }

        .retest-recommendations-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f8fafc;
        }

        .retest-recommendations-subtitle {
          margin: 0 0 14px;
          font-size: 14px;
          color: rgba(226,232,240,0.7);
          line-height: 1.5;
        }

        .retest-recommendations-list {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .retest-recommendation-card {
          padding: 14px 16px;
          border-radius: 18px;
        }

        .retest-recommendation-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .retest-recommendation-marker {
          font-size: 15px;
          font-weight: 800;
          color: #f8fafc;
        }

        .retest-recommendation-timing {
          font-size: 14px;
          font-weight: 700;
          color: rgba(124,140,255,0.95);
        }

        .retest-recommendation-explanation {
          margin: 0;
          font-size: 13px;
          color: rgba(226,232,240,0.8);
          line-height: 1.5;
        }

        .gauge-wrap {
          margin: 12px 0;
        }

        .science-drawer {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }

        .science-block span {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          color: rgba(226,232,240,0.56);
          margin-bottom: 4px;
          letter-spacing: 0.05em;
          font-weight: 800;
        }

        .science-block p {
          margin: 0;
        }

        .stack-price-pill {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(124,140,255,0.16);
          border: 1px solid rgba(124,140,255,0.18);
          color: #d9deff;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.04em;
        }

        .best-value {
          background: linear-gradient(135deg, rgba(124,140,255,0.16), rgba(69,214,255,0.08));
        }

        .best-potency {
          background: rgba(255,255,255,0.045);
        }

        .best-label,
        .leaderboard-title {
          font-size: 12px;
          font-weight: 800;
          color: rgba(226,232,240,0.56);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }

        .stack-card .stack-title {
          font-size: 16px;
        }

        .stack-card .stack-dose {
          font-size: 13px;
          margin-top: 4px;
        }

        .stack-card .best-label {
          font-size: 12px;
          margin-bottom: 6px;
        }

        .stack-card .best-name {
          font-size: 15px;
          line-height: 1.3;
        }

        .stack-card .best-meta {
          font-size: 13px;
          color: rgba(226,232,240,0.78);
          margin-top: 4px;
          letter-spacing: 0.02em;
        }

        .stack-card .stack-why-card p,
        .stack-card .why-recommended-short,
        .stack-card .why-detail {
          font-size: 13px;
          line-height: 1.5;
        }

        .stack-card .stack-why-card .best-label {
          margin-bottom: 4px;
        }

        .stack-why-sublabel {
          margin-top: 12px;
          margin-bottom: 4px;
        }

        .stack-why-benefit,
        .stack-why-dosing {
          margin: 0;
          font-size: 13px;
          color: rgba(226,232,240,0.82);
          line-height: 1.5;
        }

        .stack-card .best-card,
        .stack-card .stack-why-card {
          padding: 12px 14px;
        }

        .stack-card .best-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .final-grid .panel-summary {
          padding: 12px 14px;
        }

        .final-grid .panel-summary-title {
          font-size: 13px;
        }

        .final-grid .panel-summary-body {
          font-size: 13px;
          line-height: 1.55;
          margin-top: 6px;
        }

        .final-grid .mini-heading {
          font-size: 12px;
          margin-bottom: 8px;
        }

        .inline-science-note {
          margin-top: 10px;
          color: rgba(226,232,240,0.82);
          line-height: 1.6;
          font-size: 14px;
        }

        .link-button {
          display: inline-flex;
          margin-top: 12px;
          text-decoration: none;
          justify-content: center;
        }

        .disabled-link {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .economics-grid {
          gap: 10px;
        }

        .economics-card {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .economics-card span {
          color: rgba(226,232,240,0.78);
          font-size: 13px;
          line-height: 1.35;
        }

        .economics-card strong {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: 0.04em;
        }

        .economics-card.blue {
          background: linear-gradient(135deg, rgba(124,140,255,0.18), rgba(69,214,255,0.08));
        }

        .economics-card.dark {
          background: rgba(255,255,255,0.04);
        }

        .economics-card.green {
          background: linear-gradient(135deg, rgba(43,212,160,0.18), rgba(43,212,160,0.06));
        }

        .economics-card.green strong {
          color: #2BD4A0;
        }

        .glass-card:has(.economics-grid) .mini-heading {
          font-size: 12px;
          margin-bottom: 8px;
        }

        .glass-card:has(.economics-grid) .panel-summary {
          padding: 10px 12px;
          margin-top: 12px;
        }

        .glass-card:has(.economics-grid) .panel-summary-title {
          font-size: 13px;
        }

        .glass-card:has(.economics-grid) .panel-summary-body {
          font-size: 13px;
          line-height: 1.5;
          margin-top: 6px;
        }

        @media (max-width: 1100px) {
          .hero-grid,
          .flow-grid,
          .snapshot-grid,
          .priority-cards,
          .best-grid,
          .final-grid,
          .recommended-pick-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hero-copy h1 {
            font-size: 44px;
          }

          .hero-mini-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .bw-container {
            padding: 16px 12px 60px;
          }

          .hero-card,
          .glass-card {
            border-radius: 22px;
          }

          .hero-copy h1 {
            font-size: 36px;
          }

          .hero-topline,
          .stack-section-header {
            flex-direction: column;
            align-items: stretch;
          }

          .biomarker-input-card {
            grid-template-columns: 1fr;
          }

          .stats-grid,
          .stats-grid-4 {
            grid-template-columns: 1fr 1fr;
          }

          .score-number,
          .snapshot-score {
            font-size: 46px;
          }

          .score-label,
          .snapshot-label {
            font-size: 20px;
          }

          .section-title h2 {
            font-size: 24px;
          }

          .priority-value,
          .analysis-value,
          .retest-number {
            font-size: 28px;
          }

          .economics-card strong {
            font-size: 18px;
          }

          .brand-pill-large {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  )
}