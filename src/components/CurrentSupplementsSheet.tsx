"use client"

import React, { useCallback, useEffect, useState } from "react"
import { X, Pill } from "lucide-react"
import Link from "next/link"
import { loadSavedState, upsertProfile } from "@/src/lib/bloodwiseDb"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { CurrentSupplementsEditor } from "@/src/components/CurrentSupplementsEditor"
import { dispatchProfileUpdated } from "@/src/lib/profileEvents"

type Props = {
  userId: string | null | undefined
  onClose: () => void
}

/**
 * Same content as Home “Supplements you already take”, in a modal so we don’t navigate away.
 */
export function CurrentSupplementsSheet({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [prefsPhone, setPrefsPhone] = useState("")
  const [prefsRetestWeeks, setPrefsRetestWeeks] = useState(8)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      setProfile(null)
      return
    }
    setLoading(true)
    setLoadError(null)
    loadSavedState(userId)
      .then(({ profile: p }) => {
        if (!p) {
          setLoadError("We couldn’t load your profile. Open Home and try again.")
          setProfile(null)
        } else {
          setProfile(p)
          setPrefsPhone(p.phone ?? "")
          setPrefsRetestWeeks(p.retest_weeks ?? 8)
        }
      })
      .catch(() => {
        setLoadError("Couldn’t load your profile.")
        setProfile(null)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = useCallback(async () => {
    if (!userId || !profile) return
    setSaving(true)
    setSaved(false)
    try {
      await upsertProfile(userId, {
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
        diet_preference: profile.diet_preference ?? undefined,
        symptoms: profile.symptoms ?? undefined,
        health_goals: profile.health_goals ?? undefined,
        streak_milestones: profile.streak_milestones ?? undefined,
        daily_reminder: profile.daily_reminder ?? undefined,
        score_goal: profile.score_goal ?? undefined,
        notify_reorder_email: profile.notify_reorder_email ?? undefined,
        notify_reorder_days: profile.notify_reorder_days ?? undefined,
      })
      const { profile: fresh } = await loadSavedState(userId)
      if (fresh) {
        setProfile(fresh)
        setPrefsPhone(fresh.phone ?? "")
        setPrefsRetestWeeks(fresh.retest_weeks ?? 8)
      }
      setSaved(true)
      dispatchProfileUpdated()
    } finally {
      setSaving(false)
    }
  }, [userId, profile, prefsPhone, prefsRetestWeeks])

  return (
    <div className="dashboard-log-sheet-root" role="presentation">
      <button type="button" className="dashboard-log-fab-backdrop dashboard-log-fab-backdrop--sheet" aria-label="Close" onClick={onClose} />
      <div className="dashboard-supplement-checker current-supplements-sheet" role="dialog" aria-modal="true" aria-labelledby="current-supplements-sheet-title">
        <div className="dashboard-supplement-checker-head">
          <h2 id="current-supplements-sheet-title" className="dashboard-supplement-checker-title">
            <Pill size={22} strokeWidth={2} aria-hidden /> Supplements you already take
          </h2>
          <button type="button" className="dashboard-supplement-checker-close" onClick={onClose} aria-label="Close">
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        {!userId ? (
          <p className="dashboard-supplement-checker-muted">Sign in to save supplements you already use.</p>
        ) : loading ? (
          <p className="dashboard-supplement-checker-muted">Loading…</p>
        ) : loadError ? (
          <p className="dashboard-supplement-checker-error">{loadError}</p>
        ) : profile ? (
          <>
            <p className="current-supplements-sheet-lede">
              Tell us what you use today so we can compare it to your lab-based plan, spot overlaps, and estimate savings. Optional product links help with upgrades.
            </p>
            <div className="dashboard-current-supplements-editor current-supplements-sheet-editor">
              <CurrentSupplementsEditor
                idPrefix="sheet-current-supplements"
                value={profile.current_supplements ?? ""}
                onChange={(serialized) => setProfile((p) => (p ? { ...p, current_supplements: serialized } : null))}
              />
            </div>
            <label className="dashboard-prefs-field dashboard-current-supplements-spend current-supplements-sheet-field">
              <span>Monthly supplement spend (approx.)</span>
              <input
                type="text"
                className="dashboard-prefs-input"
                value={profile.current_supplement_spend ?? ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, current_supplement_spend: e.target.value } : null))}
                placeholder="e.g. 50"
                autoComplete="off"
              />
            </label>
            <div className="dashboard-current-supplements-actions current-supplements-sheet-actions">
              <button type="button" className="dashboard-prefs-save" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              {saved ? <span className="dashboard-prefs-saved">Saved</span> : null}
              <Link href="/settings" className="dashboard-current-supplements-settings-link" onClick={onClose}>
                All settings →
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
