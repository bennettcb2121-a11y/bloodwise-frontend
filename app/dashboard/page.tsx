"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, upsertProfile, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { scoreToLabel } from "@/src/lib/scoreEngine"
import { SubscribeButton } from "@/src/components/SubscribeButton"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefsPhone, setPrefsPhone] = useState("")
  const [prefsRetestWeeks, setPrefsRetestWeeks] = useState(8)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  const hasPaidAnalysis = Boolean(profile?.analysis_purchased_at)
  const hasActiveSubscription = subscription?.status === "active"

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
          }).then(() => {
            setProfile({ user_id: user.id, age: "", sex: "", sport: "", goal: "", current_supplement_spend: "", current_supplements: "", shopping_preference: "Best value", retest_weeks: 8, improvement_preference: "" } as ProfileRow)
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
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  // After returning from Stripe checkout, refetch profile and subscription
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    const search = window.location.search
    if (!search.includes("paid=1") && !search.includes("subscription=success")) return
    const t = setTimeout(() => {
      loadSavedState(user.id).then(({ profile: p }) => { if (p) setProfile(p) }).catch(() => {})
      getSubscription(user.id).then(setSubscription).catch(() => {})
      router.replace("/dashboard")
    }, 1500)
    return () => clearTimeout(t)
  }, [user?.id, router])

  // Redirect to paywall if user has not purchased analysis yet (skip when returning from checkout with ?paid=1)
  useEffect(() => {
    if (authLoading || !user || loading) return
    if (typeof window !== "undefined" && window.location.search.includes("paid=1")) return
    if (profile !== null && !profile.analysis_purchased_at) {
      router.replace("/paywall")
    }
  }, [authLoading, user, loading, profile, router])

  const profileForAnalysis = profile
    ? { age: profile.age, sex: profile.sex, sport: profile.sport }
    : {}
  const analysisResults =
    bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
      ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
      : []
  const retestRecommendations = getRetestRecommendations(analysisResults)

  const retestWeeks = profile?.retest_weeks ?? 8
  const lastBloodworkAt = bloodwork?.updated_at ?? bloodwork?.created_at ?? null
  const isDueForRetest = lastBloodworkAt && (() => {
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    return Date.now() - last >= weeksMs
  })()

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

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-shell">
        <div className="dashboard-container">
          <div className="dashboard-loading">Loading dashboard…</div>
        </div>
        <style jsx>{`
          .dashboard-shell {
            min-height: 100vh;
            background: linear-gradient(180deg, #060914 0%, #070b16 50%, #060812 100%);
            color: #f8fafc;
          }
          .dashboard-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 48px 20px;
          }
          .dashboard-loading {
            color: rgba(226, 232, 240, 0.7);
            font-size: 15px;
          }
        `}</style>
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
            background: linear-gradient(165deg, #1a0a2e 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f0a1a 100%) !important;
            color: #fafafa !important;
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
            color: #fafafa;
          }
          .dashboard-unauth-text {
            margin: 0 0 24px;
            color: rgba(255,255,255,0.65);
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
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(26,26,31,0.9);
            color: #fafafa;
            font-weight: 600;
            text-decoration: none;
            font-size: 16px;
            transition: background 0.2s, border-color 0.2s;
          }
          .dashboard-unauth-link:hover {
            background: rgba(255,255,255,0.08);
            border-color: rgba(255,255,255,0.18);
          }
          .dashboard-unauth-link-primary {
            background: linear-gradient(135deg, #f97316 0%, #E5484D 100%);
            border: none;
            color: #fff;
            box-shadow: 0 4px 20px rgba(229,72,77,0.4);
          }
          .dashboard-unauth-link-primary:hover {
            box-shadow: 0 6px 24px rgba(229,72,77,0.45);
          }
        `}</style>
      </main>
    )
  }

  // Paid for analysis but no active subscription → gate dashboard (charts, history, full dashboard)
  if (hasPaidAnalysis && !hasActiveSubscription) {
    return (
      <main className="dashboard-shell" style={{ background: "linear-gradient(165deg, #1a0a2e 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f0a1a 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <Link href="/" style={{ color: "#fafafa", fontSize: 20, fontWeight: 700, textDecoration: "none", display: "inline-block", marginBottom: 32 }}>← Clarion</Link>
          <h1 style={{ color: "#fef2f2", fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>Unlock your dashboard</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, lineHeight: 1.5, margin: "0 0 8px" }}>
            You’ve unlocked your analysis. Subscribe to Clarion+ to access your dashboard, trends, charts, history, and retest reminders.
          </p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 28px" }}>$29.79 every 2 months · Cancel anytime</p>
          <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe to Clarion+</SubscribeButton>
          <p style={{ marginTop: 24 }}>
            <Link href="/" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textDecoration: "none" }}>View my analysis on the main app →</Link>
          </p>
        </div>
      </main>
    )
  }

  const hasBloodwork = bloodwork && (bloodwork.selected_panel?.length > 0 || bloodwork.score != null)
  const reportDate = bloodwork?.created_at
    ? new Date(bloodwork.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <main className="dashboard-shell">
      <div className="dashboard-bg" />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-header-row">
            <Link href="/" className="dashboard-back">
              ← Back to Clarion Labs
            </Link>
            <SubscribeButton className="dashboard-subscribe-btn">Subscribe</SubscribeButton>
          </div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Your latest health snapshot</p>
        </header>

        {hasBloodwork && isDueForRetest && (
          <div className="dashboard-retest-banner">
            <span>It’s been {retestWeeks}+ weeks since your last panel. Time to retest?</span>
            <Link href="/">Add new results</Link>
          </div>
        )}

        {!hasBloodwork ? (
          <div className="dashboard-empty-wrap">
            <div className="dashboard-card dashboard-empty">
              <p>No bloodwork saved yet. Complete a panel on the main flow to see your dashboard.</p>
              <Link href="/" className="dashboard-cta">
                Go to Clarion Labs
              </Link>
            </div>
            <div className="dashboard-card dashboard-subscribe-card">
              <div className="dashboard-card-label">Subscribe to Clarion Labs</div>
              <p className="dashboard-card-muted">Full access, retest reminders, and optimized recommendations. Cancel anytime.</p>
              <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe — monthly</SubscribeButton>
            </div>
            {user && (
              <div className="dashboard-card dashboard-prefs-card">
                <div className="dashboard-card-label">Notification preferences</div>
                <p className="dashboard-prefs-hint">Set when to get retest reminders and add a phone number for optional SMS.</p>
                <div className="dashboard-prefs-form">
                  <label className="dashboard-prefs-field">
                    <span>Remind me to retest every (weeks)</span>
                    <select
                      value={prefsRetestWeeks}
                      onChange={(e) => setPrefsRetestWeeks(Number(e.target.value))}
                      className="dashboard-prefs-select"
                    >
                      {[6, 8, 10, 12].map((w) => (
                        <option key={w} value={w}>{w} weeks</option>
                      ))}
                    </select>
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Phone (optional, for SMS reminders)</span>
                    <input
                      type="tel"
                      value={prefsPhone}
                      onChange={(e) => setPrefsPhone(e.target.value)}
                      placeholder="+1 555 000 0000"
                      className="dashboard-prefs-input"
                    />
                  </label>
                  <button
                    type="button"
                    className="dashboard-prefs-save"
                    disabled={prefsSaving}
                    onClick={async () => {
                      if (!user) return
                      setPrefsSaving(true)
                      setPrefsSaved(false)
                      try {
                        await upsertProfile(user.id, {
                          age: profile?.age ?? "",
                          sex: profile?.sex ?? "",
                          sport: profile?.sport ?? "",
                          goal: profile?.goal ?? "",
                          current_supplement_spend: profile?.current_supplement_spend ?? "",
                          current_supplements: profile?.current_supplements ?? "",
                          shopping_preference: profile?.shopping_preference ?? "Best value",
                          improvement_preference: profile?.improvement_preference ?? "",
                          profile_type: profile?.profile_type ?? "",
                          email: profile?.email ?? undefined,
                          phone: prefsPhone.trim() || undefined,
                          retest_weeks: prefsRetestWeeks,
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
                    }}
                  >
                    {prefsSaving ? "Saving…" : "Save preferences"}
                  </button>
                  {prefsSaved && <span className="dashboard-prefs-saved">Saved.</span>}
                </div>
              </div>
            )}
            {user && profile && (
              <div className="dashboard-card dashboard-prefs-card">
                <div className="dashboard-card-label">Health & supplement preferences</div>
                <p className="dashboard-prefs-hint">How you prefer to improve your biomarkers and what you currently take.</p>
                <div className="dashboard-prefs-form">
                  <label className="dashboard-prefs-field">
                    <span>How do you prefer to improve?</span>
                    <select
                      value={profile.improvement_preference ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, improvement_preference: e.target.value } : null)}
                      className="dashboard-prefs-select"
                    >
                      <option value="">Select…</option>
                      <option value="Supplements">Supplements</option>
                      <option value="Diet">Diet</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Combination">Combination (recommended)</option>
                    </select>
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Current supplements (if any)</span>
                    <textarea
                      value={profile.current_supplements ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplements: e.target.value } : null)}
                      placeholder="e.g. Fish oil, Vitamin D…"
                      rows={2}
                      className="dashboard-prefs-input"
                      style={{ resize: "vertical" }}
                    />
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Monthly supplement spend (approx.)</span>
                    <input
                      type="text"
                      value={profile.current_supplement_spend ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplement_spend: e.target.value } : null)}
                      placeholder="e.g. $50"
                      className="dashboard-prefs-input"
                    />
                  </label>
                  <p className="dashboard-prefs-hint" style={{ marginTop: 8, fontSize: 13 }}>Use &quot;Save preferences&quot; in Notification preferences to save these.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="dashboard-card dashboard-score-card">
              <div className="dashboard-card-label">Latest health score</div>
              <div className="dashboard-score-value">{bloodwork?.score ?? "—"}</div>
              <div className="dashboard-score-label">
                {bloodwork?.score != null ? scoreToLabel(bloodwork.score) : "No score"}
              </div>
              {reportDate ? (
                <div className="dashboard-card-meta">From report: {reportDate}</div>
              ) : null}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-label">Most recent panel</div>
              {bloodwork?.selected_panel && bloodwork.selected_panel.length > 0 ? (
                <ul className="dashboard-panel-list">
                  {bloodwork.selected_panel.map((marker) => (
                    <li key={marker}>{marker}</li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-card-muted">No panel saved</p>
              )}
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-label">Key flagged biomarkers</div>
              {bloodwork?.key_flagged_biomarkers && bloodwork.key_flagged_biomarkers.length > 0 ? (
                <ul className="dashboard-flagged-list">
                  {bloodwork.key_flagged_biomarkers.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-card-muted">None flagged</p>
              )}
            </div>

            <div className="dashboard-card dashboard-savings-card">
              <div className="dashboard-card-label">Estimated monthly savings</div>
              <div className="dashboard-savings-value">
                ${Math.max(0, monthlySavings).toFixed(2)}/mo
              </div>
              {annualSavings > 0 && (
                <div className="dashboard-savings-annual">
                  ~${annualSavings.toFixed(2)}/yr vs. current spend
                </div>
              )}
            </div>

            <div className="dashboard-card dashboard-retest-card">
              <div className="dashboard-card-label">Next recommended retest</div>
              {retestRecommendations.length > 0 ? (
                <ul className="dashboard-retest-list">
                  {retestRecommendations.slice(0, 6).map((rec, idx) => (
                    <li key={`${rec.marker}-${idx}`}>
                      <span className="dashboard-retest-marker">{rec.marker}</span>
                      <span className="dashboard-retest-timing">{rec.timing}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dashboard-card-muted">Complete a panel to see retest dates</p>
              )}
            </div>

            <div className="dashboard-card dashboard-subscribe-card">
              <div className="dashboard-card-label">Subscribe to Clarion Labs</div>
              <p className="dashboard-card-muted">Full access, retest reminders, and optimized recommendations. Cancel anytime.</p>
              <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe — monthly</SubscribeButton>
            </div>

            <div className="dashboard-card dashboard-retest-status-card">
              <div className="dashboard-card-label">Retest reminders</div>
              {bloodwork?.updated_at ? (
                <>
                  <p className="dashboard-retest-status-text">
                    {isDueForRetest
                      ? `It's been ${retestWeeks}+ weeks since your last panel. We'll email you when it's time.`
                      : `Last panel saved. We'll remind you in ${retestWeeks} weeks (email + in-app).`}
                  </p>
                  <Link href="/#step-1" className="dashboard-retest-status-link">Add new results</Link>
                </>
              ) : (
                <p className="dashboard-card-muted">We'll remind you to retest based on your preference below.</p>
              )}
            </div>

            {user && profile && (
              <div className="dashboard-card dashboard-prefs-card">
                <div className="dashboard-card-label">Health & supplement preferences</div>
                <p className="dashboard-prefs-hint">How you prefer to improve your biomarkers and what you currently take.</p>
                <div className="dashboard-prefs-form">
                  <label className="dashboard-prefs-field">
                    <span>How do you prefer to improve?</span>
                    <select
                      value={profile.improvement_preference ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, improvement_preference: e.target.value } : null)}
                      className="dashboard-prefs-select"
                    >
                      <option value="">Select…</option>
                      <option value="Supplements">Supplements</option>
                      <option value="Diet">Diet</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Combination">Combination (recommended)</option>
                    </select>
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Current supplements (if any)</span>
                    <textarea
                      value={profile.current_supplements ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplements: e.target.value } : null)}
                      placeholder="e.g. Fish oil, Vitamin D…"
                      rows={2}
                      className="dashboard-prefs-input"
                      style={{ resize: "vertical" }}
                    />
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Monthly supplement spend (approx.)</span>
                    <input
                      type="text"
                      value={profile.current_supplement_spend ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplement_spend: e.target.value } : null)}
                      placeholder="e.g. $50"
                      className="dashboard-prefs-input"
                    />
                  </label>
                  <p className="dashboard-prefs-hint" style={{ marginTop: 8, fontSize: 13 }}>Use &quot;Save preferences&quot; below to save these.</p>
                </div>
              </div>
            )}

            {user && profile && (
              <div className="dashboard-card dashboard-prefs-card">
                <div className="dashboard-card-label">Notification preferences</div>
                <p className="dashboard-prefs-hint">When to get retest reminders; add a phone number for optional SMS.</p>
                <div className="dashboard-prefs-form">
                  <label className="dashboard-prefs-field">
                    <span>Remind me to retest every (weeks)</span>
                    <select
                      value={prefsRetestWeeks}
                      onChange={(e) => setPrefsRetestWeeks(Number(e.target.value))}
                      className="dashboard-prefs-select"
                    >
                      {[6, 8, 10, 12].map((w) => (
                        <option key={w} value={w}>{w} weeks</option>
                      ))}
                    </select>
                  </label>
                  <label className="dashboard-prefs-field">
                    <span>Phone (optional, for SMS reminders)</span>
                    <input
                      type="tel"
                      value={prefsPhone}
                      onChange={(e) => setPrefsPhone(e.target.value)}
                      placeholder="+1 555 000 0000"
                      className="dashboard-prefs-input"
                    />
                  </label>
                  <button
                    type="button"
                    className="dashboard-prefs-save"
                    disabled={prefsSaving}
                    onClick={async () => {
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
                    }}
                  >
                    {prefsSaving ? "Saving…" : "Save preferences"}
                  </button>
                  {prefsSaved && <span className="dashboard-prefs-saved">Saved.</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 20%, rgba(124, 140, 255, 0.12), transparent 28%),
            radial-gradient(circle at 85% 15%, rgba(69, 214, 255, 0.1), transparent 24%),
            linear-gradient(180deg, #060914 0%, #070b16 50%, #060812 100%);
          color: #f8fafc;
          position: relative;
        }
        .dashboard-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 38px 38px;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8));
          pointer-events: none;
          z-index: 0;
        }
        .dashboard-container {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }
        .dashboard-header {
          margin-bottom: 28px;
        }
        .dashboard-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }
        .dashboard-subscribe-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.35), rgba(69, 214, 255, 0.15));
          border: 1px solid rgba(124, 140, 255, 0.45);
          color: #e8ecff;
          cursor: pointer;
        }
        .dashboard-subscribe-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.5), rgba(69, 214, 255, 0.25));
        }
        .dashboard-back {
          display: inline-block;
          margin-bottom: 0;
          font-size: 13px;
          color: rgba(226, 232, 240, 0.7);
          text-decoration: none;
        }
        .dashboard-back:hover {
          color: rgba(226, 232, 240, 0.95);
        }
        .dashboard-title {
          margin: 0 0 4px;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .dashboard-subtitle {
          margin: 0;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.65);
        }
        .dashboard-retest-banner {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: rgba(124, 140, 255, 0.12);
          border: 1px solid rgba(124, 140, 255, 0.25);
          border-radius: 12px;
          font-size: 14px;
          color: rgba(232, 236, 255, 0.95);
        }
        .dashboard-retest-banner a {
          font-weight: 600;
          color: #a5b4fc;
          text-decoration: none;
        }
        .dashboard-retest-banner a:hover {
          color: #c7d2fe;
        }
        .dashboard-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .dashboard-card {
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(16, 22, 42, 0.72);
          backdrop-filter: blur(18px);
        }
        .dashboard-card-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(226, 232, 240, 0.55);
          margin-bottom: 10px;
        }
        .dashboard-card-muted {
          margin: 0;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.5);
        }
        .dashboard-card-meta {
          margin-top: 10px;
          font-size: 12px;
          color: rgba(226, 232, 240, 0.5);
        }
        .dashboard-score-card .dashboard-score-value {
          font-size: 36px;
          font-weight: 600;
          color: #f8fafc;
        }
        .dashboard-score-label {
          font-size: 14px;
          color: rgba(226, 232, 240, 0.75);
        }
        .dashboard-panel-list,
        .dashboard-flagged-list {
          margin: 0;
          padding-left: 18px;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.85);
          line-height: 1.6;
        }
        .dashboard-savings-value {
          font-size: 24px;
          font-weight: 600;
          color: #2bd4a0;
        }
        .dashboard-savings-annual {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(226, 232, 240, 0.6);
        }
        .dashboard-retest-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .dashboard-retest-list li {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 6px 0;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .dashboard-retest-list li:last-child {
          border-bottom: none;
        }
        .dashboard-retest-marker {
          color: rgba(226, 232, 240, 0.9);
        }
        .dashboard-retest-timing {
          color: rgba(226, 232, 240, 0.6);
          font-weight: 500;
        }
        .dashboard-empty-wrap {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dashboard-empty {
          text-align: center;
          padding: 40px 24px;
        }
        .dashboard-empty p {
          margin: 0 0 20px;
          color: rgba(226, 232, 240, 0.7);
        }
        .dashboard-cta {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.3), rgba(69, 214, 255, 0.12));
          border: 1px solid rgba(124, 140, 255, 0.4);
          color: #e8ecff;
          font-weight: 600;
          text-decoration: none;
        }
        .dashboard-cta:hover {
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.4), rgba(69, 214, 255, 0.2));
        }
        .dashboard-subscribe-card {
          border-color: rgba(124, 140, 255, 0.25);
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.12), rgba(16, 22, 42, 0.85));
        }
        .dashboard-subscribe-card .dashboard-card-muted {
          margin-bottom: 14px;
        }
        .dashboard-cta-subscribe {
          margin-top: 4px;
        }
        .dashboard-retest-status-card .dashboard-retest-status-text {
          margin: 0 0 10px;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.5;
        }
        .dashboard-retest-status-link {
          font-size: 13px;
          font-weight: 600;
          color: #a5b4fc;
          text-decoration: none;
        }
        .dashboard-retest-status-link:hover {
          color: #c7d2fe;
        }
        .dashboard-prefs-card .dashboard-prefs-hint {
          margin: 0 0 14px;
          font-size: 13px;
          color: rgba(226, 232, 240, 0.6);
          line-height: 1.45;
        }
        .dashboard-prefs-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .dashboard-prefs-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: rgba(226, 232, 240, 0.85);
        }
        .dashboard-prefs-field span {
          font-weight: 500;
        }
        .dashboard-prefs-select,
        .dashboard-prefs-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(10, 14, 28, 0.6);
          color: #f8fafc;
          font-size: 14px;
          max-width: 280px;
        }
        .dashboard-prefs-save {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.35), rgba(69, 214, 255, 0.15));
          border: 1px solid rgba(124, 140, 255, 0.45);
          color: #e8ecff;
          cursor: pointer;
          align-self: flex-start;
        }
        .dashboard-prefs-save:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(124, 140, 255, 0.5), rgba(69, 214, 255, 0.25));
        }
        .dashboard-prefs-saved {
          margin-left: 10px;
          font-size: 13px;
          color: #2bd4a0;
        }
      `}</style>
    </main>
  )
}
