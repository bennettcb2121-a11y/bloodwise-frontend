"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const [hasPaidAnalysis, setHasPaidAnalysis] = useState(false)

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
  const [currentStep, setCurrentStep] = useState(0)
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
  const loadDeps: [string | null] = [userId]
  useEffect(() => {
    if (!userId || hasLoadedSaveRef.current) return
    hasLoadedSaveRef.current = true
    loadSavedState(userId)
      .then(({ profile: p, bloodwork: b }) => {
        const row = p ? (p as { improvement_preference?: string; profile_type?: string; analysis_purchased_at?: string | null }) : null
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
          setHasPaidAnalysis(!!row?.analysis_purchased_at)
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
          // Use new profile-based recommended panel so we show all added biomarkers; only fall back to saved panel if no profile type
          const profileTypeForPanel =
            (row?.profile_type && String(row.profile_type).trim()) ||
            (p?.goal || p?.sport ? legacyGoalSportToProfileType(p?.goal ?? "", p?.sport ?? "") : "")
          if (profileTypeForPanel) {
            const profileForPanel: ProfileState = {
              age: p?.age ?? "",
              sex: p?.sex ?? "",
              sport: p?.sport ?? "",
              goal: p?.goal ?? "",
              improvementPreference: (row?.improvement_preference ?? "") as string,
              profileType: profileTypeForPanel,
            }
            setSelectedPanel(getAdaptiveRecommendedMarkers(profileForPanel, biomarkerKeys))
          } else if (Array.isArray(b.selected_panel) && b.selected_panel.length > 0) {
            setSelectedPanel(b.selected_panel)
          }
          if (b.biomarker_inputs && typeof b.biomarker_inputs === "object") {
            setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
          }
          // Never restore to results steps (9–12) on load so we don't land on a broken/empty score screen
          let stepToRestore: number | null = null
          if (typeof b.current_step === "number" && b.current_step >= 0 && b.current_step <= 12) {
            stepToRestore = b.current_step
          } else if (typeof b.current_step === "number" && b.current_step >= 1 && b.current_step <= 6) {
            const map: Record<number, number> = { 1: 1, 2: 2, 3: 5, 4: 6, 5: 8, 6: 10 }
            stepToRestore = map[b.current_step] ?? 8
          }
          if (stepToRestore !== null) {
            const capped = stepToRestore >= 9 ? 8 : stepToRestore
            setCurrentStep(capped)
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
    setCurrentStep(6)
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
    setCurrentStep(step)
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

  // Show loading only while auth is resolving; then show onboarding for everyone (logged-in users see "Dashboard" in header)
  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--clarion-bg-gradient, #0f0a1a)" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>Loading…</p>
      </main>
    )
  }

  return (
    <OnboardingFlow
      currentStep={currentStep}
      setCurrentStep={setCurrentStepSafe}
      profile={profile}
      setProfile={setProfile}
      onWelcomeContinue={onWelcomeContinue}
      hasPaidAnalysis={hasPaidAnalysis}
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
    />
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
