"use client"

import React, { useEffect, useState } from "react"
import { loadSavedState, upsertProfile } from "@/src/lib/bloodwiseDb"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import { CurrentSupplementsCaptureModal } from "@/src/components/CurrentSupplementsCaptureModal"
import { dispatchProfileUpdated } from "@/src/lib/profileEvents"

type Props = {
  userId: string | null | undefined
  onClose: () => void
  initialOpenGuidedWizard?: boolean
}

/**
 * One unified "What I take today" entry point used from Plan, the Log FAB, and
 * anywhere we want to let the user add/update what's actually in their cabinet.
 *
 * Loads the profile lazily, renders the rich capture modal (editor + photo + barcode
 * + guided wizard), and persists every change so users never have to hit "Save".
 */
export function WhatITakeSheet({ userId, onClose, initialOpenGuidedWizard = false }: Props) {
  /**
   * We store the profile keyed by the userId that produced it so a quick userId swap
   * doesn't show the previous user's data. Loading is derived (not a separate state)
   * to avoid the React 19 lint rule against synchronous setState inside effect bodies.
   */
  const [resolved, setResolved] = useState<
    | { kind: "ready"; userId: string; profile: ProfileRow }
    | { kind: "error"; userId: string; message: string }
    | null
  >(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadSavedState(userId)
      .then(({ profile: p }) => {
        if (cancelled) return
        if (!p) {
          setResolved({ kind: "error", userId, message: "We couldn’t load your profile. Open Home and try again." })
        } else {
          setResolved({ kind: "ready", userId, profile: p })
        }
      })
      .catch(() => {
        if (!cancelled) setResolved({ kind: "error", userId, message: "Couldn’t load your profile." })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const loading = !!userId && (resolved == null || resolved.userId !== userId)
  const loadError = resolved?.kind === "error" && resolved.userId === userId ? resolved.message : null
  const profile = resolved?.kind === "ready" && resolved.userId === userId ? resolved.profile : null

  if (!userId) {
    return (
      <div className="dashboard-log-sheet-root" role="presentation">
        <button type="button" className="dashboard-log-fab-backdrop dashboard-log-fab-backdrop--sheet" aria-label="Close" onClick={onClose} />
        <div className="current-supplements-capture-dialog" role="dialog" aria-modal="true">
          <p className="dashboard-supplement-checker-muted">Sign in to save what you take.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard-log-sheet-root" role="presentation">
        <button type="button" className="dashboard-log-fab-backdrop dashboard-log-fab-backdrop--sheet" aria-label="Close" onClick={onClose} />
        <div className="current-supplements-capture-dialog" role="dialog" aria-modal="true">
          <p className="dashboard-supplement-checker-muted">Loading…</p>
        </div>
      </div>
    )
  }

  if (loadError || !profile) {
    return (
      <div className="dashboard-log-sheet-root" role="presentation">
        <button type="button" className="dashboard-log-fab-backdrop dashboard-log-fab-backdrop--sheet" aria-label="Close" onClick={onClose} />
        <div className="current-supplements-capture-dialog" role="dialog" aria-modal="true">
          <p className="dashboard-supplement-checker-error">{loadError ?? "Couldn’t load your profile."}</p>
        </div>
      </div>
    )
  }

  return (
    <CurrentSupplementsCaptureModal
      open
      onClose={onClose}
      initialOpenGuidedWizard={initialOpenGuidedWizard}
      currentSupplements={profile.current_supplements ?? ""}
      onChangeSupplements={async (serialized) => {
        setResolved((prev) => {
          if (!prev || prev.kind !== "ready" || prev.userId !== userId) return prev
          return {
            ...prev,
            profile: { ...prev.profile, current_supplements: serialized },
          }
        })
        try {
          await upsertProfile(userId, {
            age: profile.age ?? "",
            sex: profile.sex ?? "",
            sport: profile.sport ?? "",
            goal: profile.goal ?? "",
            current_supplement_spend: profile.current_supplement_spend ?? "",
            current_supplements: serialized,
            shopping_preference: profile.shopping_preference ?? "Best value",
            improvement_preference: profile.improvement_preference ?? "",
            profile_type: profile.profile_type ?? "",
            email: profile.email ?? undefined,
            phone: profile.phone ?? undefined,
            retest_weeks: profile.retest_weeks ?? 8,
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
            plan_tier: profile.plan_tier ?? undefined,
            training_focus: profile.training_focus ?? undefined,
            activity_level: profile.activity_level ?? undefined,
            sleep_hours_band: profile.sleep_hours_band ?? undefined,
            exercise_regularly: profile.exercise_regularly ?? undefined,
            alcohol_frequency: profile.alcohol_frequency ?? undefined,
          })
          dispatchProfileUpdated()
        } catch {
          // swallow — the modal-level editor keeps optimistic state; we'll retry on next edit
        }
      }}
    />
  )
}
