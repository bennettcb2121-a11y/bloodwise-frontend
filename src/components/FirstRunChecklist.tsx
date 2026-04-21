"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, X, FlaskConical, Pill, Target, BookOpen } from "lucide-react"
import { computeFirstRunChecklistProgress } from "@/src/lib/firstRunChecklistLogic"

/**
 * First-run orientation checklist: modal overlay + reopen pill. Styles live in `app/globals.css`
 * (`.clarion-firstrun-*`) — avoids styled-jsx scoping bugs on dashboard routes.
 */

const DISMISSED_KEY = "clarion_home_firstrun_checklist_dismissed_v1"
const FIT_VIEWED_KEY = "clarion_home_firstrun_checklist_fit_viewed_v1"
const REPORT_VIEWED_KEY = "clarion_home_firstrun_checklist_report_viewed_v1"
export const FIRST_RUN_CHECKLIST_DONE_KEY = "clarion_home_firstrun_checklist_done_v1"
/** Set to "1" the first time we auto-open the modal so refresh / return visits don’t pop it again. */
export const FIRST_RUN_CHECKLIST_AUTO_OPENED_KEY = "clarion_home_firstrun_checklist_auto_opened_v1"
export const FIRST_RUN_CHECKLIST_DONE_EVENT = "clarion-firstrun-checklist-done"

export function hasCompletedFirstRunChecklist(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(FIRST_RUN_CHECKLIST_DONE_KEY) === "1"
  } catch {
    return false
  }
}

function notifyFirstRunChecklistDone() {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new Event(FIRST_RUN_CHECKLIST_DONE_EVENT))
  } catch {
    /* ignore */
  }
}

type Props = {
  hasBloodwork: boolean
  cabinetCount: number
  anyStackFitComputed: boolean
  onOpenCabinet: () => void
  addLabsHref: string
  seeFitHref: string
  seeReportHref: string
}

export function FirstRunChecklist({
  hasBloodwork,
  cabinetCount,
  anyStackFitComputed,
  onOpenCabinet,
  addLabsHref,
  seeFitHref,
  seeReportHref,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusReturnRef = useRef<HTMLElement | null>(null)

  const [hydrated, setHydrated] = useState(false)
  const [dismissedStored, setDismissedStored] = useState(false)
  const [fitViewedLocal, setFitViewedLocal] = useState(false)
  const [reportViewedLocal, setReportViewedLocal] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    let dismissed = false
    let fitViewed = false
    let reportViewed = false
    try {
      if (localStorage.getItem(DISMISSED_KEY)) dismissed = true
      if (localStorage.getItem(FIT_VIEWED_KEY)) fitViewed = true
      if (localStorage.getItem(REPORT_VIEWED_KEY)) reportViewed = true
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      if (dismissed) setDismissedStored(true)
      if (fitViewed) setFitViewedLocal(true)
      if (reportViewed) setReportViewedLocal(true)
      setHydrated(true)
    })
  }, [])

  const { step1Mode, step1Done, cabinetDone, fitDone, allDone, completedCount } = computeFirstRunChecklistProgress({
    hasBloodwork,
    cabinetCount,
    anyStackFitComputed,
    reportViewedLocal,
    fitViewedLocal,
  })

  const pending = !dismissedStored && !allDone

  useEffect(() => {
    if (!hydrated || !pending) return
    try {
      if (localStorage.getItem(FIRST_RUN_CHECKLIST_AUTO_OPENED_KEY) === "1") return
      localStorage.setItem(FIRST_RUN_CHECKLIST_AUTO_OPENED_KEY, "1")
    } catch {
      /* ignore */
    }
    queueMicrotask(() => setModalOpen(true))
  }, [hydrated, pending])

  useEffect(() => {
    if (!hydrated || !allDone) return
    try {
      if (localStorage.getItem(FIRST_RUN_CHECKLIST_DONE_KEY) !== "1") {
        localStorage.setItem(FIRST_RUN_CHECKLIST_DONE_KEY, "1")
        notifyFirstRunChecklistDone()
      }
    } catch {
      /* ignore */
    }
    queueMicrotask(() => setModalOpen(false))
  }, [hydrated, allDone])

  const softClose = useCallback(() => {
    setModalOpen(false)
  }, [])

  const skipForNow = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
      localStorage.setItem(FIRST_RUN_CHECKLIST_DONE_KEY, "1")
    } catch {
      /* ignore */
    }
    notifyFirstRunChecklistDone()
    setDismissedStored(true)
    setModalOpen(false)
  }, [])

  useEffect(() => {
    if (!modalOpen || !pending) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") softClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [modalOpen, pending, softClose])

  useEffect(() => {
    if (!modalOpen || !pending) return
    focusReturnRef.current = document.activeElement as HTMLElement | null
    const id = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(id)
      const el = focusReturnRef.current
      if (el && typeof el.focus === "function") {
        try {
          el.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [modalOpen, pending])

  const markFitViewed = () => {
    setFitViewedLocal(true)
    try {
      localStorage.setItem(FIT_VIEWED_KEY, "1")
    } catch {
      /* ignore */
    }
  }

  const markReportViewed = () => {
    setReportViewedLocal(true)
    try {
      localStorage.setItem(REPORT_VIEWED_KEY, "1")
    } catch {
      /* ignore */
    }
  }

  const openCabinetFromChecklist = () => {
    setModalOpen(false)
    queueMicrotask(() => onOpenCabinet())
  }

  if (!hydrated || !pending) return null

  return (
    <>
      {modalOpen ? (
        <div className="clarion-firstrun-overlay" role="presentation">
          <button type="button" className="clarion-firstrun-backdrop" aria-label="Close" onClick={softClose} />
          <div
            className="clarion-firstrun-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clarion-firstrun-title"
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="clarion-firstrun-close"
              onClick={softClose}
              aria-label="Close getting started"
            >
              <X size={22} strokeWidth={2} aria-hidden />
            </button>

            <p className="clarion-firstrun-eyebrow">Getting started</p>
            <h2 id="clarion-firstrun-title" className="clarion-firstrun-heading">
              Make Clarion yours
            </h2>
            <p className="clarion-firstrun-lede">Two quick minutes · finish anytime</p>

            <div className="clarion-firstrun-progress-row" aria-hidden>
              <div className="clarion-firstrun-progress-track">
                <span
                  className="clarion-firstrun-progress-fill"
                  style={{ width: `${Math.round((completedCount / 3) * 100)}%` }}
                />
              </div>
              <span className="clarion-firstrun-progress-label">
                {completedCount} of 3
              </span>
            </div>

            <ol className="clarion-firstrun-list">
              {step1Mode === "addLabs" ? (
                <ChecklistRow
                  n={1}
                  done={step1Done}
                  icon={<FlaskConical size={16} strokeWidth={2} aria-hidden />}
                  title="Add your bloodwork"
                  desc="Clarion uses your numbers to tailor your stack and score."
                  actionLabel="Add labs"
                  href={addLabsHref}
                />
              ) : (
                <ChecklistRow
                  n={1}
                  done={step1Done}
                  icon={<BookOpen size={16} strokeWidth={2} aria-hidden />}
                  title="Review your report"
                  desc="See what your labs mean — strengths, what to nudge, and adaptive targets for your profile."
                  actionLabel="Open report"
                  href={seeReportHref}
                  onAfterNavigate={markReportViewed}
                />
              )}
              <ChecklistRow
                n={2}
                done={cabinetDone}
                icon={<Pill size={16} strokeWidth={2} aria-hidden />}
                title="Add what you take"
                desc="Photo, barcode, paste a link, or type — we match it to your labs."
                actionLabel="Add supplements"
                onPress={openCabinetFromChecklist}
              />
              <ChecklistRow
                n={3}
                done={fitDone}
                icon={<Target size={16} strokeWidth={2} aria-hidden />}
                title="See your stack fit"
                desc="Each supplement shows aligned, suboptimal, or unmapped vs your labs."
                actionLabel="View fit"
                href={seeFitHref}
                onAfterNavigate={markFitViewed}
              />
            </ol>

            <div className="clarion-firstrun-footer">
              <button type="button" className="clarion-firstrun-skip" onClick={skipForNow}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!modalOpen ? (
        <button type="button" className="clarion-firstrun-pill" onClick={() => setModalOpen(true)}>
          Getting started ({completedCount} of 3)
        </button>
      ) : null}
    </>
  )
}

function ChecklistRow({
  n,
  done,
  icon,
  title,
  desc,
  actionLabel,
  href,
  onPress,
  onAfterNavigate,
}: {
  n: number
  done: boolean
  icon: React.ReactNode
  title: string
  desc: string
  actionLabel: string
  href?: string
  onPress?: () => void
  onAfterNavigate?: () => void
}) {
  const rowClass = `clarion-firstrun-row${done ? " clarion-firstrun-row--done" : ""}`

  const inner = (
    <>
      <span className={`clarion-firstrun-bullet${done ? " clarion-firstrun-bullet--done" : ""}`} aria-hidden>
        {done ? <Check size={18} strokeWidth={2.5} /> : n}
      </span>
      <span className="clarion-firstrun-body">
        <span className="clarion-firstrun-title-line">
          <span className="clarion-firstrun-row-icon">{icon}</span>
          <span className={`clarion-firstrun-row-title${done ? " clarion-firstrun-row-title--done" : ""}`}>
            {title}
          </span>
        </span>
        {!done ? <span className="clarion-firstrun-row-desc">{desc}</span> : null}
      </span>
      {!done ? (
        <span className="clarion-firstrun-action">
          <span className="clarion-firstrun-action-label">{actionLabel}</span>
          <ChevronRight size={18} strokeWidth={2} aria-hidden className="clarion-firstrun-action-chevron" />
        </span>
      ) : (
        <span className="clarion-firstrun-done-chip">Done</span>
      )}
    </>
  )

  return (
    <li className="clarion-firstrun-item">
      {done ? (
        <div className={rowClass} aria-label={`${title} — done`}>
          {inner}
        </div>
      ) : href ? (
        <Link
          href={href}
          className={rowClass}
          prefetch={false}
          onClick={() => onAfterNavigate?.()}
        >
          {inner}
        </Link>
      ) : (
        <button type="button" className={rowClass} onClick={() => onPress?.()}>
          {inner}
        </button>
      )}
    </li>
  )
}
