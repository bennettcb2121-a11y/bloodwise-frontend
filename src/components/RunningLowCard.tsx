"use client"

import React from "react"
import { AlertTriangle, ExternalLink, PackageOpen } from "lucide-react"
import type { RunningLowItem } from "@/src/lib/bottleRunout"
import { ComplianceFooter } from "@/src/components/ComplianceFooter"

type Tone = "critical" | "warning" | "soft"

function daysLeftTone(days: number): Tone {
  if (days <= 3) return "critical"
  if (days <= 7) return "warning"
  return "soft"
}

function formatDaysLeft(days: number): string {
  if (days <= 0) return "Out today"
  if (days === 1) return "1 day left"
  return `${days} days left`
}

export function RunningLowCard({
  items,
  onSnooze,
}: {
  items: RunningLowItem[]
  onSnooze?: (item: RunningLowItem) => void
}) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <section
      className="dashboard-section dashboard-running-low"
      aria-labelledby="dashboard-running-low-heading"
      aria-live="polite"
    >
      <header className="dashboard-running-low__header">
        <h2 id="dashboard-running-low-heading" className="dashboard-section-title">
          <PackageOpen
            className="dashboard-section-title-icon"
            size={18}
            strokeWidth={2}
            aria-hidden
          />{" "}
          Running low
        </h2>
        <span className="dashboard-running-low__badge" aria-label={`${items.length} items running low`}>
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </header>

      <ul className="dashboard-running-low__list">
        {items.map((item) => {
          const tone = daysLeftTone(item.daysLeft)
          const rowClass = `dashboard-running-low__row dashboard-running-low__row--${tone}`
          const savings =
            typeof item.estimatedMonthlySavings === "number" && item.estimatedMonthlySavings > 0
              ? item.estimatedMonthlySavings
              : null

          return (
            <li key={item.supplementName} className={rowClass}>
              <div className="dashboard-running-low__copy">
                <p className="dashboard-running-low__name">{item.supplementName}</p>
                <p className={`dashboard-running-low__meta dashboard-running-low__meta--${tone}`}>
                  {tone === "critical" ? (
                    <AlertTriangle size={14} strokeWidth={2.25} aria-hidden />
                  ) : null}
                  <span>{formatDaysLeft(item.daysLeft)} · Reorder now</span>
                </p>
                {savings != null ? (
                  <p className="dashboard-running-low__savings">
                    Saved: ${savings.toFixed(0)}/mo
                  </p>
                ) : null}
              </div>

              <div className="dashboard-running-low__actions">
                <a
                  className="dashboard-running-low__cta"
                  href={item.reorderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Reorder ${item.supplementName}`}
                >
                  Reorder
                  <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
                </a>
                {onSnooze ? (
                  <button
                    type="button"
                    className="dashboard-running-low__snooze"
                    onClick={() => onSnooze(item)}
                    aria-label={`Snooze ${item.supplementName} reminder for 3 days`}
                  >
                    Snooze 3 days
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <ComplianceFooter variant="inline" />
    </section>
  )
}
