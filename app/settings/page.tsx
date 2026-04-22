"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile } from "@/src/lib/bloodwiseDb"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { ThemeToggle } from "@/src/components/ThemeToggle"
import { PROFILE_TYPE_OPTIONS } from "@/src/lib/clarionProfiles"
import { SYMPTOM_OPTIONS } from "@/src/lib/priorityRanking"
import { CurrentSupplementsEditor } from "@/src/components/CurrentSupplementsEditor"
import {
  getAnalysisPriceDisplayDollars,
  getSubscriptionPriceDisplayDollars,
} from "@/src/lib/analysisPricing"

type SubscriptionStatus = {
  hasSubscription: boolean
  status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
  trial_end: string | null
  analysis_purchased_at: string | null
}

function formatDateHuman(iso: string | null): string {
  if (!iso) return ""
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ""
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/** Reusable badge pill for subscription status. */
function StatusBadge({ tone, children }: { tone: "active" | "warn" | "neutral"; children: React.ReactNode }) {
  return <span className={`settings-sub-badge settings-sub-badge--${tone}`}>{children}</span>
}

function SubscriptionSummary({
  sub,
  busy,
  onCancel,
  onResume,
  error,
  showCancelConfirm,
  onAbortCancel,
  onConfirmCancel,
}: {
  sub: SubscriptionStatus
  busy: boolean
  onCancel: () => void
  onResume: () => Promise<void>
  error: string | null
  showCancelConfirm: boolean
  onAbortCancel: () => void
  onConfirmCancel: () => Promise<void>
}) {
  const status = sub.status
  const isTrial = status === "trialing"
  const isActive = status === "active"
  const isPastDue = status === "past_due"
  const isCanceled = status === "canceled" || status === "incomplete_expired"
  const pendingCancel = sub.cancel_at_period_end && (isTrial || isActive || isPastDue)

  // Line 1: what state are we in?
  let badge: React.ReactNode = null
  let headline = ""
  if (pendingCancel) {
    badge = <StatusBadge tone="warn">Canceling</StatusBadge>
    headline = `Clarion+ ends ${formatDateHuman(sub.current_period_end)}`
  } else if (isTrial) {
    badge = <StatusBadge tone="active">Free trial</StatusBadge>
    headline = `Clarion+ free through ${formatDateHuman(sub.trial_end ?? sub.current_period_end)}`
  } else if (isActive) {
    badge = <StatusBadge tone="active">Active</StatusBadge>
    headline = `Clarion+ renews ${formatDateHuman(sub.current_period_end)} — $${getSubscriptionPriceDisplayDollars()} every 2 months`
  } else if (isPastDue) {
    badge = <StatusBadge tone="warn">Payment failed</StatusBadge>
    headline = "Clarion+ payment didn't go through. Update your card in Stripe."
  } else if (isCanceled) {
    badge = <StatusBadge tone="neutral">Canceled</StatusBadge>
    headline = "Clarion+ is no longer active."
  } else {
    badge = <StatusBadge tone="neutral">{status}</StatusBadge>
    headline = "Clarion+ subscription"
  }

  return (
    <div className="settings-sub">
      <div className="settings-sub-row">
        <span className="settings-sub-headline">{headline}</span>
        {badge}
      </div>
      <p className="settings-hint" style={{ margin: "4px 0 12px" }}>
        Your ${getAnalysisPriceDisplayDollars()} analysis is permanent — canceling only stops the
        ${getSubscriptionPriceDisplayDollars()} / 2-month Clarion+ add-on. Your report, biomarkers,
        and history always stay in your account.
      </p>

      {isTrial && !pendingCancel && (
        <p className="settings-sub-note">
          We included 2 months of Clarion+ with your analysis. You won&apos;t be charged until{" "}
          <strong>{formatDateHuman(sub.trial_end ?? sub.current_period_end)}</strong>. Cancel any
          time before then and you&apos;ll never be billed.
        </p>
      )}

      {error && <p className="settings-sub-error">{error}</p>}

      {!isCanceled && !pendingCancel && !showCancelConfirm && (
        <button
          type="button"
          className="settings-sub-btn settings-sub-btn--ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel Clarion+ subscription
        </button>
      )}

      {!isCanceled && !pendingCancel && showCancelConfirm && (
        <div className="settings-sub-confirm">
          <p className="settings-sub-confirm-body">
            {isTrial ? (
              <>
                Cancel now and Clarion+ will end on{" "}
                <strong>{formatDateHuman(sub.trial_end ?? sub.current_period_end)}</strong> — you
                keep access until then and we never charge your card.
              </>
            ) : (
              <>
                Cancel and Clarion+ will end on{" "}
                <strong>{formatDateHuman(sub.current_period_end)}</strong>. You keep access until
                then.
              </>
            )}
          </p>
          <div className="settings-sub-confirm-actions">
            <button
              type="button"
              className="settings-sub-btn settings-sub-btn--ghost"
              onClick={onAbortCancel}
              disabled={busy}
            >
              Keep subscription
            </button>
            <button
              type="button"
              className="settings-sub-btn settings-sub-btn--danger"
              onClick={onConfirmCancel}
              disabled={busy}
            >
              {busy ? "Canceling…" : "Yes, cancel"}
            </button>
          </div>
        </div>
      )}

      {pendingCancel && (
        <button
          type="button"
          className="settings-sub-btn"
          onClick={() => { void onResume() }}
          disabled={busy}
        >
          {busy ? "Working…" : "Keep Clarion+ (undo cancel)"}
        </button>
      )}
    </div>
  )
}

function NoSubscriptionSummary({
  analysisPurchasedAt,
  error,
}: {
  analysisPurchasedAt: string | null
  error: string | null
}) {
  const hasAnalysis = Boolean(analysisPurchasedAt)
  return (
    <div className="settings-sub">
      <div className="settings-sub-row">
        <span className="settings-sub-headline">
          {hasAnalysis ? "No Clarion+ subscription" : "No purchase yet"}
        </span>
        <StatusBadge tone="neutral">{hasAnalysis ? "Analysis only" : "Inactive"}</StatusBadge>
      </div>
      {hasAnalysis ? (
        <p className="settings-hint" style={{ margin: 0 }}>
          You bought the one-time ${getAnalysisPriceDisplayDollars()} analysis — that&apos;s
          permanent. Clarion+ (${getSubscriptionPriceDisplayDollars()} every 2 months) is the
          optional add-on for ongoing retests, priority AI, and deeper trend reports.
        </p>
      ) : (
        <p className="settings-hint" style={{ margin: 0 }}>
          To get your personalized Clarion analysis, start with the ${getAnalysisPriceDisplayDollars()} one-time
          purchase. That unlocks your report and includes 2 months of Clarion+ free.
        </p>
      )}
      {error && <p className="settings-sub-error" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [phone, setPhone] = useState("")
  const [retestWeeks, setRetestWeeks] = useState(8)
  const [scoreGoal, setScoreGoal] = useState<number | "">(80)
  const [notifyReorderEmail, setNotifyReorderEmail] = useState(true)
  const [notifyReorderDays, setNotifyReorderDays] = useState(7)
  const [heightWeightUnits, setHeightWeightUnits] = useState<"imperial" | "metric">("imperial")
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [subLoading, setSubLoading] = useState(true)
  const [subBusy, setSubBusy] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  const loadSubscription = useCallback(async () => {
    setSubLoading(true)
    setSubError(null)
    try {
      const res = await fetch("/api/subscription/status", { cache: "no-store" })
      if (!res.ok) throw new Error(`status_${res.status}`)
      const data = (await res.json()) as SubscriptionStatus
      setSub(data)
    } catch {
      setSub(null)
      setSubError("Could not load subscription details.")
    } finally {
      setSubLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    void loadSubscription()
  }, [user?.id, loadSubscription])

  const handleCancelSubscription = useCallback(async () => {
    setSubBusy(true)
    setSubError(null)
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Cancel failed (${res.status})`
        )
      }
      setShowCancelConfirm(false)
      await loadSubscription()
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Cancel failed")
    } finally {
      setSubBusy(false)
    }
  }, [loadSubscription])

  const handleResumeSubscription = useCallback(async () => {
    setSubBusy(true)
    setSubError(null)
    try {
      const res = await fetch("/api/subscription/resume", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Resume failed (${res.status})`
        )
      }
      await loadSubscription()
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Resume failed")
    } finally {
      setSubBusy(false)
    }
  }, [loadSubscription])

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Type DELETE (all caps) to confirm.')
      return
    }
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `Delete failed (${res.status})`
        )
      }
      // Auth row is gone. Clear local session and send user home.
      await signOut().catch(() => {})
      router.replace("/?account_deleted=1")
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed")
      setDeleteBusy(false)
    }
  }, [deleteConfirmText, signOut, router])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadSavedState(user.id)
      .then(({ profile: p }) => {
        setProfile(p ?? null)
        if (p) {
          setPhone(p.phone ?? "")
          setRetestWeeks(p.retest_weeks ?? 8)
          setScoreGoal(p.score_goal != null ? p.score_goal : "")
          setNotifyReorderEmail(p.notify_reorder_email !== false)
          setNotifyReorderDays(p.notify_reorder_days ?? 7)
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleSave = useCallback(async () => {
    if (!user || !profile) return
    setSaving(true)
    setSaved(false)
    try {
      const heightVal = profile.height_cm != null ? Number(profile.height_cm) : undefined
      const weightVal = profile.weight_kg != null ? Number(profile.weight_kg) : undefined
      await upsertProfile(user.id, {
        ...profile,
        age: profile.age ?? "",
        sex: profile.sex ?? "",
        sport: profile.sport ?? "",
        goal: profile.goal ?? "",
        current_supplement_spend: profile.current_supplement_spend ?? "",
        current_supplements: profile.current_supplements ?? "",
        shopping_preference: profile.shopping_preference ?? "Best value",
        improvement_preference: profile.improvement_preference ?? "",
        profile_type: profile.profile_type ?? "",
        phone: phone.trim() || undefined,
        retest_weeks: retestWeeks,
        height_cm: Number.isFinite(heightVal) ? heightVal : undefined,
        weight_kg: Number.isFinite(weightVal) ? weightVal : undefined,
        supplement_form_preference: profile.supplement_form_preference ?? "any",
        diet_preference: profile.diet_preference ?? undefined,
        streak_milestones: profile.streak_milestones ?? true,
        daily_reminder: profile.daily_reminder ?? undefined,
        score_goal: scoreGoal === "" ? undefined : (Number(scoreGoal) || undefined),
        notify_reorder_email: notifyReorderEmail,
        notify_reorder_days: notifyReorderDays,
      })
      const { profile: fresh } = await loadSavedState(user.id)
      if (fresh) {
        setProfile(fresh)
        setPhone(fresh.phone ?? "")
        setRetestWeeks(fresh.retest_weeks ?? 8)
        setScoreGoal(fresh.score_goal != null ? fresh.score_goal : "")
        setNotifyReorderEmail(fresh.notify_reorder_email !== false)
        setNotifyReorderDays(fresh.notify_reorder_days ?? 7)
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }, [user, profile, phone, retestWeeks, scoreGoal, notifyReorderEmail, notifyReorderDays])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.replace("/login")
  }, [signOut, router])

  if (authLoading || (user && loading)) {
    return (
      <main className="settings-shell">
        <div className="settings-container">
          <div className="settings-loading">Loading settings…</div>
        </div>
        <style jsx>{`
          .settings-shell { min-height: 100vh; background: var(--color-bg); color: var(--color-text-primary); }
          .settings-container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
          .settings-loading { color: var(--color-text-muted); font-size: 14px; }
        `}</style>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="settings-shell">
      <div className="settings-bg" />
      <div className="settings-container">
        <header className="settings-header">
          <div className="settings-header-row">
            <Link href="/dashboard" className="settings-back">← Back to Dashboard</Link>
            <div className="settings-header-actions">
              <ThemeToggle />
              <button type="button" className="settings-signout" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Profile, preferences, and account</p>
          <p className="settings-survey-hint">
            <Link href="/?step=survey" className="settings-survey-link">
              Open survey &amp; onboarding
            </Link>
          </p>
        </header>

        {profile && (
          <>
            <section className="settings-section" aria-labelledby="settings-profile-heading">
              <h2 id="settings-profile-heading" className="settings-section-title">Profile</h2>
              <div className="settings-card">
                <div className="settings-form">
                  <label className="settings-field">
                    <span>What best describes you?</span>
                    <select
                      value={profile.profile_type ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, profile_type: e.target.value } : null)}
                      className="settings-select"
                    >
                      <option value="">Select…</option>
                      {PROFILE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="settings-field">
                    <span id="settings-symptoms-label">Symptoms to prioritize (optional)</span>
                    <p className="settings-field-hint">Used to rank which flagged biomarkers matter most for you.</p>
                    <div className="settings-symptom-pills" role="group" aria-labelledby="settings-symptoms-label">
                      {SYMPTOM_OPTIONS.filter((o) => o.id !== "none").map((opt) => {
                        const parts = (profile.symptoms ?? "").split(",").map((s) => s.trim()).filter(Boolean)
                        const selected = parts.includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`settings-symptom-pill ${selected ? "settings-symptom-pill--selected" : ""}`}
                            aria-pressed={selected}
                            onClick={() => {
                              setProfile((p) => {
                                if (!p) return null
                                const cur = (p.symptoms ?? "").split(",").map((s) => s.trim()).filter(Boolean)
                                const next = selected ? cur.filter((x) => x !== opt.id) : [...cur, opt.id]
                                return { ...p, symptoms: next.length ? next.join(",") : null }
                              })
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <label className="settings-field">
                    <span>Age</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={profile.age ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, age: e.target.value } : null)}
                      placeholder="e.g. 35"
                      className="settings-input"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Sex</span>
                    <select
                      value={profile.sex ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, sex: e.target.value } : null)}
                      className="settings-select"
                    >
                      <option value="">Select…</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>Diet preference</span>
                    <select
                      value={profile.diet_preference ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, diet_preference: e.target.value || undefined } : null)}
                      className="settings-select"
                    >
                      <option value="">None</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="high_protein">High protein</option>
                      <option value="low_carb">Low carb</option>
                      <option value="mediterranean">Mediterranean</option>
                    </select>
                  </label>
                  <div className="settings-units-row">
                    <span className="settings-units-label">Height & weight</span>
                    <button type="button" role="switch" aria-checked={heightWeightUnits === "metric"} className={`settings-units-btn ${heightWeightUnits === "metric" ? "settings-units-btn--metric" : ""}`} onClick={(e) => { e.preventDefault(); setHeightWeightUnits((u) => (u === "imperial" ? "metric" : "imperial")); }}>
                      <span className={heightWeightUnits === "imperial" ? "settings-units-active" : undefined}>ft/in, lb</span>
                      <span className={heightWeightUnits === "metric" ? "settings-units-active" : undefined}>cm, kg</span>
                    </button>
                  </div>
                  {heightWeightUnits === "imperial" ? (
                    <div key="imperial">
                      <label className="settings-field">
                        <span>Height (ft, in)</span>
                        <div className="settings-height-row">
                          <input type="number" min={3} max={8} placeholder="5" value={profile.height_cm != null && profile.height_cm > 0 ? Math.floor(profile.height_cm / 30.48) : ""} onChange={(e) => { const feet = e.target.value === "" ? 0 : Number(e.target.value); const inches = profile.height_cm != null && profile.height_cm > 0 ? Math.round((profile.height_cm / 30.48) % 1 * 12) : 0; setProfile((p) => p ? { ...p, height_cm: feet || inches ? Math.round(feet * 30.48 + inches * 2.54) : undefined } : null) }} className="settings-input settings-input-ft" />
                          <span className="settings-unit-suffix">ft</span>
                          <input type="number" min={0} max={11} placeholder="10" value={profile.height_cm != null && profile.height_cm > 0 ? Math.round((profile.height_cm / 30.48) % 1 * 12) : ""} onChange={(e) => { const inches = e.target.value === "" ? 0 : Number(e.target.value); const feet = profile.height_cm != null && profile.height_cm > 0 ? Math.floor(profile.height_cm / 30.48) : 0; setProfile((p) => p ? { ...p, height_cm: feet || inches ? Math.round(feet * 30.48 + inches * 2.54) : undefined } : null) }} className="settings-input settings-input-in" />
                          <span className="settings-unit-suffix">in</span>
                        </div>
                      </label>
                      <label className="settings-field">
                        <span>Weight (lb)</span>
                        <input type="number" step="any" placeholder="e.g. 150" value={profile.weight_kg != null && profile.weight_kg > 0 ? Number((profile.weight_kg * 2.205).toFixed(1)) : ""} onChange={(e) => { const raw = e.target.value.trim(); if (raw === "") { setProfile((p) => p ? { ...p, weight_kg: undefined } : null); return; } const lb = Number(raw); if (!Number.isNaN(lb) && lb > 0) setProfile((p) => p ? { ...p, weight_kg: lb / 2.205 } : null); }} className="settings-input" />
                      </label>
                    </div>
                  ) : (
                    <div key="metric">
                      <label className="settings-field">
                        <span>Height (cm)</span>
                        <input type="number" min={100} max={250} step={1} value={profile.height_cm ?? ""} onChange={(e) => { const v = e.target.value === "" ? undefined : Number(e.target.value); setProfile((p) => p ? { ...p, height_cm: v ?? undefined } : null) }} placeholder="e.g. 170" className="settings-input" />
                      </label>
                      <label className="settings-field">
                        <span>Weight (kg)</span>
                        <input type="number" step="any" placeholder="e.g. 70" value={profile.weight_kg != null ? profile.weight_kg : ""} onChange={(e) => { const raw = e.target.value.trim(); if (raw === "") { setProfile((p) => p ? { ...p, weight_kg: undefined } : null); return; } const kg = Number(raw); if (!Number.isNaN(kg) && kg > 0) setProfile((p) => p ? { ...p, weight_kg: kg } : null); }} className="settings-input" />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-prefs-heading">
              <h2 id="settings-prefs-heading" className="settings-section-title">Preferences</h2>
              <div className="settings-card">
                <p className="settings-hint">Health, supplements, and retest reminders. Save once to update all.</p>
                <div className="settings-form">
                  <label className="settings-field">
                    <span>How do you prefer to improve your biomarkers?</span>
                    <select
                      value={profile.improvement_preference ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, improvement_preference: e.target.value } : null)}
                      className="settings-select"
                    >
                      <option value="">Select…</option>
                      <option value="Supplements">Supplements</option>
                      <option value="Diet">Diet</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Combination">Combination (recommended)</option>
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>Can you take pills?</span>
                    <select
                      value={profile.supplement_form_preference ?? "any"}
                      onChange={(e) => setProfile((p) => p ? { ...p, supplement_form_preference: e.target.value } : null)}
                      className="settings-select"
                    >
                      <option value="any">Yes</option>
                      <option value="no_pills">No — recommend gummies, powder, or drinks</option>
                    </select>
                  </label>
                  <p className="settings-note">
                    {profile.supplement_form_preference === "no_pills"
                      ? "We’ll prioritize gummies, powders, and drinks when available."
                      : "We’ll show the best option for each supplement."}
                  </p>
                  <div className="settings-field">
                    <span className="settings-field-label-block">Current supplements (if any)</span>
                    <CurrentSupplementsEditor
                      idPrefix="settings-supplements"
                      value={profile.current_supplements ?? ""}
                      onChange={(serialized) => setProfile((p) => (p ? { ...p, current_supplements: serialized } : null))}
                    />
                  </div>
                  <label className="settings-field">
                    <span>Monthly supplement spend (approx.)</span>
                    <input
                      type="text"
                      value={profile.current_supplement_spend ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplement_spend: e.target.value } : null)}
                      placeholder="e.g. $50"
                      className="settings-input"
                    />
                  </label>
                  <label className="settings-field">
                    <span>Remind me to retest every (weeks)</span>
                    <select
                      value={retestWeeks}
                      onChange={(e) => setRetestWeeks(Number(e.target.value))}
                      className="settings-select"
                    >
                      {[6, 8, 10, 12].map((w) => (
                        <option key={w} value={w}>{w} weeks</option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>Health score goal (optional)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={scoreGoal === "" ? "" : scoreGoal}
                      onChange={(e) => setScoreGoal(e.target.value === "" ? "" : Math.min(100, Math.max(1, Number(e.target.value))))}
                      placeholder="e.g. 80"
                      className="settings-input"
                    />
                    <span className="settings-hint">Leave empty for no goal. Dashboard will show progress when set.</span>
                  </label>
                  <label className="settings-field">
                    <span>Phone (optional, for SMS reminders)</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 000 0000"
                      className="settings-input"
                    />
                  </label>
                  <label className="settings-field settings-field-checkbox">
                    <input
                      type="checkbox"
                      checked={profile.streak_milestones !== false}
                      onChange={(e) => setProfile((p) => p ? { ...p, streak_milestones: e.target.checked } : null)}
                      className="settings-checkbox"
                    />
                    <span>Show in-app toast when I hit a streak milestone (7, 10, 30 days)</span>
                  </label>
                  <label className="settings-field settings-field-checkbox">
                    <input
                      type="checkbox"
                      checked={profile.daily_reminder === true}
                      onChange={(e) => setProfile((p) => p ? { ...p, daily_reminder: e.target.checked } : null)}
                      className="settings-checkbox"
                    />
                    <span>Email me a daily nudge to log my protocol (if not complete yet; ~9am ET)</span>
                  </label>
                  <div className="settings-field-group">
                    <span className="settings-field-label">Supplement reorder reminders</span>
                    <label className="settings-field settings-field-checkbox">
                      <input
                        type="checkbox"
                        checked={notifyReorderEmail}
                        onChange={(e) => setNotifyReorderEmail(e.target.checked)}
                        className="settings-checkbox"
                      />
                      <span>
                        Notify me when supplements are running low (in-app on Plan when you track inventory; email
                        delivery is not wired yet)
                      </span>
                    </label>
                    <label className="settings-field">
                      <span>Remind me this many days before running out</span>
                      <select
                        value={notifyReorderDays}
                        onChange={(e) => setNotifyReorderDays(Number(e.target.value))}
                        className="settings-select"
                      >
                        {[3, 5, 7, 14].map((d) => (
                          <option key={d} value={d}>{d} days before</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button type="button" className="settings-save" disabled={saving} onClick={handleSave}>
                    {saving ? "Saving…" : "Save preferences"}
                  </button>
                  {saved && <span className="settings-saved">Saved.</span>}
                </div>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-billing-heading">
              <h2 id="settings-billing-heading" className="settings-section-title">Subscription</h2>
              <div className="settings-card">
                {/*
                  Product rule:
                    $49 one-time analysis is permanent. You cannot get the analysis by
                    paying $29/month. After $49 we auto-start a 2-month free period of
                    Clarion+ ($29 every 2 months); you can cancel at any time. Canceling
                    Clarion+ NEVER removes your analysis, report, or historical data.
                */}
                {subLoading ? (
                  <p className="settings-hint" style={{ margin: 0 }}>Loading subscription…</p>
                ) : sub && sub.hasSubscription ? (
                  <SubscriptionSummary
                    sub={sub}
                    busy={subBusy}
                    onCancel={() => setShowCancelConfirm(true)}
                    onResume={handleResumeSubscription}
                    error={subError}
                    showCancelConfirm={showCancelConfirm}
                    onAbortCancel={() => setShowCancelConfirm(false)}
                    onConfirmCancel={handleCancelSubscription}
                  />
                ) : (
                  <NoSubscriptionSummary
                    analysisPurchasedAt={sub?.analysis_purchased_at ?? null}
                    error={subError}
                  />
                )}
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-account-heading">
              <h2 id="settings-account-heading" className="settings-section-title">Account</h2>
              <div className="settings-card">
                <div className="settings-account-row">
                  <span className="settings-account-label">Theme</span>
                  <ThemeToggle />
                </div>
                <p className="settings-hint">Use the sun/moon icon above to switch light and dark mode.</p>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-danger-heading">
              <h2 id="settings-danger-heading" className="settings-section-title settings-danger-title">Danger zone</h2>
              <div className="settings-card settings-card--danger">
                <p className="settings-hint" style={{ margin: "0 0 12px" }}>
                  Permanently delete your account and all associated data — profile, bloodwork,
                  protocol logs, supplement tracking, and any uploaded lab files. Any active
                  Clarion+ subscription will be canceled immediately in Stripe. This cannot be
                  undone.
                </p>
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={() => {
                    setShowDeleteModal(true)
                    setDeleteConfirmText("")
                    setDeleteError(null)
                  }}
                >
                  Delete my account…
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {showDeleteModal && (
        <div className="settings-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="settings-modal">
            <h3 id="delete-account-title" className="settings-modal-title">Delete your Clarion account?</h3>
            <p className="settings-modal-body">
              This permanently deletes your profile, bloodwork, protocol logs, supplements, and any
              uploaded lab files. Any active Clarion+ subscription is canceled immediately (no more
              charges). <strong>This cannot be undone.</strong>
            </p>
            <label className="settings-modal-label">
              <span>Type <code>DELETE</code> to confirm:</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="settings-input"
                aria-label="Type DELETE to confirm"
                disabled={deleteBusy}
              />
            </label>
            {deleteError && <p className="settings-modal-error">{deleteError}</p>}
            <div className="settings-modal-actions">
              <button
                type="button"
                className="settings-modal-btn settings-modal-btn--ghost"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText("")
                  setDeleteError(null)
                }}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-modal-btn settings-modal-btn--danger"
                onClick={handleDeleteAccount}
                disabled={deleteBusy || deleteConfirmText !== "DELETE"}
              >
                {deleteBusy ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .settings-shell {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text-primary);
          position: relative;
        }
        .settings-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(31, 111, 91, 0.12), transparent 60%);
          pointer-events: none;
          z-index: 0;
        }
        .settings-container {
          position: relative;
          z-index: 1;
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }
        .settings-header { margin-bottom: 28px; }
        .settings-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }
        .settings-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .settings-back {
          font-size: 13px;
          color: var(--color-text-muted);
          text-decoration: none;
        }
        .settings-back:hover { color: var(--color-text-primary); }
        .settings-signout {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          border: 1px solid var(--clarion-card-border);
          border-radius: 10px;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .settings-signout:hover {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .settings-title {
          margin: 0 0 4px;
          font-size: 28px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .settings-subtitle {
          margin: 0;
          font-size: 14px;
          color: var(--color-text-muted);
        }
        .settings-survey-hint {
          margin: 12px 0 0;
          font-size: 14px;
        }
        .settings-survey-link {
          color: var(--color-accent);
          font-weight: 500;
          text-decoration: none;
        }
        .settings-survey-link:hover {
          text-decoration: underline;
        }
        .settings-section { margin-bottom: 28px; }
        .settings-section-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0 0 12px;
          color: var(--color-text-muted);
        }
        .settings-card {
          padding: 20px 24px;
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: var(--clarion-card-radius, 14px);
          box-shadow: var(--shadow-sm);
        }
        .settings-hint {
          margin: 0 0 14px;
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.45;
        }
        .settings-note {
          margin: -6px 0 14px;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .settings-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .settings-field span { font-weight: 500; }
        .settings-field-hint {
          margin: 0;
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        .settings-symptom-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .settings-symptom-pill {
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 9999px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .settings-symptom-pill:hover {
          background: var(--color-surface-elevated);
        }
        .settings-symptom-pill--selected {
          border-color: var(--color-accent);
          font-weight: 500;
          color: var(--color-text-primary);
          background: rgba(31, 111, 91, 0.1);
        }
        .settings-field-checkbox { flex-direction: row; align-items: center; gap: 10px; }
        .settings-field-checkbox span { font-weight: 400; }
        .settings-checkbox { width: 18px; height: 18px; accent-color: var(--color-accent); }
        .settings-select,
        .settings-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 14px;
          max-width: 320px;
        }
        .settings-textarea { min-height: 60px; max-width: 100%; }
        .settings-units-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .settings-units-label { font-size: 13px; font-weight: 500; color: var(--color-text-muted); }
        .settings-units-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; border: 1px solid var(--clarion-card-border); background: var(--color-bg); color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
        .settings-units-btn:hover { background: var(--color-surface-elevated); color: var(--color-text-secondary); }
        .settings-units-btn .settings-units-active { color: var(--color-text-primary); font-weight: 600; }
        .settings-units-btn--metric { border-color: var(--color-accent); }
        .settings-height-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .settings-input-ft { max-width: 64px; }
        .settings-input-in { max-width: 64px; }
        .settings-unit-suffix { font-size: 13px; color: var(--color-text-muted); }
        .settings-save {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          background: var(--color-accent);
          border: none;
          color: var(--color-accent-contrast);
          cursor: pointer;
          align-self: flex-start;
        }
        .settings-save:hover:not(:disabled) {
          background: var(--color-accent-hover);
        }
        .settings-saved {
          margin-left: 10px;
          font-size: 13px;
          color: var(--color-accent);
        }
        .settings-account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .settings-account-label { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }

        /* Subscription card */
        .settings-sub { display: flex; flex-direction: column; gap: 0; }
        .settings-sub-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .settings-sub-headline {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .settings-sub-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid transparent;
        }
        .settings-sub-badge--active {
          background: color-mix(in srgb, var(--color-accent) 14%, transparent);
          color: var(--color-accent);
          border-color: color-mix(in srgb, var(--color-accent) 28%, transparent);
        }
        .settings-sub-badge--warn {
          background: rgba(200, 140, 40, 0.12);
          color: #a8752a;
          border-color: rgba(200, 140, 40, 0.3);
        }
        .settings-sub-badge--neutral {
          background: var(--color-surface-elevated);
          color: var(--color-text-muted);
          border-color: var(--clarion-card-border);
        }
        .settings-sub-note {
          margin: 0 0 12px;
          padding: 10px 12px;
          background: color-mix(in srgb, var(--color-accent) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
          border-radius: 10px;
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.45;
        }
        .settings-sub-error {
          margin: 0 0 10px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(200, 60, 60, 0.08);
          border: 1px solid rgba(200, 60, 60, 0.25);
          color: #b24646;
          font-size: 13px;
        }
        .settings-sub-btn {
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: var(--color-accent);
          border: 1px solid var(--color-accent);
          color: var(--color-accent-contrast);
          cursor: pointer;
          align-self: flex-start;
        }
        .settings-sub-btn:hover:not(:disabled) { background: var(--color-accent-hover); }
        .settings-sub-btn:disabled { opacity: 0.55; cursor: default; }
        .settings-sub-btn--ghost {
          background: transparent;
          border: 1px solid var(--clarion-card-border);
          color: var(--color-text-secondary);
        }
        .settings-sub-btn--ghost:hover:not(:disabled) {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .settings-sub-btn--danger {
          background: #b24646;
          border-color: #b24646;
          color: #fff;
        }
        .settings-sub-btn--danger:hover:not(:disabled) { background: #963a3a; }
        .settings-sub-confirm {
          margin-top: 2px;
          padding: 12px 14px;
          background: rgba(200, 60, 60, 0.05);
          border: 1px solid rgba(200, 60, 60, 0.2);
          border-radius: 10px;
        }
        .settings-sub-confirm-body {
          margin: 0 0 10px;
          font-size: 13px;
          color: var(--color-text-primary);
          line-height: 1.45;
        }
        .settings-sub-confirm-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Danger zone card */
        .settings-danger-title { color: #b24646 !important; }
        .settings-card--danger {
          border-color: rgba(200, 60, 60, 0.3);
          background: color-mix(in srgb, #b24646 4%, var(--clarion-card-bg));
        }
        .settings-danger-btn {
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          border: 1px solid #b24646;
          color: #b24646;
          cursor: pointer;
        }
        .settings-danger-btn:hover { background: rgba(200, 60, 60, 0.08); }

        /* Delete account modal */
        .settings-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .settings-modal {
          max-width: 440px;
          width: 100%;
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .settings-modal-title {
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .settings-modal-body {
          margin: 0 0 16px;
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .settings-modal-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .settings-modal-label code {
          padding: 1px 6px;
          border-radius: 4px;
          background: var(--color-surface-elevated);
          font-family: var(--font-mono, ui-monospace, "SFMono-Regular", monospace);
          font-size: 12px;
        }
        .settings-modal-error {
          margin: -4px 0 10px;
          font-size: 13px;
          color: #b24646;
        }
        .settings-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .settings-modal-btn {
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .settings-modal-btn--ghost {
          background: transparent;
          border: 1px solid var(--clarion-card-border);
          color: var(--color-text-secondary);
        }
        .settings-modal-btn--ghost:hover:not(:disabled) {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .settings-modal-btn--danger {
          background: #b24646;
          border: 1px solid #b24646;
          color: #fff;
        }
        .settings-modal-btn--danger:hover:not(:disabled) { background: #963a3a; }
        .settings-modal-btn:disabled { opacity: 0.55; cursor: default; }
      `}</style>
    </main>
  )
}
