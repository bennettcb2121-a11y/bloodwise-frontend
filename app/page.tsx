"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile, saveBloodwork, getBloodworkHistory, getSubscription } from "@/src/lib/bloodwiseDb"
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
  getActivePanel,
  getEnteredBiomarkers,
  hasEnoughLabs,
  type ProfileState,
} from "@/src/lib/panelEngine"
import { legacyGoalSportToProfileType } from "@/src/lib/clarionProfiles"
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
import { OnboardingFlow } from "@/src/components/OnboardingFlow"

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

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const hasLoadedSaveRef = useRef(false)
  // Block step 6 (Step 7) by default so no race can show it before effect runs; effect sets a 2.5s window from sign-in
  const blockStep6UntilRef = useRef(Date.now() + 30000)
  const [hasPaidAnalysis, setHasPaidAnalysis] = useState(false)
  const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"
  const useMockResults = isDev && searchParams.get("useMockResults") === "1"
  const effectiveHasPaidAnalysis = useMockResults ? true : hasPaidAnalysis

  const biomarkerKeys = useMemo(() => getBiomarkerKeys(), [])

  const [profile, setProfile] = useState<ProfileState>({
    age: "",
    sex: "",
    sport: "",
    goal: "",
    improvementPreference: "",
    profileType: "",
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
  const [currentStep, setCurrentStepRaw] = useState(0)
  const setCurrentStep = useCallback((arg: React.SetStateAction<number>) => {
    setCurrentStepRaw((prev) => {
      const next = typeof arg === "function" ? (arg as (p: number) => number)(prev) : arg
      if (next === 6 && Date.now() < blockStep6UntilRef.current) return 0
      return next
    })
  }, [])
  const [selectedPanel, setSelectedPanel] = useState<string[]>([])
  const [hasLoadedExample, setHasLoadedExample] = useState(false)
  const [openScienceMarkers, setOpenScienceMarkers] = useState<Record<string, boolean>>({})
  const [openCompareCards, setOpenCompareCards] = useState<Record<string, boolean>>({})
  const [previousReports, setPreviousReports] = useState<BloodworkSaveRow[]>([])
  const [previousReportsLoading, setPreviousReportsLoading] = useState(false)
  const [lastBloodworkAt, setLastBloodworkAt] = useState<string | null>(null)
  const [retestWeeks, setRetestWeeks] = useState(8)
  const [analyzing, setAnalyzing] = useState(false)

  const isProfileReady = Boolean(
    profile.profileType?.trim() || (profile.goal.trim() && profile.sport.trim())
  )

  // Recommended panel: profile type → panel, else legacy goal/sport, else general_health_adult (always show a panel)
  const recommendedMarkers = useMemo(() => {
    return getAdaptiveRecommendedMarkers(profile, biomarkerKeys)
  }, [profile, biomarkerKeys])

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
  useEffect(() => {
    if (!userId || hasLoadedSaveRef.current) return
    hasLoadedSaveRef.current = true
    // If returning from payment or subscription checkout, don't force welcome — dedicated effects will show results flow
    const search = typeof window !== "undefined" ? window.location.search : ""
    const isPaymentReturn = search.includes("paid=1")
    const isSubscriptionReturn = search.includes("subscription=success")
    if (!isPaymentReturn && !isSubscriptionReturn) {
      setCurrentStep(0)
      setAnalyzing(false)
    }
    Promise.all([loadSavedState(userId), getSubscription(userId)])
      .then(([{ profile: p, bloodwork: b }, subscription]) => {
        const row = p ? (p as { improvement_preference?: string; profile_type?: string; analysis_purchased_at?: string | null; results_flow_completed_at?: string | null }) : null
        const hasPaid = !!row?.analysis_purchased_at
        const hasCompletedResultsFlow = !!row?.results_flow_completed_at
        if (p) {
          const profileType =
            (row?.profile_type && row.profile_type.trim()) ||
            (p.goal || p.sport ? legacyGoalSportToProfileType(p.goal ?? "", p.sport ?? "") : "")
          setProfile({
            age: p.age ?? "",
            sex: p.sex ?? "",
            sport: p.sport ?? "",
            goal: p.goal ?? "",
            improvementPreference: row?.improvement_preference ?? "",
            profileType: profileType || "",
          })
          setHasPaidAnalysis(hasPaid)
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
          // Do not restore selectedPanel or inputs — was causing jump to Step 7 ("These markers matter most"). Clear panel so sync effect sets it from profile.
          setSelectedPanel([])
        } else {
          setLastBloodworkAt(null)
        }

        // Paid and finished the guided results flow (clicked "Go to Dashboard") → go to dashboard
        if (hasPaid && hasCompletedResultsFlow) {
          router.replace("/dashboard")
          return
        }

        // If returning from payment or subscription checkout, don't force welcome — dedicated effects will show results flow
        if (typeof window !== "undefined" && (window.location.search.includes("paid=1") || window.location.search.includes("subscription=success"))) return

        // Always start at first page (welcome). Set in same batch as other state so no intermediate render shows a later step.
        setCurrentStep(0)
        setAnalyzing(false)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when userId changes; router is stable
  }, [userId])

  // After $49 payment success: return to app and continue guided results flow (analysis → score → insights → stack → summary)
  // Treat ?paid=1 optimistically so we don't depend on webhook having run yet; restore bloodwork and show results
  useEffect(() => {
    if (!userId || searchParams.get("paid") !== "1") return
    loadSavedState(userId).then(({ profile: p, bloodwork: b }) => {
      setHasPaidAnalysis(true) // optimistic: they just came from checkout
      if (b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
        setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
      }
      if (Array.isArray(b?.selected_panel) && b.selected_panel.length > 0) {
        setSelectedPanel(b.selected_panel)
      }
      setCurrentStepRaw(8) // analysis loading → score reveal
      setAnalyzing(true)
      router.replace("/", { scroll: false })
    }).catch(() => router.replace("/", { scroll: false }))
  }, [userId, searchParams, router])

  // After subscription success: continue the survey (results flow) then they reach dashboard via "Go to Dashboard"
  useEffect(() => {
    if (!userId || searchParams.get("subscription") !== "success") return
    loadSavedState(userId).then(({ profile: p, bloodwork: b }) => {
      const row = p as { analysis_purchased_at?: string | null } | null
      if (row?.analysis_purchased_at && b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
        setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
        if (Array.isArray(b.selected_panel) && b.selected_panel.length > 0) setSelectedPanel(b.selected_panel)
        setHasPaidAnalysis(true)
        setCurrentStepRaw(8)
        setAnalyzing(true)
      }
      router.replace("/", { scroll: false })
    }).catch(() => router.replace("/", { scroll: false }))
  }, [userId, searchParams, router])

  // After sign-in: block Step 7 (currentStep 6) for 2.5s and correct any jump — nothing can set step to 6 in this window
  useEffect(() => {
    if (!userId) return
    blockStep6UntilRef.current = Date.now() + 2500
    const interval = setInterval(() => {
      setCurrentStep((s) => (s === 6 ? 0 : s))
    }, 200)
    const stop = setTimeout(() => clearInterval(interval), 2500)
    return () => {
      clearInterval(interval)
      clearTimeout(stop)
    }
  }, [userId])

  // Reset load flag and retest state when user logs out
  const resetDeps: [string | null] = [userId]
  useEffect(() => {
    if (!userId) {
      hasLoadedSaveRef.current = false
      setLastBloodworkAt(null)
      setRetestWeeks(8)
      setHasPaidAnalysis(false)
    }
  }, resetDeps)

  // After login redirect: start at step 1 (profile type) when URL has ?start=1
  useEffect(() => {
    if (authLoading || !user) return
    if (searchParams.get("start") === "1") {
      setCurrentStep(1)
      router.replace("/", { scroll: false })
    }
  }, [authLoading, user, searchParams, router])

  // Hash deep links from dashboard "Saved plan" (e.g. /#insights, /#stack)
  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.slice(1).toLowerCase()
    if (hash === "insights") setCurrentStepRaw(10)
    if (hash === "stack") setCurrentStepRaw(11)
  }, [])

  // DEV ONLY: ?preview= lets you jump to any screen (e.g. ?preview=score, ?preview=stack)
  const previewStepMap: Record<string, number> = {
    welcome: 0, goal: 1, activity: 2, supplements: 3, spend: 4, panel: 6, labs: 7,
    analysis: 8, score: 9, insights: 10, stack: 11, summary: 12,
  }
  useEffect(() => {
    if (!isDev) return
    const preview = searchParams.get("preview")
    if (!preview) return
    if (preview === "dashboard") {
      router.replace("/dashboard")
      return
    }
    const step = previewStepMap[preview.toLowerCase()]
    if (typeof step === "number") {
      setCurrentStepRaw(step)
      if (step === 8) setAnalyzing(true)
      if (step === 9) setAnalyzing(false)
    }
  }, [isDev, searchParams, router])

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

  // Save profile when user and profile/habits change (debounced).
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
    string,
    string,
  ] = [
    userId,
    profile.age,
    profile.sex,
    profile.sport,
    profile.goal,
    profile.improvementPreference ?? "",
    profile.profileType ?? "",
    currentSupplementSpend,
    currentSupplements,
    shoppingPreference,
  ]
  useEffect(() => {
    if (!userId) return
    const hasProfileData =
      profile.age.trim() !== "" ||
      profile.sex.trim() !== "" ||
      profile.goal.trim() !== "" ||
      (profile.profileType ?? "").trim() !== "" ||
      (profile.improvementPreference ?? "").trim() !== ""
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
        improvement_preference: profile.improvementPreference ?? "",
        profile_type: profile.profileType ?? "",
      }).catch(() => {})
    }, 800)
    return () => {
      if (saveProfileRef.current) clearTimeout(saveProfileRef.current)
    }
  }, profileDeps)

  // Save bloodwork panel to Supabase when user reaches score step (9) or later
  const lastSavedStepRef = useRef(-1)
  const bloodworkSaveDeps: [string | null, number] = [userId, currentStep]
  useEffect(() => {
    if (!userId || currentStep < 9) return
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
    // Don't set step here — child handleUseRecommended advances to lab step; parent must never set 6 (Step 7 panel) or we skip to "These markers matter most" on load
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
    const step = typeof save.current_step === "number" && save.current_step >= 0 && save.current_step <= 11
      ? save.current_step
      : typeof save.current_step === "number" && save.current_step >= 1 && save.current_step <= 6
        ? ({ 1: 1, 2: 2, 3: 5, 4: 6, 5: 8, 6: 10 } as Record<number, number>)[save.current_step] ?? 8
        : 8
    // Never jump to panel step (6 = Step 7) when user is on welcome/profile — prevents post-sign-in jump bug
    setCurrentStep((prev) => (prev <= 1 && step === 6 ? prev : step))
  }

  function toggleScience(marker: string) {
    setOpenScienceMarkers((prev) => ({ ...prev, [marker]: !prev[marker] }))
  }

  function toggleCompare(key: string) {
    setOpenCompareCards((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Prevent skipping steps: never jump more than one step
  const setCurrentStepSafe = useCallback((arg: number | ((prev: number) => number)) => {
    setCurrentStep((prev) => {
      const next = typeof arg === "function" ? arg(prev) : arg
      if (next > prev + 1) return prev + 1
      return next
    })
  }, [])

  const onWelcomeContinue = useCallback(() => {
    if (!user) {
      router.push("/login?next=" + encodeURIComponent("/?start=1"))
      return
    }
    setCurrentStepSafe(1)
  }, [user, router])

  const onGoToDashboard = useCallback(() => {
    fetch("/api/complete-results-flow", { method: "POST" })
      .then((r) => { if (!r.ok) throw new Error("Failed to complete") })
      .then(() => router.push("/dashboard"))
      .catch(() => router.push("/dashboard"))
  }, [router])

  // Show loading only while auth is resolving; then show onboarding for everyone (logged-in users see "Dashboard" in header)
  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--clarion-bg-gradient, #0f0a1a)" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>Loading…</p>
      </main>
    )
  }

  // Returning from subscription: show loading briefly while we restore state and continue the survey (no Welcome)
  if (user && searchParams.get("subscription") === "success") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--clarion-bg-gradient, #0f0a1a)" }}>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}>Continuing your analysis…</p>
      </main>
    )
  }

  return (
    <>
    {isDev && (
      <div className="dev-preview-switcher" aria-hidden>
        <span className="dev-preview-label">Dev preview</span>
        <div className="dev-preview-links">
          {["welcome", "goal", "activity", "supplements", "spend", "panel", "labs", "analysis", "score", "insights", "stack", "summary"].map((p) => (
            <Link key={p} href={"/?preview=" + p} className="dev-preview-link">{p}</Link>
          ))}
          <Link href="/dashboard" className="dev-preview-link">dashboard</Link>
        </div>
      </div>
    )}
    <OnboardingFlow
      currentStep={currentStep}
      setCurrentStep={setCurrentStepSafe}
      profile={profile}
      setProfile={setProfile}
      onWelcomeContinue={onWelcomeContinue}
      hasPaidAnalysis={effectiveHasPaidAnalysis}
      currentSupplementSpend={currentSupplementSpend}
      setCurrentSupplementSpend={setCurrentSupplementSpend}
      currentSupplements={currentSupplements}
      setCurrentSupplements={setCurrentSupplements}
      selectedPanel={selectedPanel}
      setSelectedPanel={setSelectedPanel}
      inputs={inputs}
      handleInputChange={handleInputChange}
      recommendedMarkers={recommendedMarkers}
      biomarkerKeys={biomarkerKeys}
      activePanel={activePanel}
      togglePanelMarker={togglePanelMarker}
      useRecommendedPanel={useRecommendedPanel}
      hasEnoughLabsFlag={hasEnoughLabsFlag}
      loadExampleData={loadExampleData}
      analysisResults={analysisResults}
      score={score}
      statusCounts={statusCounts}
      scoreToLabel={scoreToLabel}
      optimizedStack={optimizedStack}
      userCurrentSpend={userCurrentSpend}
      optimizedSpend={optimizedSpend}
      estimatedSavingsVsCurrent={estimatedSavingsVsCurrent}
      annualSavings={annualSavings}
      openCompareCards={openCompareCards}
      toggleCompare={toggleCompare}
      openScienceMarkers={openScienceMarkers}
      toggleScience={toggleScience}
      analyzing={analyzing}
      setAnalyzing={setAnalyzing}
      userId={userId}
      previousReports={previousReports}
      previousReportsLoading={previousReportsLoading}
      handleOpenReport={handleOpenReport}
      onGoToDashboard={onGoToDashboard}
    />
    </>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--clarion-bg-gradient, #0f0a1a)" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>Loading…</p>
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
