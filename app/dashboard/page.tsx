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
import { getDashboardStatus, getDoThisFirst, getTodayContext } from "@/src/lib/dashboardStatus"
import { getTrendInsights } from "@/src/lib/trendInsights"
import { getAdherence } from "@/src/lib/adherence"
import { getEarnedBadges } from "@/src/lib/badges"
import { getLatestLearningItem, getLearningItemForPriority } from "@/src/lib/learningFeed"
import { getLongTermInsightForPriorities } from "@/src/lib/longTermInsights"
import { buildTopFocus, getPrioritySummary, getStatusTone, inferWhyItMatters } from "@/src/lib/priorityEngine"
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
import { BookOpen, Trophy, Settings as SettingsIcon, ListChecks, Target, Lightbulb, ArrowUpCircle, Package, BarChart2, LineChart, Sun, Pill, Flame, ChevronDown } from "lucide-react"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { AddToHomeScreenPopup } from "@/src/components/AddToHomeScreenPopup"
import { CLARION_OPEN_ASSISTANT_EVENT } from "@/src/components/ClarionAssistant"
import { ProtocolTracker } from "@/src/components/ProtocolTracker"
import { TypewriterHeading } from "@/src/components/TypewriterHeading"
import { motion } from "framer-motion"
import { notifications } from "@mantine/notifications"
import { getTrendData } from "@/src/lib/dashboardTrendData"
import "./dashboard.css"

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

export default function DashboardPage() {
  const router = useRouter()
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
  const [showSeeMore, setShowSeeMore] = useState(false)
  const [showPrioritiesAndGuides, setShowPrioritiesAndGuides] = useState(false)
  const [showNewResultsBanner, setShowNewResultsBanner] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [protocolTodayComplete, setProtocolTodayComplete] = useState<boolean | null>(null)
  const [protocolHasStreak, setProtocolHasStreak] = useState(false)
  const [protocolTodayX, setProtocolTodayX] = useState<number>(0)
  const [protocolTodayY, setProtocolTodayY] = useState<number>(0)
  const [protocolStreakDays, setProtocolStreakDays] = useState<number>(0)
  const [protocolHistory, setProtocolHistory] = useState<Array<{ log_date: string; checks: Record<string, boolean> }>>([])
  const [displayScore, setDisplayScore] = useState(0)
  const [whyMattersOpen, setWhyMattersOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowBelowFold(true), 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const target = bloodwork?.score != null ? Math.round(bloodwork.score) : 0
    if (target === 0) {
      setDisplayScore(0)
      return
    }
    setDisplayScore(0)
    const durationMs = 1200
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      setDisplayScore(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [bloodwork?.score])

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

  const trendData = useMemo(() => getTrendData(bloodworkHistory), [bloodworkHistory])
  const trendInsights = useMemo(
    () => (trendData.length >= 2 ? getTrendInsights(trendData, analysisResults) : []),
    [trendData, analysisResults]
  )
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

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10),
    [analysisResults]
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

  const firstGuideForPriorities = useMemo(() => getGuidesForPriorities(topPriorityNames)[0] ?? null, [topPriorityNames])
  const todayContext = useMemo(
    () =>
      getTodayContext({
        protocolTodayComplete,
        protocolStreakDays,
        retestCountdown,
        lastLogDate,
        hasStack,
        lastBloodworkAt: lastBloodworkAt ?? null,
        retestWeeks: profile?.retest_weeks ?? 8,
        firstGuide: firstGuideForPriorities,
      }),
    [
      protocolTodayComplete,
      protocolStreakDays,
      retestCountdown,
      lastLogDate,
      hasStack,
      lastBloodworkAt,
      profile?.retest_weeks,
      firstGuideForPriorities,
    ]
  )

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
  const hasBloodworkForNudge = Boolean(bloodwork && (bloodwork.selected_panel?.length > 0 || bloodwork.score != null))
  const nudgeBanner = useMemo(() => {
    if (nudgeDismissed || !hasBloodworkForNudge) return null
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
  }, [nudgeDismissed, hasBloodworkForNudge, hasStack, protocolTodayComplete, daysSinceLog, retestCountdown, lastBloodworkAt, profile?.retest_weeks])
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
      return `${protocolStreakDays}-day streak 🔥`
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
    let eyebrow = "🔥 Next up"
    let eyebrowClass = ""
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        eyebrow = "✅ Completed today"
        eyebrowClass = "dashboard-featured-eyebrow--done"
      } else if (protocolTodayX > 0) {
        eyebrow = "⏳ In progress"
        eyebrowClass = "dashboard-featured-eyebrow--progress"
      } else {
        eyebrow = "🔥 Next up"
      }
    }
    const micro = getFeaturedMicrocopy(featured, hasProtocolSteps ? protocolTodayY : null)
    let stepLine: string | null = null
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        stepLine = `All ${protocolTodayY} steps done — nice work`
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
      if (heroFocus.gain != null && heroFocus.gain > 0) {
        return `Finish today → +${heroFocus.gain} points`
      }
      return "Finish today →"
    }
    return `${doThisFirst?.title ?? "Go to actions"} →`
  }, [doThisFirst, heroFocus.gain])

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
  const hasBloodwork = bloodwork && (bloodwork.selected_panel?.length > 0 || bloodwork.score != null)
  const score = bloodwork?.score != null ? Math.round(bloodwork.score) : 0
  const roomToGrow = Math.max(0, 100 - score)

  return (
    <main className="dashboard-shell">
      <AddToHomeScreenPopup />
      <div className="dashboard-bg" />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <TypewriterHeading as="h1" variant="pop" className="dashboard-greeting dashboard-greeting-typewriter">
            {`${greeting}, ${displayName}`}
          </TypewriterHeading>
          <p className="dashboard-page-eyebrow">Overview</p>
          <Link href="/" className="dashboard-back">← Back to Clarion Labs</Link>
        </header>

        {hasBloodwork && (bloodwork?.score != null || score === 0) && (
          <motion.section
            className="dashboard-score-hero"
            aria-labelledby="dashboard-score-hero-label"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04 }}
          >
            <h2 id="dashboard-score-hero-label" className="dashboard-score-hero-label visually-hidden">Today</h2>
            <div className="dashboard-score-hero-layout dashboard-score-hero-layout--split">
              <div className="dashboard-hero-col dashboard-hero-col--actions">
                {hasBloodwork && bloodwork?.score != null && (
                  <div className="dashboard-score-hero-goal dashboard-score-hero-goal--compact" aria-label="Score goal">
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

                <div className="dashboard-hero-focus-block">
                  <p className="dashboard-hero-focus-eyebrow">Focus</p>
                  <p className="dashboard-hero-focus-title">{heroFocus.title}</p>
                  <div className="dashboard-hero-focus-chips">
                    {heroFocus.gain != null && heroFocus.gain > 0 && (
                      <span className="dashboard-hero-focus-points">+{heroFocus.gain} available</span>
                    )}
                    {heroFocus.statusChip && (
                      <span
                        className={`dashboard-hero-status-chip ${
                          heroFocus.statusChip === "In range" ? "dashboard-hero-status-chip--ok" : "dashboard-hero-status-chip--warn"
                        }`}
                      >
                        {heroFocus.statusChip !== "In range" ? "⚠️ " : ""}
                        {heroFocus.statusChip}
                      </span>
                    )}
                  </div>
                </div>

                {featuredHeroUi && (
                  <div className="dashboard-featured-action">
                    <p
                      className={["dashboard-featured-eyebrow", featuredHeroUi.eyebrowClass]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {featuredHeroUi.eyebrow}
                    </p>
                    <p className="dashboard-featured-label">{featuredHeroUi.featured.label}</p>
                    <div className="dashboard-featured-meta">
                      <p className="dashboard-featured-micro">{featuredHeroUi.micro}</p>
                      {featuredHeroUi.stepLine && (
                        <p className="dashboard-featured-step">{featuredHeroUi.stepLine}</p>
                      )}
                    </div>
                    <Link
                      href={featuredHeroUi.startHref}
                      className={`dashboard-featured-start${featuredHeroUi.doneToday ? " dashboard-featured-start--secondary" : ""}`}
                    >
                      {featuredHeroUi.startLabel}
                    </Link>
                  </div>
                )}

                {featuredTodaySplit.others.length > 0 && (
                  <div className="dashboard-other-actions">
                    <p className="dashboard-other-actions-title">Other actions</p>
                    <ul className="dashboard-other-actions-list" role="list">
                      {featuredTodaySplit.others.map((action) => (
                        <li key={action.label} className="dashboard-other-actions-item">
                          <span className="dashboard-other-actions-icon" aria-hidden>
                            {action.icon === "sun" && <Sun size={18} strokeWidth={2} />}
                            {action.icon === "flame" && <Flame size={18} strokeWidth={2} />}
                            {action.icon === "pill" && <Pill size={18} strokeWidth={2} />}
                          </span>
                          <span className="dashboard-other-actions-text">{action.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {heroMomentumLine && <p className="dashboard-hero-momentum">{heroMomentumLine}</p>}

                {(doThisFirst?.href || roomToGrow > 0) && (
                  <Link
                    href={doThisFirst?.href ?? "/dashboard/actions"}
                    className="dashboard-score-hero-cta-primary dashboard-score-hero-cta-primary--large"
                  >
                    {heroPrimaryCtaLabel}
                  </Link>
                )}
              </div>

              <aside className="dashboard-hero-col dashboard-hero-col--context" aria-label="Score and context">
                <div className="dashboard-hero-side-panel">
                  <div className="dashboard-hero-score-row" aria-label="Score summary">
                    <div className="dashboard-hero-score-stack">
                      <span className="dashboard-hero-score-label">Your score</span>
                      <span className="dashboard-hero-score-big">
                        <strong>{displayScore}</strong>
                        <span className="dashboard-hero-score-denom">/ 100</span>
                      </span>
                    </div>
                    <div className="dashboard-hero-score-extras">
                      {heroFocus.gain != null && heroFocus.gain > 0 && (
                        <span className="dashboard-hero-score-gain">+{heroFocus.gain} available</span>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-hero-quicklinks" role="group" aria-label="Quick links">
                    <Link href="/dashboard/trends" className="dashboard-score-hero-pop-chip">
                      <LineChart size={16} strokeWidth={2} aria-hidden />
                      Trends
                    </Link>
                    <Link href="/dashboard/plan#stack" className="dashboard-score-hero-pop-chip">
                      <Package size={16} strokeWidth={2} aria-hidden />
                      Plan & stack
                    </Link>
                  </div>

                  {heroFocus.markerForWhy ? (
                    <div className="dashboard-why-matters">
                      <button
                        type="button"
                        className={`dashboard-why-matters-toggle ${whyMattersOpen ? "dashboard-why-matters-toggle--open" : ""}`}
                        onClick={() => setWhyMattersOpen((o) => !o)}
                        aria-expanded={whyMattersOpen}
                      >
                        Why this matters
                        <ChevronDown size={18} strokeWidth={2} aria-hidden className="dashboard-why-chevron" />
                      </button>
                      {whyMattersOpen && (
                        <div className="dashboard-why-matters-body">
                          <p className="dashboard-why-matters-lead">{shortWhySummaryLine(heroFocus.markerForWhy)}</p>
                          <p className="dashboard-why-matters-detail">{inferWhyItMatters(heroFocus.markerForWhy)}</p>
                          <Link href="/dashboard/actions" className="dashboard-why-matters-more">
                            View personalized actions →
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </aside>

              {reportDateRelative && (
                <div className="dashboard-hero-footer-meta dashboard-score-hero-meta">
                  <span className="dashboard-score-hero-meta-text">{reportDateRelative}</span>
                  <span className="dashboard-score-hero-meta-hint">Add new labs from Plan when you&apos;re ready.</span>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {hasBloodwork && (
          <motion.div
            className="dashboard-momentum-strip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            role="region"
            aria-label="Your status"
          >
            <div className="dashboard-momentum-strip-main">
              {scoreJourney && (
                <p className="dashboard-momentum-line dashboard-momentum-line--score">
                  {scoreJourney.improved ? (
                    <>
                      Score improved:{" "}
                      <strong className="dashboard-momentum-strong">
                        {scoreJourney.from} → {scoreJourney.to}
                      </strong>{" "}
                      <span className="dashboard-momentum-fire" aria-hidden>
                        🔥
                      </span>
                    </>
                  ) : (
                    <>
                      Score:{" "}
                      <strong className="dashboard-momentum-strong">
                        {scoreJourney.from} → {scoreJourney.to}
                      </strong>
                    </>
                  )}
                </p>
              )}
              {!scoreJourney && bloodwork?.score != null && (
                <p className="dashboard-momentum-line dashboard-momentum-line--score">
                  Score: <strong className="dashboard-momentum-strong">{Math.round(bloodwork.score)}</strong>
                </p>
              )}
              {retestCountdown && (
                <p className="dashboard-momentum-line dashboard-momentum-line--retest">
                  {retestCountdown.type === "until"
                    ? `Next retest in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}`
                    : `Retest suggested ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""} ago`}
                  {" · "}
                  <Link href="/?step=labs" className="dashboard-momentum-add-labs">
                    Add labs
                  </Link>
                </p>
              )}
            </div>
            <button
              type="button"
              className="dashboard-momentum-clarion"
              onClick={() => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(CLARION_OPEN_ASSISTANT_EVENT))}
            >
              Ask Clarion →
            </button>
          </motion.div>
        )}

        {hasBloodwork && showNewResultsBanner && (
          <div className="dashboard-new-results-banner dashboard-new-results-banner--compact" role="status">
            <span>
              New results saved
              {scoreDelta != null && scoreDelta > 0 ? ` — up ${scoreDelta} points.` : "."}
            </span>
            <button type="button" className="dashboard-new-results-dismiss" onClick={() => setShowNewResultsBanner(false)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {hasBloodwork && nudgeBanner && (
          <div className="dashboard-nudge-banner" role="status">
            <span>{nudgeBanner.message}</span>
            {nudgeBanner.external ? (
              <a href={nudgeBanner.href} target="_blank" rel="noopener noreferrer">{nudgeBanner.cta}</a>
            ) : (
              <Link href={nudgeBanner.href}>{nudgeBanner.cta}</Link>
            )}
            <button type="button" className="dashboard-nudge-dismiss" onClick={() => setNudgeDismissed(true)} aria-label="Dismiss">×</button>
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
          <motion.div
            className="dashboard-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Today's protocol — daily habit, moved up for visibility */}
            {hasBloodwork && (
              <motion.section
                id="protocol"
                className="dashboard-section dashboard-section-protocol"
                aria-labelledby="dashboard-protocol-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.06 }}
              >
                <h2 id="dashboard-protocol-heading" className="dashboard-section-title"><ListChecks className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Today&apos;s plan</h2>
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
                              <span className="dashboard-stack-chip-emoji" aria-hidden>
                                {short.emoji}
                              </span>
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
              </motion.section>
            )}

            {/* Quick links — full detail on dedicated pages */}
            {hasBloodwork && (
              <motion.section
                className="dashboard-section dashboard-explore-section"
                aria-labelledby="dashboard-explore-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.04 }}
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
              </motion.section>
            )}

            {hasBloodwork && scoreBreakdown && scoreCategoriesWithMarkers.length > 0 && (
              <motion.section
                className="dashboard-section dashboard-score-areas-section"
                aria-labelledby="dashboard-score-areas-heading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.08 }}
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
              </motion.section>
            )}

            {/* Merged status line: status + protocol/streak/retest + trends */}
            {hasBloodwork && (dashboardStatus.label || protocolTodayY > 0 || protocolStreakDays > 0 || retestCountdown || trendInsights.length > 0) && (
              <div className={`dashboard-status-line dashboard-status-strip--${dashboardStatus.urgency ?? "neutral"}`} role="status">
                {dashboardStatus.label && (
                  <>
                    {dashboardStatus.href ? (
                      <Link href={dashboardStatus.href} className="dashboard-status-line-link">{dashboardStatus.label}</Link>
                    ) : (
                      <span className="dashboard-status-line-item">{dashboardStatus.label}</span>
                    )}
                  </>
                )}
                {protocolTodayY > 0 && (
                  <>
                    {dashboardStatus.label && <span className="dashboard-status-line-sep">·</span>}
                    <span className="dashboard-status-line-item dashboard-status-line-with-progress">
                      <span className="dashboard-today-progress-wrap" aria-hidden>
                        <span className="dashboard-today-progress-bar" style={{ width: `${(protocolTodayX / protocolTodayY) * 100}%` }} />
                      </span>
                      <span>Protocol {protocolTodayX}/{protocolTodayY}</span>
                    </span>
                  </>
                )}
                {protocolStreakDays > 0 && (
                  <>
                    {(dashboardStatus.label || protocolTodayY > 0) && <span className="dashboard-status-line-sep">·</span>}
                    <span className="dashboard-status-line-item">{protocolStreakDays}-day streak</span>
                  </>
                )}
                {retestCountdown && (
                  <>
                    {(dashboardStatus.label || protocolTodayY > 0 || protocolStreakDays > 0) && <span className="dashboard-status-line-sep">·</span>}
                    <span className="dashboard-status-line-item">
                      {retestCountdown.type === "until"
                        ? `Retest in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}`
                        : `Retest ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""} ago`}
                    </span>
                  </>
                )}
                {trendInsights.length > 0 && (
                  <>
                    {(dashboardStatus.label || protocolTodayY > 0 || protocolStreakDays > 0 || retestCountdown) && <span className="dashboard-status-line-sep">·</span>}
                    <span className="dashboard-status-line-item dashboard-status-line-trends">
                      {trendInsights.slice(0, 3).map((t, i) => (
                        <React.Fragment key={t.key}>
                          {i > 0 && " · "}
                          <span>{t.first === t.last ? `${t.label} ${t.last}` : `${t.label} ${t.first}→${t.last}`}</span>
                        </React.Fragment>
                      ))}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Today's focus — actionable items */}
            {hasBloodwork && (
              <motion.section
                className="dashboard-section dashboard-today-tasks"
                aria-labelledby="dashboard-today-tasks-heading"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h2 id="dashboard-today-tasks-heading" className="dashboard-section-title"><Target className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Today&apos;s focus</h2>
                <div className="dashboard-today-tasks-grid">
                  {/* Task 1: Log protocol — context-aware title/line */}
                  <div className="dashboard-card dashboard-today-task-card">
                    <h3 className="dashboard-today-task-title">{todayContext.task1.title}</h3>
                    <p className="dashboard-today-task-line">{todayContext.task1.line}</p>
                    {protocolTodayComplete ? (
                      <Link href="/dashboard#protocol" className="dashboard-today-task-cta dashboard-today-task-cta-secondary">View tracker</Link>
                    ) : (
                      <Link href="/dashboard#protocol" className="dashboard-today-task-cta">Log now</Link>
                    )}
                  </div>
                  {/* Task 2: Supplements */}
                  {bloodwork?.stack_snapshot && "stack" in bloodwork.stack_snapshot && Array.isArray(bloodwork.stack_snapshot.stack) && (bloodwork.stack_snapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim()).length > 0 ? (
                    <div className="dashboard-card dashboard-today-task-card">
                      <h3 className="dashboard-today-task-title">Take your supplements</h3>
                      <p className="dashboard-today-task-line">
                        You&apos;re on {(bloodwork.stack_snapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim()).length} supplement{(bloodwork.stack_snapshot.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim()).length !== 1 ? "s" : ""}.
                      </p>
                      <Link href="/dashboard/plan#stack" className="dashboard-today-task-cta">See my stack</Link>
                    </div>
                  ) : (
                    <div className="dashboard-card dashboard-today-task-card">
                      <h3 className="dashboard-today-task-title">Build your plan</h3>
                      <p className="dashboard-today-task-line">Get your personalized supplement plan from your results.</p>
                      <Link href="/dashboard/plan#stack" className="dashboard-today-task-cta">View plan</Link>
                    </div>
                  )}
                  {/* Task 3: Context-aware (streak, retest, guide, or on track) */}
                  <div className="dashboard-card dashboard-today-task-card">
                    <h3 className="dashboard-today-task-title">{todayContext.task3.title}</h3>
                    <p className="dashboard-today-task-line">{todayContext.task3.line}</p>
                    {todayContext.task3.ctaType === "log" && todayContext.task3.ctaHref && (
                      <Link href={todayContext.task3.ctaHref} className="dashboard-today-task-cta">{todayContext.task3.ctaLabel ?? "Log now"}</Link>
                    )}
                    {todayContext.task3.ctaType === "calendar" && todayContext.task3.ctaHref && (
                      <a href={todayContext.task3.ctaHref} target="_blank" rel="noopener noreferrer" className="dashboard-today-task-cta">{todayContext.task3.ctaLabel ?? "Add to calendar"}</a>
                    )}
                    {todayContext.task3.ctaType === "guide" && todayContext.task3.ctaHref && (
                      <Link href={todayContext.task3.ctaHref} className="dashboard-today-task-cta">{todayContext.task3.ctaLabel ?? "Read guide"}</Link>
                    )}
                  </div>
                </div>
              </motion.section>
            )}

            {/* Expand 1: Your priorities & guides */}
            {hasBloodwork && (
              <section className="dashboard-section" aria-labelledby="dashboard-expand-priorities-heading">
                <h2 id="dashboard-expand-priorities-heading" className="dashboard-section-title"><Lightbulb className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Your priorities & guides</h2>
                {!showPrioritiesAndGuides ? (
                  <button type="button" className="dashboard-card dashboard-expand-trigger" onClick={() => setShowPrioritiesAndGuides(true)}>
                    <span className="dashboard-expand-trigger-label">Priorities & learning</span>
                    <span className="dashboard-expand-trigger-chevron" aria-hidden>↓</span>
                  </button>
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
                                {actionHref ? (
                                  <Link href={actionHref} className="dashboard-priority-action">→ {actionLabel}</Link>
                                ) : (
                                  <span className="dashboard-priority-action dashboard-priority-action-muted">{actionLabel}</span>
                                )}
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
                <span className="dashboard-tip-text">{getTodaysTip()}</span>
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
          </motion.div>
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

    </main>
  )
}
