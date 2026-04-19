"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile, saveBloodwork, getBloodworkHistory, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SavedSupplementStackItem, SubscriptionRow } from "@/src/lib/bloodwiseDb"
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
  hasAnyBiomarkerValue,
  hasEnoughLabs,
  type ProfileState,
} from "@/src/lib/panelEngine"
import {
  hasClarionAnalysisAccess,
  isDevPaywallBypass,
  subscriptionStatusGrantsAccess,
  type BloodworkLike,
} from "@/src/lib/accessGate"
import {
  legacyGoalSportToProfileType,
  parseHealthGoalIds,
  primaryProfileTypeFromHealthGoalsAndTraining,
} from "@/src/lib/clarionProfiles"
import { computeSavings } from "@/src/lib/savingsEngine"
import { getOrderedFocusResults } from "@/src/lib/scoreBreakdown"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getStatusTone, inferWhyItMatters, inferNextStep, getPrioritySummary } from "@/src/lib/priorityEngine"
import { detectPatterns } from "@/src/lib/patternEngine"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"
import { OnboardingFlow } from "@/src/components/OnboardingFlow"
import { clearReauthPrompt, shouldShowReauthPrompt } from "@/src/lib/reauthPrompt"
import { analysisReportIntroStorageKey } from "@/src/lib/analysisReportIntro"

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

  const biomarkerKeys = useMemo(() => getBiomarkerKeys(), [])

  const [profile, setProfile] = useState<ProfileState>({
    age: "",
    sex: "",
    sport: "",
    goal: "",
    improvementPreference: "",
    profileType: "",
    heightCm: "",
    weightKg: "",
    supplementFormPreference: "any",
    activityLevel: "",
    sleepHours: "",
    exerciseRegularly: "",
    alcohol: "",
    healthGoal: "",
    trainingFocus: "",
    symptoms: "",
    dietPreference: "",
    planTier: "",
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
      // Block biomarker step (8) until ready — prevents post-sign-in race to panel
      if (next === 8 && Date.now() < blockStep6UntilRef.current) return prev
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
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  /** Latest saved bloodwork — drives `hasClarionAnalysisAccess` legacy path when subscription/profile lags. */
  const [bloodworkForAccess, setBloodworkForAccess] = useState<BloodworkLike>(null)

  const profileForAccess = useMemo(
    () => ({
      analysis_purchased_at: hasPaidAnalysis ? "1" : null,
      plan_tier: profile.planTier ?? null,
    }),
    [hasPaidAnalysis, profile.planTier]
  )

  const hasPaidUnlock = useMemo(
    () => hasClarionAnalysisAccess(profileForAccess, subscription, bloodworkForAccess),
    [profileForAccess, subscription, bloodworkForAccess]
  )
  const effectiveHasPaidAnalysis = isDevPaywallBypass() || useMockResults ? true : hasPaidUnlock

  const [homeReady, setHomeReady] = useState(false)
  const [showReauthPrompt, setShowReauthPrompt] = useState(false)

  const isProfileReady = Boolean(
    profile.profileType?.trim() || profile.healthGoal?.trim() || (profile.goal.trim() && profile.sport.trim())
  )

  // Stable panel from profile only (avoids feedback loops with analysis ordering).
  const profileRecommendedMarkers = useMemo(() => {
    return getAdaptiveRecommendedMarkers(profile, biomarkerKeys)
  }, [profile, biomarkerKeys])

  useEffect(() => {
    if (profileRecommendedMarkers.length && selectedPanel.length === 0) {
      setSelectedPanel(profileRecommendedMarkers)
    }
  }, [profileRecommendedMarkers, selectedPanel.length])

  const activePanel = useMemo(
    () => getActivePanel(selectedPanel, profileRecommendedMarkers),
    [selectedPanel, profileRecommendedMarkers]
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
        ...(profile.trainingFocus?.trim() ? { training_focus: profile.trainingFocus } : {}),
      }

      return analyzeBiomarkers(
        enteredBiomarkers,
        analysisProfile as any
      ) as AnalysisResult[]
    } catch {
      return [] as AnalysisResult[]
    }
  }, [enteredBiomarkers, profile])

  const optimalEnteredKeys = useMemo(
    () =>
      analysisResults
        .filter((r) => r.status === "optimal" && r.name)
        .map((r) => r.name as string),
    [analysisResults]
  )

  const recommendedMarkers = useMemo(() => {
    return getAdaptiveRecommendedMarkers(profile, biomarkerKeys, {
      deprioritizeOptimalKeys: optimalEnteredKeys,
    })
  }, [profile, biomarkerKeys, optimalEnteredKeys])

  const score = useMemo(() => {
    if (!analysisResults.length) return 0
    try {
      return calculateScore(analysisResults as any) || 0
    } catch {
      return 0
    }
  }, [analysisResults])

  const priorityContext = useMemo(
    () =>
      buildPriorityContextFromProfile({
        age: profile.age,
        sex: profile.sex,
        sport: profile.sport,
        goal: profile.goal,
        profile_type: profile.profileType?.trim() ? profile.profileType : null,
        health_goals: profile.healthGoal?.trim() ? profile.healthGoal : null,
        training_focus: profile.trainingFocus?.trim() ? profile.trainingFocus : null,
        symptoms: profile.symptoms?.trim() ? profile.symptoms : null,
      }),
    [
      profile.age,
      profile.sex,
      profile.sport,
      profile.goal,
      profile.profileType,
      profile.healthGoal,
      profile.trainingFocus,
      profile.symptoms,
    ]
  )

  const topFocus = useMemo(
    () => getOrderedFocusResults(analysisResults as any, 3, priorityContext),
    [analysisResults, priorityContext]
  )

  const supplementRecs = useMemo(() => {
    try {
      return supplementRecommendations(analysisResults as any, {
        supplementFormPreference: profile.supplementFormPreference === "no_pills" ? "no_pills" : "any",
        profile: {
          shopping_preference: shoppingPreference,
          diet_preference: profile.dietPreference?.trim() || null,
          supplement_form_preference: profile.supplementFormPreference ?? "any",
          improvement_preference: profile.improvementPreference ?? null,
          sport: profile.sport?.trim() || null,
          goal: profile.goal?.trim() || null,
          profile_type: profile.profileType?.trim() || null,
          health_goals: profile.healthGoal?.trim() || null,
          activity_level: profile.activityLevel?.trim() || null,
        },
      }) || []
    } catch {
      return []
    }
  }, [
    analysisResults,
    profile.supplementFormPreference,
    profile.dietPreference,
    profile.improvementPreference,
    profile.sport,
    profile.goal,
    profile.profileType,
    profile.healthGoal,
    profile.activityLevel,
    shoppingPreference,
  ])

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

  /** When user reaches analysis/results, re-fetch profile + subscription so retake survey doesn’t miss paid access. */
  useEffect(() => {
    if (!userId || currentStep < 12) return
    let cancelled = false
    Promise.all([loadSavedState(userId), getSubscription(userId)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        if (cancelled) return
        setBloodworkForAccess(b ?? null)
        if (p && (p as ProfileRow).analysis_purchased_at) setHasPaidAnalysis(true)
        const subActive = subscriptionStatusGrantsAccess(sub?.status)
        const tierLc = ((p as ProfileRow)?.plan_tier ?? "").toLowerCase()
        if (subActive || tierLc === "full" || tierLc === "lite") setHasPaidAnalysis(true)
        if (p) {
          const pt = ((p as ProfileRow).plan_tier ?? "").trim()
          setProfile((prev) => ({ ...prev, planTier: pt || undefined }))
        }
        setSubscription(sub)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, currentStep])

  const isDueForRetest = useMemo(() => {
    if (!lastBloodworkAt || !retestWeeks) return false
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    return Date.now() - last >= weeksMs
  }, [lastBloodworkAt, retestWeeks])

  // When logged out, allow home to render immediately; when logging in, wait for saved state load
  useEffect(() => {
    if (!userId) {
      setHomeReady(true)
      setShowReauthPrompt(false)
    } else {
      setHomeReady(false)
    }
  }, [userId])

  // On login: load saved profile and bloodwork from Supabase and populate form fields
  const stepFromUrl = searchParams.get("step")
  const reauthFromUrl = searchParams.get("reauth")
  useEffect(() => {
    if (!userId) return
    const wantsLabsEntry = stepFromUrl === "labs" || stepFromUrl === "8"
    const wantsSurveyEntry = stepFromUrl === "survey" || stepFromUrl === "welcome"
    const forceReload =
      typeof window !== "undefined" &&
      (reauthFromUrl === "1" || shouldShowReauthPrompt() || wantsLabsEntry || wantsSurveyEntry)
    if (!forceReload && hasLoadedSaveRef.current) return
    hasLoadedSaveRef.current = true
    // If returning from payment or subscription checkout, don't force welcome — dedicated effects will show results flow
    const search = typeof window !== "undefined" ? window.location.search : ""
    const isPaymentReturn = search.includes("paid=1")
    const isSubscriptionReturn = search.includes("subscription=success")
    const stepParam = typeof window !== "undefined" ? new URLSearchParams(search).get("step") : null
    const viewParam = typeof window !== "undefined" ? new URLSearchParams(search).get("view") : null
    const goToLabs = stepParam === "labs" || stepParam === "8"
    const goToSurvey = stepParam === "survey" || stepParam === "welcome"
    if (!isPaymentReturn && !isSubscriptionReturn && !viewParam) {
      if (goToLabs) setCurrentStepRaw(8)
      else if (goToSurvey) setCurrentStepRaw(0)
      else setCurrentStep(0)
      setAnalyzing(false)
    }
    /** When we send the user to /dashboard, do not set homeReady — otherwise survey flashes before the client navigation completes. */
    let suppressHomeReadyAfterDashboardRedirect = false

    Promise.all([loadSavedState(userId), getSubscription(userId)])
      .then(([{ profile: p, bloodwork: b }, subscription]) => {
        setBloodworkForAccess(b ?? null)
        const row = p ? (p as { improvement_preference?: string; profile_type?: string; analysis_purchased_at?: string | null; results_flow_completed_at?: string | null }) : null
        const hasPaid = !!row?.analysis_purchased_at
        const hasCompletedResultsFlow = !!row?.results_flow_completed_at
        if (p) {
          const rowProfile = p as ProfileRow
          const healthGoalCsv = rowProfile.health_goals?.trim() ?? ""
          const goalIds = parseHealthGoalIds(healthGoalCsv)
          const tf = rowProfile.training_focus?.trim() ?? ""
          let profileType = primaryProfileTypeFromHealthGoalsAndTraining(goalIds, tf)
          if (goalIds.length === 0 && !tf) {
            const legacy =
              (row?.profile_type && row.profile_type.trim()) ||
              (p.goal || p.sport ? legacyGoalSportToProfileType(p.goal ?? "", p.sport ?? "") : "")
            if (legacy) profileType = legacy as typeof profileType
          }
          setProfile({
            age: p.age ?? "",
            sex: p.sex ?? "",
            sport: p.sport ?? "",
            goal: p.goal ?? "",
            improvementPreference: row?.improvement_preference ?? "",
            profileType: profileType || "",
            heightCm: rowProfile?.height_cm != null ? String(rowProfile.height_cm) : "",
            weightKg: rowProfile?.weight_kg != null ? String(rowProfile.weight_kg) : "",
            supplementFormPreference: (rowProfile?.supplement_form_preference === "no_pills" ? "no_pills" : "any") as "any" | "no_pills",
            healthGoal: healthGoalCsv,
            trainingFocus: tf,
            symptoms: (p as ProfileRow).symptoms ?? "",
            dietPreference: rowProfile?.diet_preference ?? "",
            activityLevel: rowProfile?.activity_level ?? "",
            sleepHours: rowProfile?.sleep_hours_band ?? "",
            exerciseRegularly: rowProfile?.exercise_regularly ?? "",
            alcohol: rowProfile?.alcohol_frequency ?? "",
            planTier: (rowProfile?.plan_tier ?? "").trim() || undefined,
          })
          const subActiveOnLoad = subscriptionStatusGrantsAccess(subscription?.status)
          const tierLc = (rowProfile?.plan_tier ?? "").toLowerCase()
          const tierUnlockOnLoad = tierLc === "full" || tierLc === "lite"
          // Don’t overwrite optimistic paid state when returning from checkout (webhook may lag behind redirect).
          setHasPaidAnalysis(
            hasPaid || isPaymentReturn || isSubscriptionReturn || subActiveOnLoad || tierUnlockOnLoad
          )
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
              health_goals: rowProfile.health_goals ?? undefined,
            }).catch(() => {})
          }
        }
        setSubscription(subscription)
        if (!p) {
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

        // Dashboard "Saved plan" links: ?view=insights or ?view=stack — show that results step with saved data (must run before hasAccess redirect)
        const view = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") : null
        if ((view === "insights" || view === "stack") && (hasPaid || (b && (b.score != null || (b.selected_panel?.length ?? 0) > 0)))) {
          setHasPaidAnalysis(true)
          if (b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
            setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
          }
          if (Array.isArray(b?.selected_panel) && b.selected_panel.length > 0) {
            setSelectedPanel(b.selected_panel)
          }
          setCurrentStepRaw(view === "insights" ? 12 : 13)
          router.replace("/?view=" + view, { scroll: false })
          return
        }

        // If returning from payment or subscription checkout, don't redirect — dedicated effects will show results flow.
        // Use flags captured when this effect ran, not window.location here: the ?paid=1 effect may have already
        // router.replace("/")'d and stripped the query before this promise resolves, which would wrongly fall through to setCurrentStep(0).
        if (isPaymentReturn || isSubscriptionReturn) return

        const subActive = subscriptionStatusGrantsAccess(subscription?.status)
        const hasBloodworkAccess = b && (b.score != null || (b.selected_panel?.length ?? 0) > 0)
        const hasAccess = hasPaid || subActive || !!hasBloodworkAccess

        // After explicit logout → sign-in: ask dashboard vs retake survey (don't auto-jump past home)
        const wantsReauth =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("reauth") === "1" || shouldShowReauthPrompt())
        if (wantsReauth) {
          setShowReauthPrompt(true)
          router.replace("/", { scroll: false })
          return
        }

        const wantsLabsSurvey =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("step") === "labs" ||
            new URLSearchParams(window.location.search).get("step") === "8")

        // Logged-in user explicitly opening /?step=labs — stay on home and open labs flow (do not send to dashboard)
        if (hasAccess && wantsLabsSurvey) {
          blockStep6UntilRef.current = 0
          if (b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
            setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
          }
          if (Array.isArray(b?.selected_panel) && b.selected_panel.length > 0) {
            setSelectedPanel(b.selected_panel)
          }
          const targetStep = hasBloodworkAccess ? 10 : 8
          setCurrentStepRaw(targetStep)
          router.replace("/?step=labs", { scroll: false })
          return
        }

        const wantsFullSurvey =
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("step") === "survey" ||
            new URLSearchParams(window.location.search).get("step") === "welcome")

        // Logged-in user opening full onboarding from /?step=survey — stay on home at welcome (do not send to dashboard)
        if (hasAccess && wantsFullSurvey) {
          blockStep6UntilRef.current = 0
          setAnalyzing(false)
          setCurrentStepRaw(0)
          router.replace("/?step=survey", { scroll: false })
          return
        }

        // Logged-in user with access (paid, subscription, or saved bloodwork) → go straight to dashboard (app-first entry)
        if (hasAccess) {
          suppressHomeReadyAfterDashboardRedirect = true
          router.replace("/dashboard")
          return
        }

        const step = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("step") : null
        if (step === "labs" || step === "8") {
          setCurrentStepRaw(8)
        } else if (step === "survey" || step === "welcome") {
          setCurrentStepRaw(0)
        } else {
          setCurrentStep(0)
        }
        setAnalyzing(false)
      })
      .catch(() => {})
      .finally(() => {
        if (!suppressHomeReadyAfterDashboardRedirect) setHomeReady(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when ?step=labs / ?step=survey / ?reauth= so dashboard links work
  }, [userId, stepFromUrl, reauthFromUrl])

  // After $49 payment success: return to app and continue guided results flow (analysis → score → insights → stack → summary)
  // Treat ?paid=1 optimistically so we don't depend on webhook having run yet; restore bloodwork and show results
  useEffect(() => {
    if (!userId || searchParams.get("paid") !== "1") return
    loadSavedState(userId).then(({ profile: p, bloodwork: b }) => {
      setBloodworkForAccess(b ?? null)
      setHasPaidAnalysis(true) // optimistic: they just came from checkout
      if (b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
        setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
      }
      if (Array.isArray(b?.selected_panel) && b.selected_panel.length > 0) {
        setSelectedPanel(b.selected_panel)
      }
      setCurrentStepRaw(10) // analysis loading → score reveal
      setAnalyzing(true)
      router.replace("/", { scroll: false })
    }).catch(() => router.replace("/", { scroll: false }))
  }, [userId, searchParams, router])

  // After subscription success: continue the survey (results flow) then they reach dashboard via "Go to Dashboard"
  useEffect(() => {
    if (!userId || searchParams.get("subscription") !== "success") return
    loadSavedState(userId).then(({ profile: p, bloodwork: b }) => {
      setBloodworkForAccess(b ?? null)
      const row = p as { analysis_purchased_at?: string | null } | null
      if (row?.analysis_purchased_at && b?.biomarker_inputs && typeof b.biomarker_inputs === "object") {
        setInputs((prev) => ({ ...prev, ...b.biomarker_inputs }))
        if (Array.isArray(b.selected_panel) && b.selected_panel.length > 0) setSelectedPanel(b.selected_panel)
        setHasPaidAnalysis(true)
        setCurrentStepRaw(10)
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
      setSubscription(null)
      setBloodworkForAccess(null)
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
    if (hash === "insights") setCurrentStepRaw(12)
    if (hash === "stack") setCurrentStepRaw(13)
  }, [])

  // DEV ONLY: ?preview= lets you jump to any screen (e.g. ?preview=score, ?preview=stack)
  const previewStepMap: Record<string, number> = {
    welcome: 0,
    survey: 0,
    goal: 1,
    activity: 2,
    supplements: 4,
    spend: 5,
    panel: 6,
    havelabs: 7,
    labs: 8,
    bloodtest: 9,
    analysis: 10,
    score: 11,
    insights: 12,
    stack: 13,
    summary: 14,
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
      if (step === 10) setAnalyzing(true)
      if (step === 11) setAnalyzing(false)
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
  const profileDeps = [
    userId,
    profile.age,
    profile.sex,
    profile.sport,
    profile.goal,
    profile.improvementPreference ?? "",
    profile.profileType ?? "",
    profile.healthGoal ?? "",
    profile.trainingFocus ?? "",
    profile.symptoms ?? "",
    profile.dietPreference ?? "",
    profile.activityLevel ?? "",
    profile.sleepHours ?? "",
    profile.exerciseRegularly ?? "",
    profile.alcohol ?? "",
    profile.heightCm ?? "",
    profile.weightKg ?? "",
    profile.supplementFormPreference ?? "any",
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
      (profile.healthGoal ?? "").trim() !== "" ||
      (profile.improvementPreference ?? "").trim() !== "" ||
      (profile.trainingFocus ?? "").trim() !== "" ||
      (profile.symptoms ?? "").trim() !== "" ||
      (profile.dietPreference ?? "").trim() !== "" ||
      (profile.activityLevel ?? "").trim() !== "" ||
      (profile.sleepHours ?? "").trim() !== "" ||
      (profile.exerciseRegularly ?? "").trim() !== "" ||
      (profile.alcohol ?? "").trim() !== "" ||
      (profile.heightCm ?? "").trim() !== "" ||
      (profile.weightKg ?? "").trim() !== "" ||
      currentSupplementSpend.trim() !== "" ||
      currentSupplements.trim() !== ""
    if (!hasProfileData) return
    saveProfileRef.current = setTimeout(() => {
      const heightVal = profile.heightCm?.trim() ? Number(profile.heightCm) : undefined
      const weightVal = profile.weightKg?.trim() ? Number(profile.weightKg) : undefined
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
        health_goals: profile.healthGoal?.trim() ? profile.healthGoal : undefined,
        training_focus: profile.trainingFocus?.trim() ? profile.trainingFocus : undefined,
        symptoms: profile.symptoms?.trim() ? profile.symptoms : undefined,
        diet_preference: profile.dietPreference?.trim() ? profile.dietPreference : undefined,
        activity_level: profile.activityLevel?.trim() ? profile.activityLevel : undefined,
        sleep_hours_band: profile.sleepHours?.trim() ? profile.sleepHours : undefined,
        exercise_regularly: profile.exerciseRegularly?.trim() ? profile.exerciseRegularly : undefined,
        alcohol_frequency: profile.alcohol?.trim() ? profile.alcohol : undefined,
        height_cm: Number.isFinite(heightVal) ? heightVal : undefined,
        weight_kg: Number.isFinite(weightVal) ? weightVal : undefined,
        supplement_form_preference: profile.supplementFormPreference === "no_pills" ? "no_pills" : "any",
      }).catch(() => {})
    }, 800)
    return () => {
      if (saveProfileRef.current) clearTimeout(saveProfileRef.current)
    }
  }, profileDeps)

  // Save bloodwork panel to Supabase when user reaches score step (11) or later
  const lastSavedStepRef = useRef(-1)

  /** Avoid stale step dedupe after logout → retake survey (same component instance) or account switch. */
  useEffect(() => {
    lastSavedStepRef.current = -1
  }, [userId])

  const bloodworkSaveDeps: [string | null, number, boolean] = [userId, currentStep, effectiveHasPaidAnalysis]
  useEffect(() => {
    if (!userId || currentStep < 11) return
    if (!hasAnyBiomarkerValue(inputs)) return
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
              marker: rec.marker ?? (Array.isArray(rec.duplicateMarkersMerged) ? rec.duplicateMarkersMerged[0] : undefined),
              ...(rec.stackHint ? { stackHint: rec.stackHint } : {}),
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
    })
      .then(() => {
        if (!userId || typeof window === "undefined") return
        if (!effectiveHasPaidAnalysis) return
        try {
          const k = analysisReportIntroStorageKey(userId)
          if (localStorage.getItem(k)) return
          localStorage.setItem(k, "1")
          router.push("/dashboard/analysis?intro=1")
        } catch {
          router.push("/dashboard/analysis?intro=1")
        }
      })
      .catch(() => {})
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
    const step = typeof save.current_step === "number" && save.current_step >= 0 && save.current_step <= 14
      ? save.current_step
      : 12
    // Never jump to panel step (8) when user is on hook/age — prevents post-sign-in jump bug
    setCurrentStep((prev) => (prev <= 1 && step === 8 ? prev : step))
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
      .then(() => router.push("/dashboard?newResults=1"))
      .catch(() => router.push("/dashboard?newResults=1"))
  }, [router])

  const handleReauthContinueDashboard = useCallback(() => {
    clearReauthPrompt()
    setShowReauthPrompt(false)
    router.replace("/dashboard")
  }, [router])

  const handleReauthRetakeSurvey = useCallback(() => {
    clearReauthPrompt()
    setShowReauthPrompt(false)
    lastSavedStepRef.current = -1
    blockStep6UntilRef.current = Date.now() + 2500
    setCurrentStepRaw(0)
    setAnalyzing(false)
    setProfile({
      age: "",
      sex: "",
      sport: "",
      goal: "",
      improvementPreference: "",
      profileType: "",
      heightCm: "",
      weightKg: "",
      supplementFormPreference: "any",
      activityLevel: "",
      sleepHours: "",
      exerciseRegularly: "",
      alcohol: "",
      healthGoal: "",
      trainingFocus: "",
      symptoms: "",
      dietPreference: "",
      planTier: undefined,
    })
    setInputs((prev) => {
      const next: BiomarkerInputMap = {}
      biomarkerKeys.forEach((key) => {
        next[key] = ""
      })
      return next
    })
    setSelectedPanel([])
    setCurrentSupplementSpend("")
    setCurrentSupplements("")
    setShoppingPreference("Best value")
    setHasLoadedExample(false)
    setOpenScienceMarkers({})
    setOpenCompareCards({})
    router.replace("/", { scroll: false })
  }, [biomarkerKeys, router])

  /** Go directly to blood-test options step (11) from "have labs?" (9) when user says No — bypasses step guard */
  const goToBloodTestStep = useCallback(() => setCurrentStepRaw(11), [])
  /** Go directly to labs step (10) from blood-test step (11) to avoid any step-guard loop */
  const goToLabsStep = useCallback(() => setCurrentStepRaw(10), [])
  /** Go directly to analysis step (12) from labs (10) when user clicks Analyze — bypasses step guard */
  const goToAnalysisStep = useCallback(() => {
    setCurrentStepRaw(12)
    setAnalyzing(true)
  }, [])

  // Show loading only while auth is resolving; then show onboarding for everyone (logged-in users see "Dashboard" in header)
  if (authLoading) {
    return (
      <main className="clarion-loading-wrap">
        <div style={{ display: "flex", gap: 8 }}>
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
        </div>
        <p>Loading…</p>
      </main>
    )
  }

  // Returning from subscription: show loading briefly while we restore state and continue the survey (no Welcome)
  if (user && searchParams.get("subscription") === "success") {
    return (
      <main className="page-loading-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <p className="page-loading-text">Continuing your analysis…</p>
      </main>
    )
  }

  if (user && !homeReady) {
    return (
      <main className="clarion-loading-wrap">
        <div style={{ display: "flex", gap: 8 }}>
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
        </div>
        <p>Loading…</p>
      </main>
    )
  }

  if (user && showReauthPrompt) {
    return (
      <main className="reauth-choice-shell">
        <div className="reauth-choice-card">
          <h1 className="reauth-choice-title">Welcome back</h1>
          <p className="reauth-choice-body">
            Continue to your dashboard with your saved labs and plan, or retake the full survey to update your profile and recommendations.
            {hasPaidUnlock && (
              <span className="reauth-choice-note">
                {" "}
                Your Clarion access from your purchase or subscription still applies—you won&apos;t be asked to pay again to see results.
              </span>
            )}
          </p>
          <div className="reauth-choice-actions">
            <button type="button" className="reauth-choice-btn reauth-choice-btn-primary" onClick={handleReauthContinueDashboard}>
              Continue to dashboard
            </button>
            <button type="button" className="reauth-choice-btn reauth-choice-btn-secondary" onClick={handleReauthRetakeSurvey}>
              Retake survey
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
    {isDev && (
      <div className="dev-preview-switcher" aria-hidden>
        <span className="dev-preview-label">Dev preview</span>
        <div className="dev-preview-links">
          {["welcome", "goal", "activity", "supplements", "spend", "panel", "havelabs", "labs", "bloodtest", "analysis", "score", "insights", "stack", "summary"].map((p) => (
            <Link key={p} href={"/?preview=" + p} className="dev-preview-link">{p}</Link>
          ))}
          <Link href="/?step=survey" className="dev-preview-link" title="Same as prod: full survey when logged in">
            survey
          </Link>
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
      goToBloodTestStep={goToBloodTestStep}
      goToLabsStep={goToLabsStep}
      goToAnalysisStep={goToAnalysisStep}
      hasActiveSubscription={subscriptionStatusGrantsAccess(subscription?.status)}
      resultsView={searchParams.get("view")}
    />
    </>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="clarion-loading-wrap">
          <div style={{ display: "flex", gap: 8 }}>
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading…</p>
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
