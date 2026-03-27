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
                  <label className="settings-field">
                    <span>Current supplements (if any)</span>
                    <textarea
                      value={profile.current_supplements ?? ""}
                      onChange={(e) => setProfile((p) => p ? { ...p, current_supplements: e.target.value } : null)}
                      placeholder="e.g. Fish oil, Vitamin D…"
                      rows={2}
                      className="settings-input settings-textarea"
                      style={{ resize: "vertical" }}
                    />
                  </label>
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
                    <span>Include daily protocol reminder in reminder emails</span>
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
                      <span>Notify me when supplements are running low (in-app and email when available)</span>
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
          </>
        )}
      </div>

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
      `}</style>
    </main>
  )
}
