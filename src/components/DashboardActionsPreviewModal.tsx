"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getOrderedScoreDrivers } from "@/src/lib/scoreBreakdown"
import { getProgressHeadlineForMarker, getLifestyleTaglineForMarker } from "@/src/lib/priorityJourneyCopy"

const PREVIEW_SEEN_KEY = "clarion_dash_actions_preview_seen_v1"

const PREVIEW_COUNT = 3

/**
 * First visit to Home: modal preview of Actions priorities (no iframe — avoids dev connection / nested-doc issues).
 */
export function DashboardActionsPreviewModal() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)

  /**
   * Loads data for gating decision; modal opens only if we have actual priorities to preview.
   * This prevents blocking brand-new users (no bloodwork) with an empty "action plan" modal.
   */
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (pathname !== "/dashboard") return
    if (typeof window === "undefined" || window.self !== window.top) return
    if (!user?.id) return
    try {
      if (localStorage.getItem(PREVIEW_SEEN_KEY)) return
    } catch {
      // ignore
    }
    queueMicrotask(() => setLoading(true))
    loadSavedState(user.id)
      .then(({ profile: p, bloodwork: b }) => {
        setProfile(p ?? null)
        setBloodwork(b ?? null)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
      })
      .finally(() => {
        setLoading(false)
        setDataLoaded(true)
      })
  }, [pathname, user?.id])

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

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile ?? {}), [profile])

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10, priorityContext),
    [analysisResults, priorityContext]
  )

  const previewTop = useMemo(() => orderedDrivers.slice(0, PREVIEW_COUNT), [orderedDrivers])

  const hasBiomarkerInputs =
    bloodwork?.biomarker_inputs &&
    typeof bloodwork.biomarker_inputs === "object" &&
    Object.keys(bloodwork.biomarker_inputs).length > 0

  /**
   * Only open this modal when we actually have drivers to show. Silently mark as seen
   * for users without bloodwork or whose markers are all steady, so we don't interrupt
   * the first-run orientation experience with empty copy.
   */
  useEffect(() => {
    if (!dataLoaded || loading) return
    if (open) return
    const shouldShow = Boolean(hasBiomarkerInputs) && previewTop.length > 0
    if (shouldShow) {
      queueMicrotask(() => setOpen(true))
    } else {
      try {
        localStorage.setItem(PREVIEW_SEEN_KEY, "1")
      } catch {
        // ignore
      }
    }
  }, [dataLoaded, loading, open, hasBiomarkerInputs, previewTop.length])

  const close = () => {
    try {
      localStorage.setItem(PREVIEW_SEEN_KEY, "1")
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="dashboard-actions-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="actions-preview-title"
    >
      <div className="dashboard-actions-preview-panel">
        <header className="dashboard-actions-preview-header">
          <div>
            <h2 id="actions-preview-title" className="dashboard-actions-preview-title">
              Your action plan
            </h2>
            <p className="dashboard-actions-preview-sub">
              Here&apos;s what to improve first — full detail lives on Actions.
            </p>
          </div>
          <button type="button" className="dashboard-actions-preview-close" onClick={close} aria-label="Close preview">
            ×
          </button>
        </header>
        <div className="dashboard-actions-preview-body">
          {loading ? (
            <div className="dashboard-actions-preview-loading" aria-busy="true">
              <div className="dashboard-tab-loading-dots">
                <span className="clarion-loading-dot" aria-hidden />
                <span className="clarion-loading-dot" aria-hidden />
                <span className="clarion-loading-dot" aria-hidden />
              </div>
              <p className="dashboard-actions-preview-loading-text">Loading priorities…</p>
            </div>
          ) : (
            <ol className="dashboard-actions-preview-list">
              {previewTop.map((driver, idx) => {
                const title = getProgressHeadlineForMarker(driver.markerName, driver.label, driver.status)
                const tag = getLifestyleTaglineForMarker(driver.markerName, driver.status)
                return (
                  <li key={`${driver.markerName}-${idx}`} className="dashboard-actions-preview-item">
                    <span className="dashboard-actions-preview-rank">{idx + 1}</span>
                    <div className="dashboard-actions-preview-item-body">
                      <p className="dashboard-actions-preview-item-title">{title}</p>
                      <p className="dashboard-actions-preview-item-tag">{tag}</p>
                      <span className="dashboard-actions-preview-item-status">{driver.status ?? "—"}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <footer className="dashboard-actions-preview-footer">
          <Link href="/dashboard/actions" className="dashboard-actions-preview-cta" onClick={close}>
            Open full Actions
          </Link>
        </footer>
      </div>
    </div>
  )
}
