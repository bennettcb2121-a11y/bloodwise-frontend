"use client"

import React, { useEffect, useState } from "react"
import { Info } from "lucide-react"
import {
  FIRST_RUN_CHECKLIST_DONE_EVENT,
  hasCompletedFirstRunChecklist,
} from "@/src/components/FirstRunChecklist"

/**
 * Thin "What is this?" strip used on Stack (Plan) and Report (Analysis) to orient new users
 * without a blocking modal. Auto-hides once the Home first-run checklist is done/dismissed.
 */
type Props = {
  title: string
  body: string
}

export function DashboardSectionPrimer({ title, body }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(!hasCompletedFirstRunChecklist())
    update()
    const onDone = () => setVisible(false)
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return update()
      if (e.key.startsWith("clarion_home_firstrun_checklist_")) update()
    }
    window.addEventListener(FIRST_RUN_CHECKLIST_DONE_EVENT, onDone)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(FIRST_RUN_CHECKLIST_DONE_EVENT, onDone)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  if (!visible) return null

  return (
    <aside
      className="dashboard-section-primer"
      role="note"
      aria-label={`What is ${title}?`}
    >
      <span className="dashboard-section-primer-icon" aria-hidden>
        <Info size={16} strokeWidth={2} />
      </span>
      <div>
        <p className="dashboard-section-primer-title">What is {title}?</p>
        <p className="dashboard-section-primer-body">{body}</p>
      </div>
      <style jsx>{`
        .dashboard-section-primer {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          margin: 0 0 14px;
          border: 1px solid color-mix(in srgb, var(--color-accent, #1f6f5b) 30%, transparent);
          background: color-mix(in srgb, var(--color-accent, #1f6f5b) 8%, transparent);
          border-radius: 10px;
          color: var(--color-text-primary);
        }
        .dashboard-section-primer-icon {
          flex-shrink: 0;
          color: var(--color-accent, #1f6f5b);
          margin-top: 2px;
        }
        .dashboard-section-primer-title {
          margin: 0 0 2px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .dashboard-section-primer-body {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-text-secondary);
        }
      `}</style>
    </aside>
  )
}
