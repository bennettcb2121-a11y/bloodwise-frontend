"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { hasClarionAnalysisAccess, hasLabPersonalizationAccess } from "@/src/lib/accessGate"
import { buildLiteSupplementSuggestions, LITE_DISCLAIMER } from "@/src/lib/symptomLiteSupplements"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SavedSupplementStackItem, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { AFFILIATE_DISCLOSURE, MONTHLY_COST_DISCLAIMER } from "@/src/lib/affiliateProducts"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { getScoreBreakdown, getScoreDrivers, getImprovementForecast, SCORE_CATEGORIES } from "@/src/lib/scoreBreakdown"
import { getRoadmapPhase } from "@/src/lib/healthRoadmap"
import { Package, TrendingUp, BarChart2, CalendarCheck, Bookmark, DollarSign, Info, AlertTriangle } from "lucide-react"
import { WhatITakeSheet } from "@/src/components/WhatITakeSheet"
import { StackSupplyRow } from "@/src/components/StackSupplyRow"
import { CLARION_PROFILE_UPDATED_EVENT, dispatchProfileUpdated } from "@/src/lib/profileEvents"
import { deleteMergedStackItem, updateMergedStackItem } from "@/src/lib/stackMutations"
import { StackItemEditModal } from "@/src/components/StackItemEditModal"
import { DashboardSectionPrimer } from "@/src/components/DashboardSectionPrimer"
import { notifications } from "@mantine/notifications"
import {
  getSupplementInventory,
  upsertSupplementInventory,
  type SupplementInventoryRow,
} from "@/src/lib/bloodwiseDb"
import { computeRunningLow, normalizeSupplementKey } from "@/src/lib/bottleRunout"
import {
  stackItemStorageKey,
  loadStackAcquisition,
  saveStackAcquisition,
  setStackItemAcquisition,
  markAllAsHave,
  migrateStackAcquisitionMap,
  mergeInferredAcquisitionDefaults,
  getEffectiveAcquisitionMode,
  acquisitionModeIsInStack,
  type StackAcquisitionMap,
  type AcquisitionMode,
} from "@/src/lib/stackAcquisition"
import {
  dedupeStackByStorageKey,
  filterOrphanLifestyleRowsFromLabSnapshot,
  mergeLabStackWithProfileStack,
  sortedSupplementNamesKey,
  stackItemsFromProfileCurrentSupplements,
} from "@/src/lib/profileStackMerge"
import { filterStackItemsByLabSafety } from "@/src/lib/stackLabSafety"
import { readBootstrapCache, writeBootstrapCache } from "@/src/lib/dashboardBootstrapCache"
import "../dashboard.css"

export default function DashboardPlanPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [supplementsSheetOpen, setSupplementsSheetOpen] = useState(false)
  const [stackEditRow, setStackEditRow] = useState<SavedSupplementStackItem | null>(null)

  useEffect(() => {
    if (!user?.id) {
      // Auth resolved without a user — exit loading state so unauthenticated UI can render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    const cached = readBootstrapCache(user.id)
    if (cached) {
      // Hydrate from cache synchronously on mount; any mismatch is corrected by the fetch below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(cached.saved.profile ?? null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBloodwork(cached.saved.bloodwork ?? null)
      setSubscription(cached.subscription)
      setLoading(false)
    }
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        writeBootstrapCache(user.id, { profile: p ?? null, bloodwork: b ?? null }, sub ?? null)
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

  useEffect(() => {
    const reload = () => {
      if (!user?.id) return
      loadSavedState(user.id)
        .then(({ profile: p }) => setProfile(p ?? null))
        .catch(() => {})
    }
    window.addEventListener(CLARION_PROFILE_UPDATED_EVENT, reload)
    return () => window.removeEventListener(CLARION_PROFILE_UPDATED_EVENT, reload)
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

  const [acqMap, setAcqMap] = useState<StackAcquisitionMap>({})
  const [inventory, setInventory] = useState<SupplementInventoryRow[]>([])
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  /** Supplement key (from stackItemStorageKey) whose inline supply form should auto-open after a state change. */
  const [autoOpenSupplyKey, setAutoOpenSupplyKey] = useState<string | null>(null)
  /** Has the running-low toast fired this session? Prevents spam on every render. */
  const runningLowNotifiedRef = useRef(false)

  const profileStackItems = useMemo(
    () => stackItemsFromProfileCurrentSupplements(profile?.current_supplements),
    [profile?.current_supplements]
  )
  /** Count of "what I take today" entries; drives the empty-state hint on the stack CTA. */
  const whatITakeCount = profileStackItems.length

  /** Same pipeline as dashboard Today: strip snapshot junk, merge “what you take”, then lab-safety filter. */
  const stackBeforeLabSafety = useMemo(() => {
    const rawStack =
      bloodwork?.stack_snapshot && "stack" in bloodwork.stack_snapshot && Array.isArray(bloodwork.stack_snapshot.stack)
        ? (bloodwork.stack_snapshot.stack as SavedSupplementStackItem[])
        : null
    const base = filterOrphanLifestyleRowsFromLabSnapshot(rawStack?.filter((s) => s?.supplementName?.trim()) ?? [])
    return dedupeStackByStorageKey(mergeLabStackWithProfileStack(base, profileStackItems))
  }, [bloodwork?.stack_snapshot, profileStackItems])

  const labFilteredStack = useMemo(
    () => filterStackItemsByLabSafety(stackBeforeLabSafety, analysisResults),
    [stackBeforeLabSafety, analysisResults]
  )

  const planAcqSignature = useMemo(
    () => sortedSupplementNamesKey(labFilteredStack),
    [labFilteredStack]
  )

  /** Re-run acquisition migration when saved product links / profile intake fields change (names alone aren’t enough). */
  const planAcqProductSig = useMemo(
    () =>
      labFilteredStack
        .map(
          (s) =>
            `${stackItemStorageKey(s)}:${s.productUrl ?? ""}:${s.stackEntryId ?? ""}:${s.userChoseKeepProduct ? "1" : ""}`
        )
        .join("|"),
    [labFilteredStack]
  )

  useEffect(() => {
    if (!user?.id) return
    const raw = loadStackAcquisition(user.id)
    if (labFilteredStack.length === 0) {
      // Hydrate acquisition map from localStorage even when the lab-filtered stack is empty.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAcqMap(raw)
      return
    }
    const { map, changed } = migrateStackAcquisitionMap(raw, labFilteredStack)
    const { map: merged, changed: changedInf } = mergeInferredAcquisitionDefaults(labFilteredStack, map)
    if (changed || changedInf) saveStackAcquisition(user.id, merged)
    setAcqMap(merged)
  }, [user?.id, planAcqSignature, planAcqProductSig])

  const stackWithKeys = useMemo(
    () => labFilteredStack.map((item) => ({ item, key: stackItemStorageKey(item) })),
    [labFilteredStack]
  )

  const { activeEntries, pendingEntries } = useMemo(() => {
    const active: typeof stackWithKeys = []
    const pending: typeof stackWithKeys = []
    for (const row of stackWithKeys) {
      const mode = getEffectiveAcquisitionMode(row.item, row.key, acqMap)
      if (acquisitionModeIsInStack(mode)) active.push(row)
      else pending.push(row)
    }
    return { activeEntries: active, pendingEntries: pending }
  }, [stackWithKeys, acqMap])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    getSupplementInventory(user.id)
      .then((rows) => {
        if (active) {
          setInventory(rows)
          setInventoryLoaded(true)
        }
      })
      .catch(() => {
        if (active) setInventoryLoaded(true)
      })
    return () => {
      active = false
    }
  }, [user?.id])

  const inventoryByKey = useMemo(() => {
    const map = new Map<string, SupplementInventoryRow>()
    for (const row of inventory) {
      const key = normalizeSupplementKey(row.supplement_name)
      if (key) map.set(key, row)
    }
    return map
  }, [inventory])

  const setAcq = useCallback(
    (key: string, mode: AcquisitionMode, opts?: { autoOpenSupply?: boolean }) => {
      if (!user?.id) return
      const next = setStackItemAcquisition(user.id, key, { mode })
      setAcqMap(next)
      if (opts?.autoOpenSupply) setAutoOpenSupplyKey(key)
    },
    [user]
  )

  const saveInventoryRow = useCallback(
    async (row: Omit<SupplementInventoryRow, "user_id" | "id" | "created_at" | "updated_at">) => {
      if (!user?.id) return
      await upsertSupplementInventory(user.id, row)
      const rows = await getSupplementInventory(user.id)
      setInventory(rows)
      runningLowNotifiedRef.current = false
    },
    [user]
  )

  const notifyReorderDays = profile?.notify_reorder_days ?? 7

  const runningLow = useMemo(() => {
    if (activeEntries.length === 0 || inventory.length === 0) return []
    const activeHaveItems = activeEntries
      .filter((e) => getEffectiveAcquisitionMode(e.item, e.key, acqMap) === "have")
      .map((e) => e.item)
    return computeRunningLow(activeHaveItems, inventory, notifyReorderDays)
  }, [activeEntries, inventory, acqMap, notifyReorderDays])

  useEffect(() => {
    if (runningLow.length === 0 || runningLowNotifiedRef.current) return
    runningLowNotifiedRef.current = true
    const first = runningLow[0]
    notifications.show({
      title: "Time to reorder",
      message:
        runningLow.length === 1
          ? `${first.supplementName} runs out in ${first.daysLeft} day${first.daysLeft !== 1 ? "s" : ""}.`
          : `${runningLow.length} supplements running low — keep your streak going.`,
      color: "yellow",
      autoClose: 8000,
      onClick: () => {
        if (first?.reorderUrl) window.open(first.reorderUrl, "_blank")
      },
    })
  }, [runningLow])

  const refreshAfterStackMutation = useCallback(async () => {
    if (!user?.id) return
    dispatchProfileUpdated()
    const { profile: p, bloodwork: b } = await loadSavedState(user.id)
    if (p) setProfile(p)
    if (b) setBloodwork(b)
  }, [user])

  const markAllPendingHave = useCallback(() => {
    if (!user?.id || pendingEntries.length === 0) return
    const keys = pendingEntries.map((p) => p.key)
    setAcqMap(markAllAsHave(user.id, keys))
  }, [user, pendingEntries])

  const retestWeeks = profile?.retest_weeks ?? 8
  const lastBloodworkAt = bloodwork?.updated_at ?? bloodwork?.created_at ?? null
  const [mountedAt] = useState(() => Date.now())
  const retestCountdown = useMemo(() => {
    if (!lastBloodworkAt || !retestWeeks) return null
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    const dueDate = last + weeksMs
    if (mountedAt < dueDate) {
      const weeksUntil = Math.ceil((dueDate - mountedAt) / (7 * 24 * 60 * 60 * 1000))
      return { type: "until" as const, weeks: weeksUntil }
    }
    const weeksOverdue = Math.ceil((mountedAt - dueDate) / (7 * 24 * 60 * 60 * 1000))
    return { type: "overdue" as const, weeks: weeksOverdue }
  }, [lastBloodworkAt, retestWeeks, mountedAt])

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
    const awaitingUpload = hasLabPersonalizationAccess(profile, bloodwork)
    if (awaitingUpload) {
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
    const liteSuggestions = buildLiteSupplementSuggestions({
      symptoms: profile?.symptoms ?? null,
      profile_type: profile?.profile_type ?? null,
      improvement_preference: profile?.improvement_preference ?? null,
    })
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Plan & stack</h1>
            <p className="dashboard-tab-subtitle">Clarion Lite — education topics, not lab dosing.</p>
          </header>
          <div className="dashboard-tab-card dashboard-lab-upgrade-callout">
            <p className="dashboard-lab-upgrade-callout__eyebrow">Full Clarion</p>
            <p className="dashboard-biomarkers-empty-text">
              Add bloodwork for a personalized roadmap, lab-matched stack, and savings estimates. Below is a symptom-based
              topic list only—never a substitute for your labs.
            </p>
            <p className="dashboard-lab-upgrade-callout__muted" role="note">
              {LITE_DISCLAIMER}
            </p>
            <div className="dashboard-lab-upgrade-callout__actions">
              <Link href="/paywall" className="dashboard-actions-cta">
                Add bloodwork &amp; full analysis
              </Link>
              <Link href="/dashboard" className="dashboard-tab-link dashboard-lab-upgrade-callout__secondary">
                Back to Home
              </Link>
            </div>
          </div>
          <section className="dashboard-section" aria-labelledby="dashboard-plan-lite-topics">
            <h2 id="dashboard-plan-lite-topics" className="dashboard-section-title">
              <Package className="dashboard-section-title-icon" size={18} aria-hidden /> Topics to explore
            </h2>
            <ul className="dashboard-lite-suggest-list">
              {liteSuggestions.map((s) => (
                <li key={s.presetId} className="dashboard-lite-suggest-item">
                  <p className="dashboard-lite-suggest-name">{s.displayName}</p>
                  <p className="dashboard-lite-suggest-why">{s.whySuggested}</p>
                </li>
              ))}
            </ul>
          </section>
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Plan & stack</h1>
          <p className="dashboard-tab-subtitle">
            Plan → check off on Home → log habits — stack, savings, and retest timing live here.
          </p>
        </header>

        <DashboardSectionPrimer
          title="Plan"
          body="Your supplement stack, matched to your labs. Each item shows a lab-fit chip — aligned, suboptimal, or unmapped — so you know why it's in the plan. Tap the info icon on any chip for the reasoning."
        />

        {stackBeforeLabSafety.length === 0 ? (
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
        ) : labFilteredStack.length === 0 ? (
          <section id="stack" className="dashboard-section" aria-labelledby="dashboard-plan-stack-heading">
            <h2 id="dashboard-plan-stack-heading" className="dashboard-section-title">
              <Package className="dashboard-section-title-icon" size={18} aria-hidden /> My supplements
            </h2>
            <div className="dashboard-card dashboard-stack-empty">
              <p className="dashboard-stack-empty-text">
                Your saved plan included supplements that don&apos;t match your current labs (for example, a level is already high).
                Re-run the analysis flow to refresh recommendations.
              </p>
              <Link href="/" className="dashboard-stack-link">
                Open analysis flow →
              </Link>
            </div>
          </section>
        ) : (
          <StackSection
            stackBeforeLabSafety={stackBeforeLabSafety}
            labFilteredStack={labFilteredStack}
            activeEntries={activeEntries}
            pendingEntries={pendingEntries}
            acqMap={acqMap}
            inventoryByKey={inventoryByKey}
            inventoryLoaded={inventoryLoaded}
            runningLowCount={runningLow.length}
            runningLowFirstUrl={runningLow[0]?.reorderUrl ?? null}
            runningLowFirst={runningLow[0] ?? null}
            notifyReorderDays={notifyReorderDays}
            analysisResults={analysisResults}
            autoOpenSupplyKey={autoOpenSupplyKey}
            onConsumedAutoOpen={() => setAutoOpenSupplyKey(null)}
            onSetAcq={setAcq}
            onSaveInventory={saveInventoryRow}
            onMarkAllPendingHave={markAllPendingHave}
            onOpenWhatITake={() => setSupplementsSheetOpen(true)}
            whatITakeCount={whatITakeCount}
            onEditRow={(row) => setStackEditRow(row)}
            onDeleteRow={(row) => {
              if (!user?.id) return
              if (!window.confirm(`Remove “${row.supplementName}” from your stack?`)) return
              void (async () => {
                try {
                  await deleteMergedStackItem(user.id, row, profile, bloodwork)
                  await refreshAfterStackMutation()
                  notifications.show({ title: "Removed", message: "Your stack was updated.", color: "green" })
                } catch {
                  notifications.show({ title: "Couldn’t update", message: "Try again in a moment.", color: "red" })
                }
              })()
            }}
          />
        )}

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
              <button type="button" className="dashboard-savings-nudge-link dashboard-savings-nudge-link--button" onClick={() => setSupplementsSheetOpen(true)}>
                Add supplements you already take
              </button>
              {" · "}
              <Link href="/settings" className="dashboard-savings-nudge-link">
                or monthly spend in Settings
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
              <Link href="/dashboard/biomarkers" className="dashboard-saved-plan-link">
                Biomarker insights
              </Link>
              <Link href="/dashboard/plan#stack" className="dashboard-saved-plan-link">
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
                  const url = typeof window !== "undefined" ? `${window.location.origin}/dashboard/biomarkers` : ""
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
                  const planUrl = `${window.location.origin}/dashboard/biomarkers`
                  const mailto = `mailto:?subject=${encodeURIComponent("My Clarion health plan")}&body=${encodeURIComponent(`View my biomarker insights in Clarion: ${planUrl}`)}`
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
      {supplementsSheetOpen ? (
        <WhatITakeSheet userId={user?.id} onClose={() => setSupplementsSheetOpen(false)} />
      ) : null}
      <StackItemEditModal
        open={stackEditRow != null}
        title="Update supplement"
        initialName={stackEditRow?.supplementName ?? ""}
        initialDose={stackEditRow?.dose ?? ""}
        initialUrl={stackEditRow?.productUrl ?? ""}
        onClose={() => setStackEditRow(null)}
        onSave={async (payload) => {
          if (!user?.id || !stackEditRow) return
          try {
            await updateMergedStackItem(user.id, stackEditRow, payload, profile, bloodwork)
            setStackEditRow(null)
            await refreshAfterStackMutation()
            notifications.show({ title: "Saved", message: "Supplement details updated.", color: "green" })
          } catch {
            notifications.show({ title: "Couldn’t save", message: "Try again in a moment.", color: "red" })
          }
        }}
      />
    </>
  )
}

type StackSectionProps = {
  stackBeforeLabSafety: SavedSupplementStackItem[]
  labFilteredStack: SavedSupplementStackItem[]
  activeEntries: { item: SavedSupplementStackItem; key: string }[]
  pendingEntries: { item: SavedSupplementStackItem; key: string }[]
  acqMap: StackAcquisitionMap
  inventoryByKey: Map<string, SupplementInventoryRow>
  inventoryLoaded: boolean
  runningLowCount: number
  runningLowFirstUrl: string | null
  runningLowFirst: { supplementName: string; daysLeft: number } | null
  notifyReorderDays: number
  analysisResults: ReturnType<typeof analyzeBiomarkers>
  autoOpenSupplyKey: string | null
  onConsumedAutoOpen: () => void
  onSetAcq: (key: string, mode: AcquisitionMode, opts?: { autoOpenSupply?: boolean }) => void
  onSaveInventory: (row: Omit<SupplementInventoryRow, "user_id" | "id" | "created_at" | "updated_at">) => Promise<void>
  onMarkAllPendingHave: () => void
  onEditRow: (row: SavedSupplementStackItem) => void
  onDeleteRow: (row: SavedSupplementStackItem) => void
  onOpenWhatITake: () => void
  whatITakeCount: number
}

/** Rank used to group the single unified stack list: urgent → actionable → normal → pending. */
function sortRank(mode: AcquisitionMode, inventory: SupplementInventoryRow | null, notifyDays: number): number {
  if (mode === "none") return 90
  if (mode === "have" && inventory) {
    const pills = Number(inventory.pills_per_bottle)
    const dose = Number(inventory.dose_per_day)
    if (pills > 0 && dose > 0) {
      const runOutDate = new Date(inventory.opened_at)
      const daysSupply = Math.floor(pills / dose)
      runOutDate.setDate(runOutDate.getDate() + daysSupply)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((runOutDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
      if (daysLeft <= 0) return 10
      if (daysLeft <= notifyDays) return 20
    }
  }
  if (mode === "ordered") return 40
  if (mode === "shipped") return 30
  if (mode === "have") return 50
  return 80
}

function StackSection({
  stackBeforeLabSafety,
  labFilteredStack,
  activeEntries,
  pendingEntries,
  acqMap,
  inventoryByKey,
  inventoryLoaded,
  runningLowCount,
  runningLowFirstUrl,
  runningLowFirst,
  notifyReorderDays,
  analysisResults,
  autoOpenSupplyKey,
  onConsumedAutoOpen,
  onSetAcq,
  onSaveInventory,
  onMarkAllPendingHave,
  onEditRow,
  onDeleteRow,
  onOpenWhatITake,
  whatITakeCount,
}: StackSectionProps) {
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!infoOpen) return
    const close = (e: MouseEvent) => {
      if (!infoRef.current?.contains(e.target as Node)) setInfoOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [infoOpen])

  const combined = useMemo(() => {
    const rows = [
      ...activeEntries.map(({ item, key }) => ({
        item,
        key,
        mode: getEffectiveAcquisitionMode(item, key, acqMap),
        inventory: inventoryByKey.get(normalizeSupplementKey(item.supplementName)) ?? null,
      })),
      ...pendingEntries.map(({ item, key }) => ({
        item,
        key,
        mode: "none" as AcquisitionMode,
        inventory: inventoryByKey.get(normalizeSupplementKey(item.supplementName)) ?? null,
      })),
    ]
    rows.sort((a, b) => {
      const ra = sortRank(a.mode, a.inventory, notifyReorderDays)
      const rb = sortRank(b.mode, b.inventory, notifyReorderDays)
      if (ra !== rb) return ra - rb
      return a.item.supplementName.localeCompare(b.item.supplementName)
    })
    return rows
  }, [activeEntries, pendingEntries, acqMap, inventoryByKey, notifyReorderDays])

  const visibleRows = combined.slice(0, 50)
  const overflowCount = Math.max(0, combined.length - 50)

  const activeCount = activeEntries.length
  const pendingCount = pendingEntries.length

  const trackedCount = activeEntries.filter(
    (e) =>
      getEffectiveAcquisitionMode(e.item, e.key, acqMap) === "have" &&
      inventoryByKey.has(normalizeSupplementKey(e.item.supplementName))
  ).length
  const haveCount = activeEntries.filter(
    (e) => getEffectiveAcquisitionMode(e.item, e.key, acqMap) === "have"
  ).length
  const untrackedHaveCount = haveCount - trackedCount

  return (
    <section id="stack" className="dashboard-section" aria-labelledby="dashboard-plan-stack-heading">
      <div className="dashboard-stack-heading-row">
        <h2 id="dashboard-plan-stack-heading" className="dashboard-section-title">
          <Package className="dashboard-section-title-icon" size={18} aria-hidden /> My supplements
        </h2>
        <button
          type="button"
          className="dashboard-stack-whatitake-cta"
          onClick={onOpenWhatITake}
        >
          <Package size={14} aria-hidden />
          {whatITakeCount === 0 ? "+ Add what I take" : "Edit what I take"}
        </button>
        <div className="dashboard-stack-info-wrap" ref={infoRef}>
          <button
            type="button"
            className="dashboard-stack-info-btn"
            aria-label="How the stack differs from Home"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((o) => !o)}
          >
            <Info size={14} aria-hidden />
            <span>How this works</span>
          </button>
          {infoOpen ? (
            <div role="tooltip" className="dashboard-stack-info-popover">
              <p>
                <strong>Stack</strong> tracks supply — what you own, what’s on the way, and when to reorder. Items you confirm,
                order, or that you’ve linked a product for appear here.
              </p>
              <p>
                <Link href="/dashboard#protocol" className="dashboard-stack-info-link">
                  Home → Today
                </Link>{" "}
                is for daily logging — your full lab-based protocol shows there whether or not you have the bottle yet.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {stackBeforeLabSafety.length > labFilteredStack.length ? (
        <p className="dashboard-stack-lab-filter-note">
          Some items were removed because your current labs don&apos;t support adding more of those nutrients.
        </p>
      ) : null}

      <div className="dashboard-stack-summary" role="group" aria-label="Stack summary">
        <div className="dashboard-stack-summary-stats">
          <div className="dashboard-stack-summary-stat">
            <span className="dashboard-stack-summary-value">{activeCount}</span>
            <span className="dashboard-stack-summary-label">in your stack</span>
          </div>
          {pendingCount > 0 ? (
            <div className="dashboard-stack-summary-stat dashboard-stack-summary-stat--muted">
              <span className="dashboard-stack-summary-value">{pendingCount}</span>
              <span className="dashboard-stack-summary-label">to confirm</span>
            </div>
          ) : null}
          {inventoryLoaded && runningLowCount > 0 ? (
            <div className="dashboard-stack-summary-stat dashboard-stack-summary-stat--warn">
              <AlertTriangle size={14} aria-hidden />
              <span className="dashboard-stack-summary-value">{runningLowCount}</span>
              <span className="dashboard-stack-summary-label">running low</span>
            </div>
          ) : null}
        </div>
        <div className="dashboard-stack-summary-actions">
          {pendingCount > 0 ? (
            <button
              type="button"
              className="dashboard-stack-acq-btn dashboard-stack-acq-btn--primary"
              onClick={onMarkAllPendingHave}
            >
              I have all of these
            </button>
          ) : null}
          {inventoryLoaded && runningLowCount > 0 && runningLowFirstUrl ? (
            <a
              href={runningLowFirstUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-stack-reorder-btn dashboard-stack-reorder-btn--urgent"
            >
              {runningLowCount === 1
                ? `Reorder ${runningLowFirst?.supplementName}`
                : `Reorder next (${runningLowCount})`}
            </a>
          ) : null}
        </div>
      </div>

      {whatITakeCount === 0 ? (
        <div className="dashboard-stack-whatitake-banner" role="note">
          <div className="dashboard-stack-whatitake-banner__copy">
            <strong>These are Clarion&apos;s suggestions, not your cabinet.</strong>
            <span>
              Add the bottles you already have so today&apos;s doses, supply, and savings reflect your real routine.
            </span>
          </div>
          <button
            type="button"
            className="dashboard-stack-whatitake-banner__cta"
            onClick={onOpenWhatITake}
          >
            Add what I take
          </button>
        </div>
      ) : null}

      <div className="dashboard-stack-card dashboard-card">
        {visibleRows.length > 0 ? (
          <ul className="dashboard-stack-list dashboard-stack-list--v2">
            {visibleRows.map(({ item, key, mode, inventory }) => (
              <StackSupplyRow
                key={key}
                item={item}
                storageKey={key}
                mode={mode}
                inventory={inventory}
                analysisResults={analysisResults}
                notifyDays={notifyReorderDays}
                autoOpenSupplyForm={autoOpenSupplyKey === key}
                onConsumedAutoOpen={onConsumedAutoOpen}
                onSetMode={(m) => {
                  const needsSupply =
                    m === "have" &&
                    !inventoryByKey.has(normalizeSupplementKey(item.supplementName))
                  onSetAcq(key, m, needsSupply ? { autoOpenSupply: true } : undefined)
                }}
                onSaveInventory={onSaveInventory}
                onEdit={() => onEditRow(item)}
                onDelete={() => onDeleteRow(item)}
              />
            ))}
            {overflowCount > 0 ? (
              <li className="dashboard-stack-more">+{overflowCount} more</li>
            ) : null}
          </ul>
        ) : (
          <p className="dashboard-stack-intro" style={{ padding: "18px 20px" }}>
            Nothing in your active stack yet — confirm items below, or mark an order as arrived.
          </p>
        )}
        {inventoryLoaded && haveCount > 0 && untrackedHaveCount > 0 ? (
          <p className="dashboard-stack-supply-hint">
            Tip: add pills/bottle to {untrackedHaveCount === 1 ? "one supplement" : `${untrackedHaveCount} supplements`} so
            Clarion can warn you before you run out.
          </p>
        ) : null}
        <p className="dashboard-stack-disclosure">{AFFILIATE_DISCLOSURE}</p>
        <p className="dashboard-stack-disclosure dashboard-stack-disclosure--secondary">{MONTHLY_COST_DISCLAIMER}</p>
        <Link href="/" className="dashboard-stack-link">
          Open full analysis flow →
        </Link>
      </div>
    </section>
  )
}
