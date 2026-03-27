"use client"

import React, { useCallback, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile, getSubscription, getBloodworkHistory, getProtocolLog, getProtocolLogHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SavedSupplementStackItem, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { scoreToLabel, countByStatus } from "@/src/lib/scoreEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"
import { getScoreBreakdown, getScoreDrivers, getImprovementForecast, getOrderedScoreDrivers, getCategoryForMarker, SCORE_CATEGORIES } from "@/src/lib/scoreBreakdown"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getDashboardStatus, getDoThisFirst } from "@/src/lib/dashboardStatus"
import { getContextualInsight } from "@/src/lib/dashboardContextLine"
import { getAdherence } from "@/src/lib/adherence"
import { getEarnedBadges } from "@/src/lib/badges"
import { getLatestLearningItem, getLearningItemForPriority } from "@/src/lib/learningFeed"
import { getLongTermInsightForPriorities } from "@/src/lib/longTermInsights"
import { buildTopFocus, getPrioritySummary, getStatusTone, getStatusToneFriendly, inferWhyItMatters } from "@/src/lib/priorityEngine"
import { getGuidesForPriorities, getGuidesForBiomarker } from "@/src/lib/guides"
import {
  getFeaturedMicrocopy,
  getTodaysTip,
  getTodayFocusActionsWithIcons,
  splitFeaturedTodayActions,
} from "@/src/lib/dashboardTips"
import { parseSupplementRow, shortStackDoseLabel } from "@/src/lib/supplementDisplay"
import { CHALLENGES, getChallengeProgress, getChallengeExtra } from "@/src/lib/challenges"
import { hasClarionAnalysisAccess } from "@/src/lib/accessGate"
import { BookOpen, Trophy, Settings as SettingsIcon, ListChecks, Target, Lightbulb, ArrowUpCircle, Package, BarChart2, LineChart, ChevronDown } from "lucide-react"
import { TypewriterHeading } from "@/src/components/TypewriterHeading"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { AddToHomeScreenPopup } from "@/src/components/AddToHomeScreenPopup"
import { CLARION_OPEN_ASSISTANT_EVENT } from "@/src/components/ClarionAssistant"
import { ProtocolTracker } from "@/src/components/ProtocolTracker"
import { DailyHealthCheckIn } from "@/src/components/DailyHealthCheckIn"
import { BetweenPanelsInsight } from "@/src/components/BetweenPanelsInsight"
import { PanelScoreEditorial } from "@/src/components/PanelScoreEditorial"
import { contributorArrowForStatus, getPanelScoreInterpretation } from "@/src/lib/panelScoreCopy"
import { notifications } from "@mantine/notifications"
import { getTodayInsightLine } from "@/src/lib/todayInsightLine"
import {
  getMarkerValueSeries,
  getImprovedMarkersBetweenRecentPanels,
  shortMarkerLabel,
} from "@/src/lib/dashboardHomeData"
import { getPremiumHeroHeadline, getPremiumHeroLede, getHeroPositiveLine } from "@/src/lib/dashboardNarrativeCopy"
import {
  DASHBOARD_SKY_MOODS,
  getDashboardSkyMood,
  isDashboardSkyMood,
  type DashboardSkyMood,
} from "@/src/lib/dashboardSkyMood"
import { useDashboardSkyAtmosphere } from "@/src/contexts/DashboardSkyAtmosphereContext"
function buildShortFocusTitle(markerName: string): string {
  const raw = markerName.trim()
  const m = raw.toLowerCase()
  if (m.includes("hs-crp") || m === "crp" || m.includes("c-reactive")) return `Lower inflammation (${raw})`
  if (m.includes("crp") || m.includes("esr") || m.includes("inflammation")) return `Lower inflammation (${raw})`
  if (m.includes("vitamin d") || m.includes("25-oh")) return `Raise ${raw}`
  if (m.includes("ferritin")) return "Improve iron stores (ferritin)"
  return `Improve ${raw}`
}

function shortWhySummaryLine(marker: string): string {
  const m = marker.toLowerCase()
  if (m.includes("crp") || m.includes("inflammation")) {
    return "High hs-CRP = higher inflammation → affects recovery, energy, and long-term health."
  }
  if (m.includes("vitamin d")) return "Vitamin D supports mood, immunity, and bone health."
  if (m.includes("ferritin") || m.includes("iron")) return "Iron affects oxygen delivery, fatigue, and endurance."
  return `Improving ${marker} aligns with how you feel day to day.`
}

function ScoreSparklinePreview({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 120
  const h = 36
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const d = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW
      const y = pad + innerH - ((v - min) / span) * innerH
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dashboard-explore-sparkline" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const w = 88
  const h = 28
  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const d = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW
      const y = pad + innerH - ((v - min) / span) * innerH
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`${className ?? "dashboard-trend-mini-sparkline"} dashboard-trend-mini-sparkline--draw`.trim()}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
      />
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { setAtmosphere } = useDashboardSkyAtmosphere()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefsPhone, setPrefsPhone] = useState("")
  const [prefsRetestWeeks, setPrefsRetestWeeks] = useState(8)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [showBelowFold, setShowBelowFold] = useState(false)
  const [showPrioritiesAndGuides, setShowPrioritiesAndGuides] = useState(false)
  const [showNewResultsBanner, setShowNewResultsBanner] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [protocolTodayComplete, setProtocolTodayComplete] = useState<boolean | null>(null)
  const [protocolHasStreak, setProtocolHasStreak] = useState(false)
  const [protocolTodayX, setProtocolTodayX] = useState<number>(0)
  const [protocolTodayY, setProtocolTodayY] = useState<number>(0)
  const [protocolStreakDays, setProtocolStreakDays] = useState<number>(0)
  const [protocolHistory, setProtocolHistory] = useState<Array<{ log_date: string; checks: Record<string, boolean> }>>([])
  /** Dev-only: force sky mood; `null` = follow protocol + time */
  const [devSkyOverride, setDevSkyOverride] = useState<DashboardSkyMood | null>(null)
  /** Bumps every 5 min so night / computed mood updates without interaction */
  const [skyClock, setSkyClock] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setShowBelowFold(true), 0)
    return () => clearTimeout(t)
  }, [])

  /** Open priorities section when landing with #priorities-guides (e.g. from sidebar / deep link) */
  useEffect(() => {
    const openPriorities = () => {
      if (typeof window === "undefined" || window.location.hash !== "#priorities-guides") return
      setShowPrioritiesAndGuides(true)
      requestAnimationFrame(() => {
        document.getElementById("priorities-guides")?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
    openPriorities()
    window.addEventListener("hashchange", openPriorities)
    return () => window.removeEventListener("hashchange", openPriorities)
  }, [])

  /** Smooth scroll + soft highlight when opening #protocol from home links */
  useEffect(() => {
    const pulse = () => {
      if (typeof window === "undefined" || window.location.hash !== "#protocol") return
      const el = document.getElementById("protocol")
      if (!el) return
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        el.classList.add("dashboard-today-protocol--highlight")
        window.setTimeout(() => el.classList.remove("dashboard-today-protocol--highlight"), 2200)
      })
    }
    pulse()
    window.addEventListener("hashchange", pulse)
    return () => window.removeEventListener("hashchange", pulse)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setSkyClock((n) => n + 1), 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const q = new URLSearchParams(window.location.search).get("sky")
    if (isDashboardSkyMood(q)) setDevSkyOverride(q)
  }, [])

  const handleSavePrefs = useCallback(async () => {
    if (!user || !profile) return
    setPrefsSaving(true)
    setPrefsSaved(false)
    try {
      await upsertProfile(user.id, {
        age: profile.age ?? "",
        sex: profile.sex ?? "",
        sport: profile.sport ?? "",
        goal: profile.goal ?? "",
        current_supplement_spend: profile.current_supplement_spend ?? "",
        current_supplements: profile.current_supplements ?? "",
        shopping_preference: profile.shopping_preference ?? "Best value",
        improvement_preference: profile.improvement_preference ?? "",
        profile_type: profile.profile_type ?? "",
        email: profile.email ?? undefined,
        phone: prefsPhone.trim() || undefined,
        retest_weeks: prefsRetestWeeks,
        height_cm: profile.height_cm ?? undefined,
        weight_kg: profile.weight_kg ?? undefined,
        supplement_form_preference: profile.supplement_form_preference ?? "any",
      })
      const { profile: fresh } = await loadSavedState(user.id)
      if (fresh) {
        setProfile(fresh)
        setPrefsPhone(fresh.phone ?? "")
        setPrefsRetestWeeks(fresh.retest_weeks ?? 8)
      }
      setPrefsSaved(true)
    } finally {
      setPrefsSaving(false)
    }
  }, [user, profile, prefsPhone, prefsRetestWeeks])

  const hasPaidAnalysis = Boolean(profile?.analysis_purchased_at)
  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing"
  const returnedFromSubscriptionCheckout =
    typeof window !== "undefined" && window.location.search.includes("subscription=success")

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        if (!p) {
          upsertProfile(user.id, {
            age: "",
            sex: "",
            sport: "",
            goal: "",
            current_supplement_spend: "",
            current_supplements: "",
            shopping_preference: "Best value",
            retest_weeks: 8,
            improvement_preference: "",
            supplement_form_preference: "any",
          }).then(() => {
            setProfile({ user_id: user.id, age: "", sex: "", sport: "", goal: "", current_supplement_spend: "", current_supplements: "", shopping_preference: "Best value", retest_weeks: 8, improvement_preference: "", supplement_form_preference: "any" } as ProfileRow)
            setPrefsRetestWeeks(8)
          }).catch(() => {})
        } else {
          setProfile(p)
          setPrefsPhone(p.phone ?? "")
          setPrefsRetestWeeks(p.retest_weeks ?? 8)
        }
        setBloodwork(b)
        setSubscription(sub)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
        setBloodworkHistory([])
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    getBloodworkHistory(user.id, 10)
      .then(setBloodworkHistory)
      .catch(() => setBloodworkHistory([]))
  }, [user?.id])

  // Protocol state for "Next action" block and Today strip: today X/Y, streak
  useEffect(() => {
    if (!user?.id || !bloodwork?.stack_snapshot) {
      setProtocolTodayComplete(null)
      setProtocolHasStreak(false)
      setProtocolTodayX(0)
      setProtocolTodayY(0)
      setProtocolStreakDays(0)
      setProtocolHistory([])
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const stack = bloodwork.stack_snapshot && "stack" in bloodwork.stack_snapshot && Array.isArray(bloodwork.stack_snapshot.stack)
      ? (bloodwork.stack_snapshot.stack as { supplementName?: string }[]).map((s) => s.supplementName || "").filter(Boolean)
      : ["Iron protocol", "Vitamin D", "Magnesium", "Omega-3"]
    Promise.all([getProtocolLog(user.id, today), getProtocolLogHistory(user.id, 14)])
      .then(([todayChecks, history]) => {
        setProtocolHistory(history.slice(0, 7))
        const completed = stack.filter((item) => todayChecks[item]).length
        const total = stack.length
        const todayComplete = total > 0 && completed === total
        const byDate: Record<string, boolean> = {}
        history.forEach(({ log_date, checks }) => {
          byDate[log_date] = Object.values(checks).some(Boolean)
        })
        byDate[today] = todayComplete
        let streak = 0
        for (let i = 0; i < 14; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().slice(0, 10)
          if (byDate[dateStr]) streak++
          else break
        }
        setProtocolTodayComplete(todayComplete)
        setProtocolHasStreak(streak > 0)
        setProtocolTodayX(completed)
        setProtocolTodayY(total)
        setProtocolStreakDays(streak)
      })
      .catch(() => {
        setProtocolTodayComplete(null)
        setProtocolHasStreak(false)
        setProtocolTodayX(0)
        setProtocolTodayY(0)
        setProtocolStreakDays(0)
      })
  }, [user?.id, bloodwork?.stack_snapshot])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("newResults") === "1") {
      setShowNewResultsBanner(true)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // In-app toast for streak milestones (7, 10, 30 days) — show once per session per milestone when prefs allow
  useEffect(() => {
    if (typeof window === "undefined" || protocolStreakDays < 7) return
    if (profile?.streak_milestones === false) return
    const milestones = [7, 10, 30]
    if (!milestones.includes(protocolStreakDays)) return
    try {
      const key = `clarion_streak_toast_${protocolStreakDays}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
      notifications.show({
        title: "Streak milestone",
        message: `You've logged your protocol ${protocolStreakDays} days in a row. Keep it up!`,
        color: "green",
      })
    } catch (_) {}
  }, [protocolStreakDays, profile?.streak_milestones])

  // After returning from subscription checkout, refetch a few times so webhook-updated subscription is picked up, then clean URL
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    const search = window.location.search
    if (!search.includes("subscription=success")) return
    const refetch = () => {
      loadSavedState(user.id).then(({ profile: p }) => { if (p) setProfile(p) }).catch(() => {})
      getSubscription(user.id).then((sub) => {
        setSubscription(sub)
        if (sub?.status === "active" || sub?.status === "trialing") router.replace("/dashboard")
      }).catch(() => {})
    }
    refetch()
    const t1 = setTimeout(refetch, 1500)
    const t2 = setTimeout(() => {
      refetch()
      router.replace("/dashboard")
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [user?.id, router])

  // Redirect to paywall when no access (unless dev bypass via NEXT_PUBLIC_DEV_SKIP_PAYWALL=1).
  const hasAnyAccess = hasClarionAnalysisAccess(profile, subscription, bloodwork)
  useEffect(() => {
    if (authLoading || !user || loading) return
    if (profile === null && !loading) return
    if (!hasAnyAccess && profile !== null) {
      router.replace("/paywall")
    }
  }, [authLoading, user, loading, profile, hasAnyAccess, router])

  const profileForAnalysis = profile
    ? { age: profile.age, sex: profile.sex, sport: profile.sport }
    : {}
  const analysisResults =
    bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
      ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
      : []
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

  const scoreSparklineSeries = useMemo(() => {
    return [...bloodworkHistory]
      .reverse()
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number" && !Number.isNaN(s))
  }, [bloodworkHistory])
  /** Oldest → newest panel scores (history is newest-first from API). */
  const scoreJourney = useMemo(() => {
    if (bloodworkHistory.length < 2) return null
    const chronological = [...bloodworkHistory].reverse()
    const oldestRaw = chronological[0]?.score
    const newestRaw = chronological[chronological.length - 1]?.score
    if (typeof oldestRaw !== "number" || typeof newestRaw !== "number") return null
    return {
      from: Math.round(oldestRaw),
      to: Math.round(newestRaw),
      improved: newestRaw > oldestRaw,
    }
  }, [bloodworkHistory])
  const stackNames = useMemo(() => {
    const snap = bloodwork?.stack_snapshot
    if (!snap || !("stack" in snap) || !Array.isArray(snap.stack)) return []
    return (snap.stack as SavedSupplementStackItem[]).map((s) => s.supplementName || "").filter(Boolean)
  }, [bloodwork?.stack_snapshot])
  const stackPreviewItems = useMemo(() => {
    const snap = bloodwork?.stack_snapshot
    if (!snap || !("stack" in snap) || !Array.isArray(snap.stack)) return []
    return (snap.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim()).slice(0, 5)
  }, [bloodwork?.stack_snapshot])
  const scoreCategoriesWithMarkers = useMemo(() => {
    const seen = new Set<string>()
    for (const r of analysisResults) {
      if (r?.name) seen.add(getCategoryForMarker(r.name))
    }
    return SCORE_CATEGORIES.filter((c) => seen.has(c))
  }, [analysisResults])
  const adherenceResult = useMemo(
    () => (protocolHistory.length > 0 && stackNames.length > 0 ? getAdherence(protocolHistory, stackNames) : null),
    [protocolHistory, stackNames]
  )
  const earnedBadges = useMemo(
    () =>
      getEarnedBadges(
        protocolHistory,
        protocolStreakDays,
        bloodworkHistory,
        protocolTodayComplete === true
      ),
    [protocolHistory, protocolStreakDays, bloodworkHistory, protocolTodayComplete]
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

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile), [profile])

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10, priorityContext),
    [analysisResults, priorityContext]
  )
  const panelScoreRounded = useMemo(
    () => (bloodwork?.score != null ? Math.round(bloodwork.score) : 0),
    [bloodwork?.score]
  )
  const panelInterpretation = useMemo(() => getPanelScoreInterpretation(panelScoreRounded), [panelScoreRounded])
  const panelContributors = useMemo(
    () =>
      orderedDrivers.slice(0, 3).map((d) => ({
        label: shortMarkerLabel(d.markerName || d.label),
        arrow: contributorArrowForStatus(d.status),
      })),
    [orderedDrivers]
  )
  const lastLogDate = useMemo(() => {
    if (!protocolHistory.length) return null
    const dates = protocolHistory.map((p) => p.log_date).filter(Boolean)
    return dates.length > 0 ? dates.sort().reverse()[0] ?? null : null
  }, [protocolHistory])
  const hasStack = Boolean(
    bloodwork?.stack_snapshot &&
      "stack" in bloodwork.stack_snapshot &&
      Array.isArray(bloodwork.stack_snapshot.stack) &&
      (bloodwork.stack_snapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim()).length > 0
  )
  const dashboardStatus = useMemo(
    () =>
      getDashboardStatus({
        orderedDriversCount: orderedDrivers.length,
        protocolTodayComplete,
        protocolStreakDays,
        retestCountdown,
        lastLogDate,
        hasStack,
      }),
    [orderedDrivers.length, protocolTodayComplete, protocolStreakDays, retestCountdown, lastLogDate, hasStack]
  )
  const doThisFirst = useMemo(
    () =>
      getDoThisFirst({
        orderedDrivers,
        protocolTodayComplete,
        hasStack,
      }),
    [orderedDrivers, protocolTodayComplete, hasStack]
  )
  const topFocusForSummary = useMemo(() => buildTopFocus(analysisResults), [analysisResults])
  const topPriorityNames = useMemo(
    () => topFocusForSummary.slice(0, 3).map((t: { name?: string; marker?: string }) => t.name || t.marker || "").filter(Boolean),
    [topFocusForSummary]
  )
  const statusCounts = useMemo(() => countByStatus(analysisResults), [analysisResults])
  const prioritySummary = useMemo(
    () => getPrioritySummary(analysisResults, topFocusForSummary),
    [analysisResults, topFocusForSummary]
  )
  const bloodwiseSummary = useMemo(() => {
    const score = bloodwork?.score ?? 0
    if (analysisResults.length === 0 || typeof score !== "number") return null
    return getBloodwiseSummary({
      analysisResults,
      score,
      statusCounts,
      topFocus: topFocusForSummary,
      prioritySummary,
    })
  }, [analysisResults, bloodwork?.score, statusCounts, topFocusForSummary, prioritySummary])

  const heroFocus = useMemo(() => {
    const marker = scoreDrivers[0]?.markerName?.trim() || improvementForecast?.markerName?.trim() || ""
    if (!marker) {
      return {
        title: "Your health snapshot",
        gain: null as number | null,
        potentialScore: null as number | null,
        statusChip: null as string | null,
        markerForWhy: "",
      }
    }
    const title = buildShortFocusTitle(marker)
    const currentSc = typeof bloodwork?.score === "number" ? Math.round(bloodwork.score) : 0
    const gain =
      improvementForecast && improvementForecast.projectedScore > currentSc
        ? Math.round(improvementForecast.projectedScore - improvementForecast.currentScore)
        : null
    const potentialScore =
      improvementForecast && improvementForecast.projectedScore > currentSc
        ? Math.round(improvementForecast.projectedScore)
        : null
    const topResult = analysisResults.find(
      (r) => (r.name || (r as { marker?: string }).marker || "").toLowerCase() === marker.toLowerCase()
    )
    const tone = topResult ? getStatusTone(topResult.status) : null
    let statusChip: string | null = null
    if (tone?.label === "Borderline") statusChip = "Slightly elevated"
    else if (tone?.label === "High") statusChip = "Elevated"
    else if (tone?.label === "Deficient") statusChip = "Below optimal"
    else if (tone?.label === "Optimal" || tone?.label === "Normal") statusChip = "In range"

    return {
      title,
      gain,
      potentialScore,
      statusChip,
      markerForWhy: marker,
    }
  }, [scoreDrivers, improvementForecast, bloodwork?.score, analysisResults])

  const challengeByDate = useMemo(() => {
    const map: Record<string, boolean> = {}
    protocolHistory.forEach(({ log_date, checks }) => {
      if (log_date && Object.values(checks ?? {}).some(Boolean)) map[log_date] = true
    })
    return map
  }, [protocolHistory])
  const challengeExtra = useMemo(
    () => getChallengeExtra(bloodworkHistory, (inputs, p) => analyzeBiomarkers(inputs, p)),
    [bloodworkHistory]
  )
  const challengesSummary = useMemo(() => {
    let completed = 0
    let nextClosest: { name: string; left: string } | null = null
    for (const ch of CHALLENGES) {
      const { current, completed: done } = getChallengeProgress(ch, challengeByDate, challengeExtra)
      if (done) completed++
      else if (nextClosest == null && ch.rule === "protocol_streak" && ch.target > current) {
        nextClosest = { name: ch.name, left: `${ch.target - current} more day${ch.target - current !== 1 ? "s" : ""}` }
      } else if (nextClosest == null && ch.rule === "protocol_week" && ch.target > current) {
        nextClosest = { name: ch.name, left: `${ch.target - current} more day${ch.target - current !== 1 ? "s" : ""} this week` }
      }
    }
    return { completed, total: CHALLENGES.length, nextClosest }
  }, [challengeByDate, challengeExtra])

  const daysSinceLog =
    lastLogDate != null
      ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000))
      : null
  const hasBloodwork = Boolean(bloodwork && (bloodwork.selected_panel?.length > 0 || bloodwork.score != null))
  const nudgeBanner = useMemo(() => {
    if (nudgeDismissed || !hasBloodwork) return null
    if (hasStack && protocolTodayComplete !== true && daysSinceLog != null && daysSinceLog >= 2) {
      return {
        message: `You haven't logged your protocol in ${daysSinceLog} days.`,
        cta: "Log now",
        href: "/dashboard#protocol",
      }
    }
    if (retestCountdown && retestCountdown.type === "until" && retestCountdown.weeks <= 2 && retestCountdown.weeks > 0) {
      return {
        message: `Suggested retest in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}. Add to calendar?`,
        cta: "Add to calendar",
        href: (() => {
          if (!lastBloodworkAt) return "/?step=labs"
          const due = new Date(lastBloodworkAt)
          due.setDate(due.getDate() + (profile?.retest_weeks ?? 8) * 7)
          const start = due.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
          const end = new Date(due.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
          return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Clarion+retest+due&dates=${start}/${end}`
        })(),
        external: true,
      }
    }
    return null
  }, [nudgeDismissed, hasBloodwork, hasStack, protocolTodayComplete, daysSinceLog, retestCountdown, lastBloodworkAt, profile?.retest_weeks])
  const greeting = useMemo(() => {
    const h = typeof window !== "undefined" ? new Date().getHours() : 12
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }, [])
  const displayName = useMemo(() => {
    const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name
    if (typeof name === "string" && name.trim()) {
      const first = name.trim().split(/\s+/)[0]
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    }
    const email = user?.email
    if (typeof email === "string" && email.includes("@")) {
      const part = email.split("@")[0].replace(/[._]/g, " ").trim()
      if (!part) return "there"
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }
    return "there"
  }, [user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email])
  const todayFocusWithIcons = useMemo(
    () =>
      getTodayFocusActionsWithIcons(
        scoreDrivers,
        bloodwork?.stack_snapshot as { stack?: { supplementName?: string; dose?: string; marker?: string }[] } | undefined
      ),
    [scoreDrivers, bloodwork?.stack_snapshot]
  )

  const featuredTodaySplit = useMemo(
    () => splitFeaturedTodayActions(todayFocusWithIcons),
    [todayFocusWithIcons]
  )

  const heroMomentumLine = useMemo(() => {
    if (protocolStreakDays >= 1) {
      return `${protocolStreakDays}-day streak`
    }
    if (heroFocus.gain != null && heroFocus.gain > 0) {
      return `You're one step away from +${heroFocus.gain} points`
    }
    return null
  }, [protocolStreakDays, heroFocus.gain])

  const featuredHeroUi = useMemo(() => {
    const featured = featuredTodaySplit.featured
    if (!featured) return null
    const hasProtocolSteps = hasStack && protocolTodayY > 0
    let eyebrow = "Next up"
    let eyebrowClass = ""
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        eyebrow = "Completed today"
        eyebrowClass = "dashboard-featured-eyebrow--done"
      } else if (protocolTodayX > 0) {
        eyebrow = "In progress"
        eyebrowClass = "dashboard-featured-eyebrow--progress"
      } else {
        eyebrow = "Next up"
      }
    }
    const micro = getFeaturedMicrocopy(featured, hasProtocolSteps ? protocolTodayY : null)
    let stepLine: string | null = null
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        stepLine = `All ${protocolTodayY} steps logged`
      } else {
        stepLine = `Step ${protocolTodayX + 1} of ${protocolTodayY}`
      }
    }
    const doneToday = hasProtocolSteps && protocolTodayComplete === true
    const startLabel = doneToday ? "View plan →" : "Start protocol →"
    const startHref = doneToday ? "/dashboard#protocol" : "/dashboard/actions"
    return { featured, eyebrow, eyebrowClass, micro, stepLine, startLabel, startHref, doneToday }
  }, [
    featuredTodaySplit,
    hasStack,
    protocolTodayY,
    protocolTodayX,
    protocolTodayComplete,
  ])

  const heroPrimaryCtaLabel = useMemo(() => {
    const href = doThisFirst?.href ?? "/dashboard/actions"
    if (href === "/dashboard#protocol" && doThisFirst) {
      return "Complete today’s protocol"
    }
    return doThisFirst?.title ?? "Review recommended actions"
  }, [doThisFirst])

  /** Single primary CTA: protocol first when stack exists and today not done; else doThisFirst. */
  const todayPrimaryCta = useMemo(() => {
    const headroom =
      bloodwork?.score != null ? Math.max(0, 100 - Math.round(bloodwork.score)) : 0
    if (hasStack && protocolTodayComplete !== true && protocolTodayY > 0) {
      return {
        href: "/dashboard#protocol",
        label: "Complete today’s protocol",
      } as const
    }
    if (doThisFirst) {
      return { href: doThisFirst.href, label: heroPrimaryCtaLabel } as const
    }
    if (headroom > 0) {
      return { href: "/dashboard/actions", label: "Review actions" } as const
    }
    return null
  }, [
    bloodwork?.score,
    hasStack,
    protocolTodayComplete,
    protocolTodayY,
    doThisFirst,
    heroPrimaryCtaLabel,
  ])

  const todayInsightLineText = useMemo(
    () =>
      getTodayInsightLine({
        doThisFirst: doThisFirst ? { line: doThisFirst.line, title: doThisFirst.title } : null,
        heroFocusTitle: heroFocus.title,
        featuredMicro: featuredHeroUi?.micro ?? null,
        featuredLabel: featuredHeroUi?.featured?.label ?? null,
      }),
    [doThisFirst, heroFocus.title, featuredHeroUi]
  )

  const reportDateRelative = useMemo(() => {
    const iso = bloodwork?.created_at
    if (!iso) return null
    const then = new Date(iso)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
    const days = Math.floor((start - startThen) / (24 * 60 * 60 * 1000))
    if (days === 0) return "Updated today"
    if (days === 1) return "Updated yesterday"
    if (days < 7) return `Updated ${days} days ago`
    const weeks = Math.floor(days / 7)
    if (weeks === 1) return "Updated 1 week ago"
    if (weeks < 4) return `Updated ${weeks} weeks ago`
    return `Updated ${then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }, [bloodwork?.created_at])

  const previousScore =
    bloodworkHistory.length >= 2 && bloodworkHistory[1]?.score != null
      ? bloodworkHistory[1].score
      : null
  const currentScore = bloodwork?.score ?? null
  const scoreDelta =
    currentScore != null && previousScore != null ? currentScore - previousScore : null

  const contextualInsightLine = useMemo(
    () =>
      getContextualInsight({
        orderedDrivers,
        analysisResults,
        reportDateRelative,
        retestCountdown,
      }),
    [orderedDrivers, analysisResults, reportDateRelative, retestCountdown]
  )

  const improvedMarkersRecent = useMemo(
    () => getImprovedMarkersBetweenRecentPanels(bloodworkHistory, profileForAnalysis),
    [bloodworkHistory, profileForAnalysis]
  )

  const optimalMarkerLabels = useMemo(() => {
    return analysisResults
      .filter((r) => {
        const s = (r.status || "").toLowerCase()
        return s === "optimal" || s === "normal" || s === "in range"
      })
      .map((r) => shortMarkerLabel(r.name || ""))
      .filter(Boolean)
      .slice(0, 4)
  }, [analysisResults])

  const heroPositiveLine = useMemo(
    () =>
      getHeroPositiveLine({
        optimalMarkerLabels,
        protocolStreakDays,
      }),
    [optimalMarkerLabels, protocolStreakDays]
  )

  const heroPrioritySteps = useMemo(() => {
    return orderedDrivers.slice(0, 3).map((d) => {
      const raw = (d.markerName ?? "").trim()
      const guideKey = raw === "25-OH Vitamin D" ? "Vitamin D" : raw
      const guide = getGuidesForBiomarker(guideKey)[0]
      return {
        markerName: raw,
        displayName: shortMarkerLabel(raw),
        statusLabel: getStatusToneFriendly(d.status).label,
        guideHref: guide ? `/guides/${guide.slug}` : "/dashboard/biomarkers",
      }
    })
  }, [orderedDrivers])

  const scoreProgressionLine = useMemo(() => {
    if (scoreDelta != null && scoreDelta !== 0) {
      return `${scoreDelta > 0 ? "+" : ""}${Math.round(scoreDelta)} from last panel`
    }
    if (bloodworkHistory.length < 2) return "First panel — your baseline is set"
    return "Holding steady vs last panel"
  }, [scoreDelta, bloodworkHistory.length])

  const scoreFocusLine = useMemo(() => {
    const m = orderedDrivers[0]?.markerName
    if (m) return `Focus: ${shortMarkerLabel(m)}`
    return null
  }, [orderedDrivers])

  const scoreTierClass = useMemo(() => {
    const s = panelScoreRounded
    if (s >= 85) return "panel-score-editorial--tier-bright"
    if (s >= 70) return "panel-score-editorial--tier-mid"
    if (s >= 60) return "panel-score-editorial--tier-soft"
    return "panel-score-editorial--tier-warm"
  }, [panelScoreRounded])

  const whatsGoingWellItems = useMemo(() => {
    const items: string[] = []
    for (const label of optimalMarkerLabels.slice(0, 3)) {
      items.push(`${label} — looking good`)
    }
    if (protocolStreakDays >= 3) {
      items.push(`${protocolStreakDays}-day logging streak`)
    }
    if (scoreDelta != null && scoreDelta >= 2) {
      items.push(`Score up ${Math.round(scoreDelta)} vs last panel`)
    }
    if (improvedMarkersRecent.length > 0) {
      items.push(`${shortMarkerLabel(improvedMarkersRecent[0])} moving toward optimal`)
    }
    if (items.length === 0) {
      items.push("You're tracking — that's a real first step")
    }
    return items.slice(0, 4)
  }, [optimalMarkerLabels, protocolStreakDays, scoreDelta, improvedMarkersRecent])

  const homeTrendMarkerNames = useMemo(() => {
    const names: string[] = []
    const seen = new Set<string>()
    for (const d of orderedDrivers) {
      if (d.markerName && !seen.has(d.markerName)) {
        seen.add(d.markerName)
        names.push(d.markerName)
      }
      if (names.length >= 6) break
    }
    for (const r of analysisResults) {
      const n = r.name ?? ""
      if (n && !seen.has(n)) {
        seen.add(n)
        names.push(n)
      }
      if (names.length >= 6) break
    }
    return names
  }, [orderedDrivers, analysisResults])

  const premiumNarrativeInput = useMemo(
    () => ({
      orderedDrivers,
      scoreDelta,
      statusCounts,
      bloodwiseSummary: bloodwiseSummary
        ? {
            overallInterpretation: bloodwiseSummary.overallInterpretation,
            keyFindings: bloodwiseSummary.keyFindings,
          }
        : null,
    }),
    [orderedDrivers, scoreDelta, statusCounts, bloodwiseSummary]
  )

  const homeHeadline = useMemo(
    () => getPremiumHeroHeadline(premiumNarrativeInput),
    [premiumNarrativeInput]
  )

  const homeLede = useMemo(() => getPremiumHeroLede(premiumNarrativeInput), [premiumNarrativeInput])

  const protocolTaskFocusLine = useMemo(() => {
    if (protocolTodayY <= 0) return null
    if (protocolTodayComplete === true) return "Done"
    return `Protocol ${protocolTodayX}/${protocolTodayY}`
  }, [protocolTodayY, protocolTodayX, protocolTodayComplete])

  const homeLearningTeaser = useMemo(() => {
    const priority = topPriorityNames[0]
    if (priority) {
      const byPriority = getLearningItemForPriority(priority)
      if (byPriority) return byPriority
    }
    return getLatestLearningItem()
  }, [topPriorityNames])

  const unifiedBanner = useMemo(() => {
    if (!bloodwork || !(bloodwork.selected_panel?.length > 0 || bloodwork.score != null)) return null
    if (nudgeBanner && !nudgeDismissed) return { kind: "nudge" as const, ...nudgeBanner }
    if (showNewResultsBanner) return { kind: "newResults" as const, scoreDelta }
    return null
  }, [bloodwork, nudgeBanner, nudgeDismissed, showNewResultsBanner, scoreDelta])

  const computedSkyMood = useMemo(
    () =>
      getDashboardSkyMood({
        hour: new Date().getHours(),
        hasStack,
        protocolTodayY,
        protocolTodayX,
        protocolTodayComplete,
        daysSinceLog,
      }),
    [skyClock, hasStack, protocolTodayY, protocolTodayX, protocolTodayComplete, daysSinceLog]
  )

  const targetSkyMood = useMemo(() => devSkyOverride ?? computedSkyMood, [devSkyOverride, computedSkyMood])

  useEffect(() => {
    if (!hasBloodwork) {
      setAtmosphere(null)
      return
    }
    setAtmosphere({
      moodOverride: targetSkyMood,
      nightIncomplete: targetSkyMood === "night" && protocolTodayComplete !== true,
    })
  }, [hasBloodwork, targetSkyMood, protocolTodayComplete, setAtmosphere])

  useEffect(() => {
    return () => setAtmosphere(null)
  }, [setAtmosphere])

  const applyDevSky = useCallback((m: DashboardSkyMood | null) => {
    setDevSkyOverride(m)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (m == null) url.searchParams.delete("sky")
    else url.searchParams.set("sky", m)
    window.history.replaceState({}, "", url)
  }, [])

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-shell">
        <div className="dashboard-bg" aria-hidden />
        <div className="dashboard-container dashboard-loading-skeleton" aria-busy="true" aria-label="Loading dashboard">
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--display" />
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--narrow" />
          <div className="dashboard-skeleton-block dashboard-skeleton-hero" />
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--wide" />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="dashboard-shell dashboard-shell-unauth">
        <div className="dashboard-container">
          <div className="dashboard-unauth">
            <h1 className="dashboard-unauth-title">Dashboard</h1>
            <p className="dashboard-unauth-text">Log in to view your dashboard and save your results.</p>
            <div className="dashboard-unauth-actions">
              <Link href="/login" className="dashboard-unauth-link dashboard-unauth-link-primary">
                Log in
              </Link>
              <Link href="/" className="dashboard-unauth-link">
                Back to home
              </Link>
            </div>
          </div>
        </div>
        <style jsx>{`
          .dashboard-shell-unauth {
            background: var(--color-bg) !important;
            color: var(--color-text-primary) !important;
          }
          .dashboard-unauth {
            text-align: center;
            padding: 48px 24px;
          }
          .dashboard-unauth-title {
            margin: 0 0 12px;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--color-text-primary);
          }
          .dashboard-unauth-text {
            margin: 0 0 24px;
            color: var(--color-text-secondary);
          }
          .dashboard-unauth-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          .dashboard-unauth-link {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid var(--color-border);
            background: var(--color-surface-elevated);
            color: var(--color-text-primary);
            font-weight: 600;
            text-decoration: none;
            font-size: 16px;
            transition: background 0.2s, border-color 0.2s;
          }
          .dashboard-unauth-link:hover {
            background: var(--color-surface);
            border-color: var(--color-border-strong);
          }
          .dashboard-unauth-link-primary {
            background: var(--color-accent);
            border: none;
            color: var(--color-accent-contrast);
            box-shadow: var(--shadow-md);
          }
          .dashboard-unauth-link-primary:hover {
            filter: brightness(1.06);
          }
        `}</style>
      </main>
    )
  }

  // Everyone who has paid for the $49 analysis gets full dashboard access (no subscription gate)
  const score = panelScoreRounded

  const isDev = process.env.NODE_ENV === "development"

  return (
    <main className={hasBloodwork ? "dashboard-shell dashboard-shell--clarion-home" : "dashboard-shell"}>
      <AddToHomeScreenPopup />
      {!hasBloodwork ? <div className="dashboard-bg" aria-hidden /> : null}
      <div className="dashboard-container">
        <header className="dashboard-header">
          <TypewriterHeading variant="pop" className="dashboard-greeting dashboard-greeting-typewriter">
            {`${greeting}, ${displayName}`}
          </TypewriterHeading>
          {hasBloodwork ? (
            <p className="dashboard-header-companion">Let&apos;s do this.</p>
          ) : null}
          <p className="dashboard-page-eyebrow">Today</p>
          <Link href="/" className="dashboard-back">← Back to Clarion Labs</Link>
        </header>

        {hasBloodwork && unifiedBanner && (
          <div
            className={
              unifiedBanner.kind === "nudge"
                ? "dashboard-nudge-banner"
                : "dashboard-new-results-banner dashboard-new-results-banner--compact"
            }
            role="status"
          >
            {unifiedBanner.kind === "newResults" ? (
              <span>
                New results saved
                {unifiedBanner.scoreDelta != null && unifiedBanner.scoreDelta > 0
                  ? ` — up ${unifiedBanner.scoreDelta} points.`
                  : "."}
              </span>
            ) : (
              <>
                <span>{unifiedBanner.message}</span>
                {unifiedBanner.external ? (
                  <a href={unifiedBanner.href} target="_blank" rel="noopener noreferrer">
                    {unifiedBanner.cta}
                  </a>
                ) : (
                  <Link href={unifiedBanner.href}>{unifiedBanner.cta}</Link>
                )}
              </>
            )}
            <button
              type="button"
              className={unifiedBanner.kind === "nudge" ? "dashboard-nudge-dismiss" : "dashboard-new-results-dismiss"}
              onClick={() => {
                if (unifiedBanner.kind === "nudge") setNudgeDismissed(true)
                else setShowNewResultsBanner(false)
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {!hasBloodwork ? (
          <div className="dashboard-empty-wrap">
            <h1 className="dashboard-page-headline">Get healthier today</h1>
            <div className="dashboard-card dashboard-empty">
              <div className="dashboard-empty-icon" aria-hidden>◇</div>
              <h2 className="dashboard-empty-title">Get your personalized health plan</h2>
              <p className="dashboard-empty-text">Complete your first panel to see your score and daily tasks.</p>
              <div className="dashboard-empty-actions">
                <Link href="/?step=labs" className="dashboard-cta dashboard-cta-primary">
                  Start your analysis
                </Link>
                <Link href="/" className="dashboard-cta-secondary">How it works</Link>
              </div>
            </div>
            <div className="dashboard-card dashboard-subscribe-card">
              <div className="dashboard-card-label">Clarion+</div>
              <p className="dashboard-card-muted">Trends, retest reminders, and recommendations. Cancel anytime.</p>
              <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe — every 2 months</SubscribeButton>
            </div>
          </div>
        ) : (
          <>
            {hasBloodwork && (bloodwork?.score != null || score === 0) && (
              <section className="dashboard-today dashboard-home" aria-labelledby="dashboard-today-heading">
                <h2 id="dashboard-today-heading" className="visually-hidden">
                  Today
                </h2>

                <div className="dashboard-clarion-mosaic">
                <p className="dashboard-home-narrative-eyebrow">Your companion snapshot</p>

                <div className="dashboard-today-hero-band">
                  <div className="dashboard-hero-composition">
                    <div className="dashboard-hero-composition__visual">
                      <PanelScoreEditorial
                        score={score}
                        max={100}
                        interpretation={panelInterpretation}
                        contributors={panelContributors}
                        progressionLine={scoreProgressionLine}
                        focusLine={scoreFocusLine}
                        tierClassName={scoreTierClass}
                        ariaLabel={`Panel score ${score} out of 100. ${panelInterpretation}`}
                      />
                    </div>
                    <div className="dashboard-hero-composition__story">
                      <p className="dashboard-hero-kicker">
                        <span className="dashboard-hero-kicker-score">{scoreToLabel(score)}</span>
                        {reportDateRelative ? (
                          <>
                            <span className="dashboard-hero-kicker-dot" aria-hidden>
                              ·
                            </span>
                            <span>{reportDateRelative}</span>
                          </>
                        ) : null}
                      </p>
                      {heroPrioritySteps.length > 0 ? (
                        <>
                          <div className="dashboard-hero-composition__quick-log" aria-label="Quick logging">
                            <Link href="#daily-check-in" className="dashboard-hero-composition__quick-log-link">
                              Log check-in
                            </Link>
                            {protocolTodayY > 0 ? (
                              <Link href="#protocol" className="dashboard-hero-composition__quick-log-link">
                                {protocolTaskFocusLine ?? "Protocol"}
                              </Link>
                            ) : null}
                            <Link href="/dashboard/actions" className="dashboard-hero-composition__quick-log-link">
                              Full action list
                            </Link>
                          </div>
                          <p className="dashboard-hero-next-label">Priority markers</p>
                          <ul className="dashboard-hero-drivers" aria-label="Priority markers">
                            {heroPrioritySteps.map((step, idx) => (
                              <li key={`${step.markerName}-${idx}`} className="dashboard-hero-drivers__item">
                                <div className="dashboard-hero-drivers__row">
                                  <Link href={step.guideHref} className="dashboard-hero-drivers__name">
                                    {step.displayName}
                                  </Link>
                                  <span className="dashboard-hero-drivers__badge">{step.statusLabel}</span>
                                </div>
                                <div className="dashboard-hero-drivers__actions">
                                  <Link href={step.guideHref}>Guide</Link>
                                  <span className="dashboard-hero-drivers__actions-sep" aria-hidden>
                                    ·
                                  </span>
                                  <Link href="/dashboard/actions">Plan</Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <>
                          <h3 className="dashboard-hero-composition__headline">{homeHeadline}</h3>
                          <p className="dashboard-hero-composition__lede">{homeLede}</p>
                          {heroPositiveLine ? (
                            <p className="dashboard-hero-positive">{heroPositiveLine}</p>
                          ) : null}
                        </>
                      )}
                      <div className="dashboard-hero-composition__actions">
                        <details className="dashboard-today-panel-details dashboard-today-panel-details--hero">
                          <summary>Numbers &amp; history</summary>
                          <ul className="dashboard-today-panel-details-list">
                            {heroFocus.gain != null && heroFocus.gain > 0 && (
                              <li>+{heroFocus.gain} points when you finish today&apos;s protocol steps.</li>
                            )}
                            {scoreDelta != null && scoreDelta !== 0 && (
                              <li>
                                {scoreDelta > 0 ? "+" : ""}
                                {Math.round(scoreDelta)} vs last panel
                              </li>
                            )}
                            {scoreJourney && (
                              <li>
                                {scoreJourney.improved ? "Improved: " : "Panels: "}
                                {scoreJourney.from} → {scoreJourney.to}
                              </li>
                            )}
                            {retestCountdown && (
                              <li>
                                {retestCountdown.type === "until"
                                  ? `Next retest in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}`
                                  : `Retest suggested ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""} ago`}{" "}
                                <Link href="/?step=labs">Add labs</Link>
                              </li>
                            )}
                            {heroMomentumLine && <li>{heroMomentumLine}</li>}
                            {heroFocus.statusChip && (
                              <li>
                                {heroFocus.markerForWhy}: {heroFocus.statusChip}
                                {heroFocus.gain != null && heroFocus.gain > 0 ? ` · up to +${heroFocus.gain} pts` : ""}
                              </li>
                            )}
                          </ul>
                        </details>
                        <Link href="/dashboard/biomarkers" className="dashboard-hero-composition__cta">
                          View full analysis
                        </Link>
                      </div>
                    </div>
                  </div>
                  <dl className="dashboard-today-metrics-strip" aria-label="Summary metrics">
                    <div className="dashboard-metric-pill">
                      <dt className="dashboard-metric-pill-label">Protocol</dt>
                      <dd className="dashboard-metric-pill-value">
                        {protocolTodayY > 0 ? `${protocolTodayX}/${protocolTodayY}` : "—"}
                      </dd>
                    </div>
                    <div className="dashboard-metric-pill">
                      <dt className="dashboard-metric-pill-label">Score</dt>
                      <dd className="dashboard-metric-pill-value">{score}</dd>
                    </div>
                    <div className="dashboard-metric-pill">
                      <dt className="dashboard-metric-pill-label">vs last panel</dt>
                      <dd className="dashboard-metric-pill-value">
                        {scoreDelta != null && scoreDelta !== 0
                          ? `${scoreDelta > 0 ? "+" : ""}${Math.round(scoreDelta)}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="dashboard-metric-pill">
                      <dt className="dashboard-metric-pill-label">Retest</dt>
                      <dd className="dashboard-metric-pill-value">
                        {retestCountdown
                          ? retestCountdown.type === "until"
                            ? `in ${retestCountdown.weeks} wk`
                            : `${retestCountdown.weeks} wk ago`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <nav className="dashboard-home-quick-updates" aria-label="Quick updates">
                  <span className="dashboard-home-quick-updates-label">Quick updates</span>
                  <div className="dashboard-home-quick-updates-row">
                    <Link href="#protocol" className="dashboard-home-quick-link">
                      Today&apos;s plan
                    </Link>
                    <button
                      type="button"
                      className="dashboard-home-quick-link dashboard-home-quick-link--button"
                      onClick={() =>
                        typeof window !== "undefined" &&
                        window.dispatchEvent(new CustomEvent(CLARION_OPEN_ASSISTANT_EVENT))
                      }
                    >
                      Ask Clarion
                    </button>
                    <Link href="#daily-check-in" className="dashboard-home-quick-link">
                      Log habits
                    </Link>
                    <Link href="/dashboard/actions" className="dashboard-home-quick-link">
                      Actions
                    </Link>
                    <Link href="/settings" className="dashboard-home-quick-link">
                      Profile &amp; symptoms
                    </Link>
                    <Link href="/dashboard/tracking" className="dashboard-home-quick-link">
                      Tracking
                    </Link>
                    {bloodworkHistory.length >= 2 && (
                      <Link href="#between-panels" className="dashboard-home-quick-link">
                        Habits vs last panel
                      </Link>
                    )}
                    <Link href="/?step=labs" className="dashboard-home-quick-link">
                      Add labs
                    </Link>
                  </div>
                </nav>

                <div className="dashboard-home-modules" aria-label="Snapshot modules">
                  <div className="dashboard-home-module">
                    <div className="dashboard-home-module__label">Top priorities</div>
                    <ul className="dashboard-home-module__list">
                      {topPriorityNames.length > 0 ? (
                        topPriorityNames.slice(0, 3).map((n) => (
                          <li key={n}>{shortMarkerLabel(n)}</li>
                        ))
                      ) : (
                        <li className="dashboard-home-module__muted">Your markers look balanced.</li>
                      )}
                    </ul>
                    <Link href="/dashboard/actions" className="dashboard-home-module__link">
                      Actions →
                    </Link>
                  </div>
                  <div className="dashboard-home-module">
                    <div className="dashboard-home-module__label">Since last panel</div>
                    {improvedMarkersRecent.length > 0 ? (
                      <ul className="dashboard-home-module__list">
                        {improvedMarkersRecent.map((n) => (
                          <li key={n}>
                            <span className="dashboard-home-module__improved">{shortMarkerLabel(n)}</span> moved toward optimal
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="dashboard-home-module__muted">
                        {bloodworkHistory.length >= 2
                          ? "No clear optimal wins yet — keep the plan consistent."
                          : "Save a second panel to see what moved."}
                      </p>
                    )}
                    <Link href="/dashboard/trends" className="dashboard-home-module__link">
                      Trends →
                    </Link>
                  </div>
                  <div className="dashboard-home-module">
                    <div className="dashboard-home-module__label">Protocol</div>
                    <p className="dashboard-home-module__stat">
                      {protocolTodayY > 0 ? (
                        <>
                          <strong>
                            {protocolTodayX}/{protocolTodayY}
                          </strong>{" "}
                          today
                        </>
                      ) : (
                        <span className="dashboard-home-module__muted">No stack yet</span>
                      )}
                    </p>
                    {protocolStreakDays >= 1 && (
                      <p className="dashboard-home-module__sub">{protocolStreakDays}-day logging streak</p>
                    )}
                    <Link href="/dashboard#protocol" className="dashboard-home-module__link">
                      Today&apos;s plan →
                    </Link>
                  </div>
                  <div className="dashboard-home-module">
                    <div className="dashboard-home-module__label">Daily habits</div>
                    <p className="dashboard-home-module__muted">Sun, sleep, hydration, activity</p>
                    <Link href="#daily-check-in" className="dashboard-home-module__link">
                      Log today →
                    </Link>
                  </div>
                  <div className="dashboard-home-module">
                    <div className="dashboard-home-module__label">Next retest</div>
                    {retestCountdown ? (
                      <>
                        <p className="dashboard-home-module__stat">
                          {retestCountdown.type === "until"
                            ? `Due in about ${retestCountdown.weeks} wk`
                            : `${retestCountdown.weeks} wk past cadence`}
                        </p>
                        <p className="dashboard-home-module__sub">Based on your retest settings</p>
                      </>
                    ) : (
                      <p className="dashboard-home-module__muted">—</p>
                    )}
                    <Link href="/?step=labs" className="dashboard-home-module__link">
                      Labs →
                    </Link>
                  </div>
                </div>

                <section
                  id="daily-check-in"
                  className="dashboard-section dashboard-section-habits"
                  aria-labelledby="dashboard-habits-heading"
                >
                  <div className="dashboard-section-habits-head">
                    <h2 id="dashboard-habits-heading" className="dashboard-section-title">
                      Today&apos;s habits
                    </h2>
                    <Link href="/dashboard/tracking#daily-check-in" className="dashboard-section-habits-more">
                      Tracking page →
                    </Link>
                  </div>
                  <p className="dashboard-section-habits-lede">
                    Activity, sun, hydration, sleep — used for trends between blood panels.
                  </p>
                  <DailyHealthCheckIn userId={user?.id} />
                </section>

                {user?.id && bloodworkHistory.length >= 2 && (
                  <BetweenPanelsInsight
                    userId={user.id}
                    bloodworkHistory={bloodworkHistory}
                    profile={profile}
                    sectionId="between-panels"
                  />
                )}

                {whatsGoingWellItems.length > 0 && (
                  <div className="dashboard-home-wins" aria-label="What is going well">
                    <p className="dashboard-home-wins__eyebrow">What&apos;s going well</p>
                    <ul className="dashboard-home-wins__list">
                      {whatsGoingWellItems.map((line, i) => (
                        <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {homeTrendMarkerNames.length > 0 && (
                  <div className="dashboard-trends-section">
                    <div className="dashboard-trends-section__head">
                      <h3 className="dashboard-trends-section__title">Biomarker signals</h3>
                      <Link href="/dashboard/trends" className="dashboard-trends-section__all">
                        All trends →
                      </Link>
                    </div>
                    <div className="dashboard-trends-scroller" role="list">
                      {homeTrendMarkerNames.map((markerName) => {
                        const series = getMarkerValueSeries(bloodworkHistory, markerName)
                        const r = analysisResults.find((x) => (x.name ?? "") === markerName)
                        const tone = r ? getStatusToneFriendly(r.status) : getStatusToneFriendly(undefined)
                        const val = r?.value
                        const optMin = r?.optimalMin
                        const optMax = r?.optimalMax
                        const rangeLabel =
                          optMin != null && optMax != null ? `${optMin}–${optMax}` : null
                        return (
                          <Link
                            key={markerName}
                            href="/dashboard/trends"
                            className={`dashboard-trend-mini-card ${tone.className}`}
                            role="listitem"
                          >
                            <span className="dashboard-trend-mini-card__name">{shortMarkerLabel(markerName)}</span>
                            {val != null && (
                              <span className="dashboard-trend-mini-card__value">
                                {typeof val === "number" && val % 1 !== 0 ? val.toFixed(1) : val}
                                {rangeLabel && (
                                  <span className="dashboard-trend-mini-card__range"> · aim {rangeLabel}</span>
                                )}
                              </span>
                            )}
                            <span className={`dashboard-trend-mini-card__badge tone-pill ${tone.className}`}>{tone.label}</span>
                            {series.length >= 2 ? (
                              <MiniSparkline values={series} />
                            ) : (
                              <span className="dashboard-trend-mini-card__hint">
                                {series.length === 1 ? "One data point" : "No history yet"}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {homeLearningTeaser && (
                  <div className="dashboard-home-learn-card">
                    {homeLearningTeaser.biomarkerTag && (
                      <span className="dashboard-home-learn-card__tag">{homeLearningTeaser.biomarkerTag}</span>
                    )}
                    <h3 className="dashboard-home-learn-card__title">{homeLearningTeaser.title}</h3>
                    <p className="dashboard-home-learn-card__body">{homeLearningTeaser.body}</p>
                    <Link href={homeLearningTeaser.link} className="dashboard-home-learn-card__cta">
                      Read your personalized insight →
                    </Link>
                  </div>
                )}
                </div>

                {dashboardStatus.urgency !== "neutral" && (
                  <p className={`dashboard-today-status dashboard-today-status--${dashboardStatus.urgency ?? "neutral"}`}>
                    {dashboardStatus.href ? (
                      <Link href={dashboardStatus.href} className="dashboard-today-status-link">
                        {dashboardStatus.label}
                      </Link>
                    ) : (
                      dashboardStatus.label
                    )}
                  </p>
                )}

                <div className="dashboard-today-card">
                  {hasBloodwork && bloodwork?.score != null && (
                    <div
                      className="dashboard-score-hero-goal dashboard-score-hero-goal--compact dashboard-today-goal-compact"
                      aria-label="Score goal"
                    >
                      {profile?.score_goal != null && profile.score_goal > 0 ? (
                        <>
                          <div className="dashboard-score-hero-goal-heading">
                            <span className="dashboard-score-hero-goal-label">Your goal</span>
                            <span className="dashboard-score-hero-goal-value">
                              {Math.round(Number(bloodwork.score))} / {profile.score_goal}
                            </span>
                          </div>
                          <div className="dashboard-goal-bar-wrap dashboard-goal-bar-wrap--hero">
                            <div
                              className="dashboard-goal-bar"
                              style={{
                                width: `${Math.min(100, (Number(bloodwork.score) / profile.score_goal) * 100)}%`,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <p className="dashboard-score-hero-goal-nudge">
                          <Link href="/settings" className="dashboard-score-hero-goal-link">
                            Set a score goal
                          </Link>{" "}
                          to track your progress.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="dashboard-today-insight">{todayInsightLineText}</p>

                  {todayPrimaryCta && (
                    <Link href={todayPrimaryCta.href} className="dashboard-cta-elegant">
                      {todayPrimaryCta.label}
                    </Link>
                  )}

                  {heroFocus.markerForWhy ? (
                    <details className="dashboard-why-matters-details">
                      <summary className="dashboard-why-matters-summary">
                        Why this matters
                        <ChevronDown size={18} strokeWidth={2} aria-hidden className="dashboard-why-chevron" />
                      </summary>
                      <div className="dashboard-why-matters-body">
                        <p className="dashboard-why-matters-lead">{shortWhySummaryLine(heroFocus.markerForWhy)}</p>
                        <p className="dashboard-why-matters-detail">{inferWhyItMatters(heroFocus.markerForWhy)}</p>
                        <Link href="/dashboard/actions" className="dashboard-why-matters-more">
                          View personalized actions →
                        </Link>
                      </div>
                    </details>
                  ) : null}
                </div>

                <section
                  id="protocol"
                  className="dashboard-section dashboard-section-protocol dashboard-today-protocol"
                  aria-labelledby="dashboard-protocol-heading"
                >
                    <h2 id="dashboard-protocol-heading" className="dashboard-section-title">
                      <ListChecks className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Today&apos;s plan
                    </h2>
                    <p className="dashboard-protocol-mission">
                      Check these off when you can — they&apos;re the fastest path to a higher score.
                    </p>
                    {doThisFirst && <p className="dashboard-protocol-lede">{doThisFirst.line}</p>}
                <ProtocolTracker
                  stackSnapshot={bloodwork?.stack_snapshot}
                  userId={user?.id}
                  pointsAvailable={heroFocus.gain}
                  finishTodayHref="/dashboard#protocol"
                  onAllComplete={() => {
                    notifications.show({
                      title: "All set for today",
                      message: "You've completed your protocol for today.",
                      color: "green",
                    })
                  }}
                />
                {stackPreviewItems.length > 0 && (
                  <div className="dashboard-card dashboard-stack-compact">
                    <div className="dashboard-stack-compact-head">
                      <div>
                        <h3 className="dashboard-stack-compact-title">Your stack (optional)</h3>
                        <p className="dashboard-stack-compact-subtitle">
                          Education & reorder — execution is above.
                        </p>
                      </div>
                      <Link href="/dashboard/plan#stack" className="dashboard-stack-compact-head-cta">
                        View plan
                      </Link>
                    </div>
                    <ul className="dashboard-stack-compact-chips" aria-label="Supplements in your stack">
                      {stackPreviewItems.map((item, i) => {
                        const short = parseSupplementRow(item.supplementName)
                        const doseLabel = shortStackDoseLabel(item.dose)
                        return (
                          <li key={`${item.supplementName}-${i}`} className="dashboard-stack-chip">
                            <div className="dashboard-stack-chip-name-row">
                              <span
                                className={`dashboard-stack-chip-mark dashboard-stack-chip-mark--${short.glyphKind}`}
                                aria-hidden
                              />
                              <span className="dashboard-stack-chip-name">{short.title}</span>
                            </div>
                            <div className="dashboard-stack-chip-meta">
                              <span className="dashboard-stack-chip-dose">{doseLabel}</span>
                              {item.marker ? (
                                <span className="dashboard-stack-chip-marker">For {item.marker}</span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <Link href="/dashboard/plan#stack" className="dashboard-stack-compact-link">
                      Full dosing & reorder links →
                    </Link>
                  </div>
                )}
                {adherenceResult && adherenceResult.perItem.length > 0 && (
                  <div className="dashboard-card dashboard-adherence-card">
                    <h3 className="dashboard-adherence-title">Protocol consistency</h3>
                    <div className="dashboard-adherence-overall-wrap">
                      <p className="dashboard-adherence-overall">Overall: {adherenceResult.consistencyPct}% this week</p>
                      <div className="dashboard-adherence-gradient-bar" aria-hidden>
                        <div
                          className="dashboard-adherence-gradient-bar-fill"
                          style={{ width: `${Math.min(100, adherenceResult.consistencyPct)}%` }}
                        />
                      </div>
                    </div>
                    <ul className="dashboard-adherence-list">
                      {adherenceResult.perItem.map((item) => (
                        <li key={item.itemName} className="dashboard-adherence-item">
                          <span className="dashboard-adherence-name">{item.itemName}</span>
                          <span className="dashboard-adherence-pct">{item.pct}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {earnedBadges.length > 0 && (
                  <div className="dashboard-card dashboard-badges-card">
                    <h3 className="dashboard-badges-title">Earned</h3>
                    <p className="dashboard-badges-list">{earnedBadges.map((b) => b.name).join(", ")}</p>
                  </div>
                )}
                </section>
              </section>
            )}

            <div className="dashboard-main">
            {/* Quick links — full detail on dedicated pages */}
            {hasBloodwork && (
              <section
                className="dashboard-section dashboard-explore-section"
                aria-labelledby="dashboard-explore-heading"
              >
                <h2 id="dashboard-explore-heading" className="dashboard-section-title">
                  <BarChart2 className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Explore
                </h2>
                <p className="dashboard-explore-intro">
                  Charts and your full plan live on other tabs—keep Home for today&apos;s next step.
                </p>
                <div className="dashboard-explore-grid">
                  <Link href="/dashboard/trends" className="dashboard-explore-card dashboard-explore-card--trends">
                    <span className="dashboard-explore-card-icon" aria-hidden><LineChart size={22} strokeWidth={2} /></span>
                    <span className="dashboard-explore-card-title">Trends & charts</span>
                    <span className="dashboard-explore-card-desc">Ferritin, D, magnesium, B12 over time</span>
                    {scoreSparklineSeries.length >= 2 ? (
                      <ScoreSparklinePreview values={scoreSparklineSeries.slice(-8)} />
                    ) : (
                      <span className="dashboard-explore-card-hint">Add 2+ lab saves to preview your curve</span>
                    )}
                    <span className="dashboard-explore-card-cta">Open trends →</span>
                  </Link>
                  <Link href="/dashboard/plan#stack" className="dashboard-explore-card dashboard-explore-card--plan">
                    <span className="dashboard-explore-card-icon" aria-hidden><Package size={22} strokeWidth={2} /></span>
                    <span className="dashboard-explore-card-title">Plan & stack</span>
                    <span className="dashboard-explore-card-desc">Roadmap, savings, retest, reorder links</span>
                    <span className="dashboard-explore-card-cta">View plan →</span>
                  </Link>
                  <Link href="/dashboard/actions" className="dashboard-explore-card dashboard-explore-card--actions">
                    <span className="dashboard-explore-card-icon" aria-hidden><Target size={22} strokeWidth={2} /></span>
                    <span className="dashboard-explore-card-title">What to do next</span>
                    <span className="dashboard-explore-card-desc">Top levers and habits from your panel</span>
                    <span className="dashboard-explore-card-cta">Open actions →</span>
                  </Link>
                </div>
              </section>
            )}

            {hasBloodwork && scoreBreakdown && scoreCategoriesWithMarkers.length > 0 && (
              <section
                className="dashboard-section dashboard-score-areas-section"
                aria-labelledby="dashboard-score-areas-heading"
              >
                <h2 id="dashboard-score-areas-heading" className="dashboard-section-title">
                  <BarChart2 className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Score by area
                </h2>
                <div className="dashboard-card dashboard-score-areas-card">
                  <p className="dashboard-score-areas-hint">How each area of your panel contributes (100 = best).</p>
                  <ul className="dashboard-score-areas-list">
                    {scoreCategoriesWithMarkers.map((cat, idx) => {
                      const value = scoreBreakdown.breakdown[cat]
                      return (
                        <li key={cat} className="dashboard-score-area-row">
                          <span className="dashboard-score-area-label">{cat}</span>
                          <span className="dashboard-score-area-value">{value}</span>
                          <div className={`dashboard-score-area-track dashboard-score-area-track--${idx % 6}`}>
                            <div className="dashboard-score-area-fill" style={{ width: `${value}%` }} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <Link href="/dashboard/actions" className="dashboard-score-areas-cta">
                    What to do next →
                  </Link>
                </div>
              </section>
            )}

            {/* Expand 1: Your priorities & guides */}
            {hasBloodwork && (
              <section
                id="priorities-guides"
                className="dashboard-section"
                aria-labelledby="dashboard-expand-priorities-heading"
              >
                <h2 id="dashboard-expand-priorities-heading" className="dashboard-section-title"><Lightbulb className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Your priorities & guides</h2>
                {!showPrioritiesAndGuides ? (
                  <Link
                    href="#priorities-guides"
                    className="dashboard-card dashboard-expand-trigger"
                    scroll={false}
                    onClick={() => setShowPrioritiesAndGuides(true)}
                  >
                    <span className="dashboard-expand-trigger-label">Priorities & learning</span>
                    <span className="dashboard-expand-trigger-chevron" aria-hidden>↓</span>
                  </Link>
                ) : (
                  <>
                    <button type="button" className="dashboard-expand-close" onClick={() => setShowPrioritiesAndGuides(false)} aria-label="Collapse">↑ Less</button>
                    {/* Today's insight */}
                    {(() => {
                      const priorityName = topPriorityNames[0]
                      const learningItem = priorityName ? getLearningItemForPriority(priorityName) : null
                      const tip = getTodaysTip()
                      if (learningItem) {
                        return (
                          <section className="dashboard-section" aria-labelledby="dashboard-todays-insight-heading">
                            <h3 id="dashboard-todays-insight-heading" className="dashboard-section-title"><Lightbulb className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Today&apos;s insight</h3>
                            <Link href={learningItem.link} className="dashboard-card dashboard-todays-insight-card">
                              {learningItem.biomarkerTag && <span className="dashboard-todays-insight-tag">{learningItem.biomarkerTag}</span>}
                              <h3 className="dashboard-todays-insight-title">{learningItem.title}</h3>
                              <p className="dashboard-todays-insight-body">{learningItem.body}</p>
                              <span className="dashboard-todays-insight-cta">Read more</span>
                            </Link>
                          </section>
                        )
                      }
                      return (
                        <section className="dashboard-section" aria-labelledby="dashboard-todays-insight-heading">
                          <h3 id="dashboard-todays-insight-heading" className="dashboard-section-title"><Lightbulb className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Today&apos;s insight</h3>
                          <div className="dashboard-card dashboard-todays-insight-card dashboard-todays-insight-card--tip">
                            <p className="dashboard-todays-insight-body">{tip}</p>
                          </div>
                        </section>
                      )
                    })()}
                    {/* Top Priorities */}
                    {analysisResults.length > 0 && (
                      <section className="dashboard-section" aria-labelledby="dashboard-priorities-heading">
                        <h3 id="dashboard-priorities-heading" className="dashboard-section-title"><ArrowUpCircle className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Top priorities</h3>
                        <div className="dashboard-priorities-grid">
                          {buildTopFocus(analysisResults).slice(0, 3).map((item, idx) => {
                            const name = String((item as { name?: string; marker?: string }).name || (item as { name?: string; marker?: string }).marker || "Marker")
                            const tone = getStatusTone(item.status)
                            const optimalMin = (item as { optimalMin?: number }).optimalMin
                            const optimalMax = (item as { optimalMax?: number }).optimalMax
                            const targetRange = optimalMin != null && optimalMax != null ? `Aim: ${optimalMin}–${optimalMax}` : null
                            const guideMatch = getGuidesForBiomarker(name)[0]
                            const actionHref = guideMatch ? `/guides/${guideMatch.slug}` : null
                            const actionLabel = guideMatch ? "Read the guide" : "Discuss with your clinician"
                            const value = (item as { value?: number }).value
                            const progressPct = typeof value === "number" && typeof optimalMin === "number" && optimalMin > 0
                              ? Math.min(100, Math.max(0, (value / optimalMin) * 100))
                              : null
                            return (
                              <div key={`${name}-${idx}`} className="dashboard-card dashboard-priority-card">
                                <div className="dashboard-priority-name">{name}</div>
                                <div className={`dashboard-priority-status ${tone.className}`}>{tone.label}</div>
                                {value != null && <div className="dashboard-priority-value">You: {value}{targetRange && ` · ${targetRange}`}</div>}
                                {targetRange && value == null && <div className="dashboard-priority-target">{targetRange}</div>}
                                {progressPct != null && (
                                  <div className="dashboard-priority-bar-wrap">
                                    <div className="dashboard-priority-bar" style={{ width: `${progressPct}%` }} />
                                  </div>
                                )}
                                <p className="dashboard-priority-explanation">{inferWhyItMatters(name)}</p>
                                <Link href="/dashboard#protocol" className="dashboard-priority-link">View protocol</Link>
                                <Link
                                  href={actionHref ?? "/faq"}
                                  className={`dashboard-priority-action ${actionHref ? "" : "dashboard-priority-action-muted"}`}
                                >
                                  → {actionLabel}
                                </Link>
                              </div>
                            )
                          })}
                        </div>
                        {(() => {
                          const priorityNames = buildTopFocus(analysisResults).slice(0, 3).map((t: { name?: string; marker?: string }) => t.name || t.marker || "").filter(Boolean)
                          const longTerm = getLongTermInsightForPriorities(priorityNames)
                          return longTerm ? <p className="dashboard-priorities-longterm">Why this matters: {longTerm}</p> : null
                        })()}
                      </section>
                    )}
                    {/* Guides for you */}
                    {analysisResults.length > 0 && (() => {
                      const topFocus = buildTopFocus(analysisResults).slice(0, 3)
                      const priorityNames = topFocus.map((t: { name?: string; marker?: string }) => t.name || t.marker || "").filter(Boolean)
                      const guidesForYou = getGuidesForPriorities(priorityNames)
                      if (guidesForYou.length === 0) return null
                      return (
                        <section className="dashboard-section" aria-labelledby="dashboard-guides-heading">
                          <h3 id="dashboard-guides-heading" className="dashboard-section-title">
                            <BookOpen className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Guides for you
                            {hasActiveSubscription && <span className="dashboard-section-badge">Included with Clarion+</span>}
                          </h3>
                          <div className="dashboard-guides-grid">
                            {guidesForYou.map((guide) => (
                              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="dashboard-card dashboard-guide-card">
                                <div className="dashboard-guide-title">{guide.title}</div>
                                <p className="dashboard-guide-desc">{guide.description && guide.description.length > 60 ? guide.description.slice(0, 57) + "…" : guide.description}</p>
                                <span className="dashboard-guide-link">Read guide</span>
                              </Link>
                            ))}
                          </div>
                        </section>
                      )
                    })()}
                    {/* Latest from Clarion */}
                    {getLatestLearningItem() && (
                      <section className="dashboard-section" aria-labelledby="dashboard-learning-heading">
                        <h3 id="dashboard-learning-heading" className="dashboard-section-title"><BookOpen className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Latest from Clarion</h3>
                        {(() => {
                          const item = getLatestLearningItem()!
                          return (
                            <Link href={item.link} className="dashboard-card dashboard-learning-teaser">
                              <span className="dashboard-learning-tag">{item.biomarkerTag ?? "Research"}</span>
                              <h3 className="dashboard-learning-title">{item.title}</h3>
                              <p className="dashboard-learning-body">{item.body}</p>
                              <span className="dashboard-learning-cta">Read more</span>
                            </Link>
                          )
                        })()}
                        <Link href="/dashboard/feed" className="dashboard-learning-feed-link">See all in Feed</Link>
                      </section>
                    )}
                  </>
                )}
              </section>
            )}

            {hasBloodwork && (
              <section className="dashboard-section dashboard-challenges-section" aria-labelledby="dashboard-challenges-teaser-heading">
                <h2 id="dashboard-challenges-teaser-heading" className="dashboard-section-title">
                  <Trophy className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Challenges
                </h2>
                <Link href="/dashboard/challenges" className="dashboard-card dashboard-challenges-teaser-card">
                  <span className="dashboard-challenges-teaser-count">
                    {challengesSummary.completed} of {challengesSummary.total} complete
                  </span>
                  {challengesSummary.nextClosest && (
                    <p className="dashboard-challenges-teaser-next">
                      Next: {challengesSummary.nextClosest.name} — {challengesSummary.nextClosest.left}
                    </p>
                  )}
                  <span className="dashboard-challenges-teaser-cta">View all</span>
                </Link>
              </section>
            )}

            {showBelowFold && (
            <>
            {/* From the research / Tip */}
            {hasBloodwork && (
              <div className="dashboard-tip-bar" role="complementary">
                <span className="dashboard-tip-label">From the research</span>
                <span className="dashboard-tip-text">{contextualInsightLine}</span>
              </div>
            )}

            {hasActiveSubscription ? (
              <div className="dashboard-card dashboard-welcome-clarion" style={{ marginTop: 24 }}>
                <div className="dashboard-welcome-clarion-badge">✓</div>
                <h3 className="dashboard-welcome-clarion-title">Welcome to Clarion+</h3>
                <p className="dashboard-card-muted">Full access to trends, retest reminders, and recommendations.</p>
              </div>
            ) : (
              <div className="dashboard-card dashboard-subscribe-card" style={{ marginTop: 24 }}>
                <div className="dashboard-card-label">Clarion+</div>
                <p className="dashboard-card-muted">Trends, retest reminders, and recommendations. Cancel anytime.</p>
                <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe to Clarion+</SubscribeButton>
              </div>
            )}
            </>
            )}
          </div>
          </>
        )}

        {user && profile && (
          <section className="dashboard-section dashboard-settings-section" aria-labelledby="dashboard-settings-heading" style={{ marginTop: hasBloodwork ? 32 : 24 }}>
            <h2 id="dashboard-settings-heading" className="dashboard-section-title"><SettingsIcon className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Settings</h2>
            {(() => {
              const fields = [
                !!profile.age?.trim(),
                !!profile.sex?.trim(),
                profile.height_cm != null && profile.height_cm > 0,
                profile.weight_kg != null && profile.weight_kg > 0,
                !!(profile.profile_type?.trim() || profile.goal?.trim()),
              ]
              const complete = fields.filter(Boolean).length
              const total = 5
              const allComplete = complete === total
              return !allComplete ? (
                <div className="dashboard-profile-nudge">
                  <span className="dashboard-profile-nudge-text">Complete your profile ({complete}/{total})</span>
                  <Link href="/settings" className="dashboard-profile-nudge-link">Finish in Settings →</Link>
                </div>
              ) : null
            })()}
            <div className="dashboard-card dashboard-prefs-card">
              <p className="dashboard-prefs-hint">Update your profile, preferences, supplement form (pills vs gummies/powder), retest reminders, and more.</p>
              <Link href="/settings" className="dashboard-prefs-link">Manage in Settings →</Link>
            </div>
          </section>
        )}
      </div>

      {isDev && hasBloodwork && (
        <div className="dashboard-sky-dev" role="toolbar" aria-label="Dev: sky background (development only)">
          <span className="dashboard-sky-dev-label">Sky</span>
          <button
            type="button"
            className={devSkyOverride === null ? "dashboard-sky-dev--active" : ""}
            onClick={() => applyDevSky(null)}
          >
            Auto
          </button>
          {DASHBOARD_SKY_MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={devSkyOverride === m ? "dashboard-sky-dev--active" : ""}
              onClick={() => applyDevSky(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
