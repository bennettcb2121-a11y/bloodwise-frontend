"use client"

/**
 * Right-hand (or below-grid on mobile) detail panel for a selected day.
 *
 * Goal: give the user "what happened on this day" at a glance.
 *   - Stack items: show every item from their *current* stack plus any items
 *     that appear in the day's checks map (covers old items they took before
 *     changing their stack). Checked vs unchecked is visually distinct.
 *   - Lab day: call out "Bloodwork was saved on this date" with a link to
 *     the biomarkers page and the save's score if available.
 *   - Retest day: explain the suggestion + offer a one-click to /labs/upload.
 *
 * Pure view. All data comes from the parent page.
 */

import React from "react"
import Link from "next/link"
import { CheckCircle2, Circle, FlaskConical, CalendarClock, ArrowUpRight } from "lucide-react"
import type { LogbookDay } from "@/src/lib/logbook"
import type { SavedSupplementStackItem, BloodworkSaveRow } from "@/src/lib/bloodwiseDb"

type Props = {
  day: LogbookDay | null
  /** Current stack for the user — used to show the *plan*, not just what got checked. */
  currentStack: SavedSupplementStackItem[]
  /** If `day.hasLab`, the matching bloodwork save (most recent wins). Optional. */
  matchingBloodwork?: BloodworkSaveRow | null
}

function formatHumanDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function LogbookDayDetail({ day, currentStack, matchingBloodwork }: Props) {
  if (!day) {
    return (
      <aside className="logbook-detail logbook-detail--empty" aria-live="polite">
        <p className="logbook-detail__empty">Pick a day to see what you logged.</p>
      </aside>
    )
  }

  // Merge current stack keys with whatever appears in the day's check map so
  // we don't hide items the user took before they changed their plan.
  const checkKeysInLog = Object.keys(day.checks ?? {})
  const stackKeys = currentStack.map((s) => s.stackEntryId || s.supplementName)
  const allKeys = Array.from(new Set<string>([...stackKeys, ...checkKeysInLog]))

  const items = allKeys.map((key) => {
    const stackItem = currentStack.find((s) => (s.stackEntryId || s.supplementName) === key)
    const checked = !!day.checks?.[key]
    const displayName = stackItem?.supplementName || key
    const dose = stackItem?.dose || ""
    const inCurrentStack = !!stackItem
    return { key, displayName, dose, checked, inCurrentStack }
  })
  const totalCheckable = items.length || 1
  const completedCount = items.filter((i) => i.checked).length
  const completionPct = Math.round((completedCount / totalCheckable) * 100)

  return (
    <aside className="logbook-detail" aria-live="polite">
      <header className="logbook-detail__header">
        <p className="logbook-detail__eyebrow">
          {day.isToday ? "Today" : day.isFuture ? "Upcoming" : "Logged"}
        </p>
        <h3 className="logbook-detail__title">{formatHumanDate(day.isoDate)}</h3>
      </header>

      {day.hasLab && matchingBloodwork ? (
        <LabSummary save={matchingBloodwork} />
      ) : day.hasLab ? (
        <LabSummaryMinimal />
      ) : null}

      {day.isRetestDay ? <RetestCallout /> : null}

      <section className="logbook-detail__protocol" aria-label="Protocol for this day">
        <div className="logbook-detail__protocol-head">
          <h4 className="logbook-detail__subtitle">Protocol</h4>
          {items.length > 0 ? (
            <span className="logbook-detail__ratio">
              {completedCount} of {items.length} · {completionPct}%
            </span>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="logbook-detail__empty-protocol">
            No stack items yet.{" "}
            <Link href="/dashboard/plan#stack" className="logbook-detail__link">
              Build your stack →
            </Link>
          </p>
        ) : (
          <ul className="logbook-detail__items">
            {items.map((item) => (
              <li
                key={item.key}
                className={
                  item.checked
                    ? "logbook-detail__item logbook-detail__item--done"
                    : "logbook-detail__item"
                }
              >
                <span className="logbook-detail__item-icon" aria-hidden>
                  {item.checked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </span>
                <span className="logbook-detail__item-body">
                  <strong>{item.displayName}</strong>
                  {item.dose ? <small>{item.dose}</small> : null}
                  {!item.inCurrentStack ? (
                    <small className="logbook-detail__item-archived">No longer in stack</small>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {day.isFuture && !day.isRetestDay ? (
        <p className="logbook-detail__future-hint">
          Future days light up once you check items from the Home tab.
        </p>
      ) : null}
    </aside>
  )
}

function LabSummary({ save }: { save: BloodworkSaveRow }) {
  const score = typeof save.score === "number" ? save.score : null
  const markerCount = Object.keys(save.biomarker_inputs ?? {}).length
  return (
    <section className="logbook-detail__lab" aria-label="Bloodwork for this day">
      <span className="logbook-detail__lab-icon" aria-hidden>
        <FlaskConical size={16} />
      </span>
      <div className="logbook-detail__lab-body">
        <strong>Bloodwork tested</strong>
        <small>
          {markerCount} biomarker{markerCount === 1 ? "" : "s"} saved
          {score != null ? ` · score ${score}` : ""}
        </small>
      </div>
      <Link href="/dashboard/biomarkers" className="logbook-detail__lab-link" aria-label="See biomarkers">
        View <ArrowUpRight size={14} aria-hidden />
      </Link>
    </section>
  )
}

function LabSummaryMinimal() {
  return (
    <section className="logbook-detail__lab" aria-label="Bloodwork for this day">
      <span className="logbook-detail__lab-icon" aria-hidden>
        <FlaskConical size={16} />
      </span>
      <div className="logbook-detail__lab-body">
        <strong>Bloodwork tested</strong>
        <small>Saved on this day.</small>
      </div>
      <Link href="/dashboard/biomarkers" className="logbook-detail__lab-link">
        View <ArrowUpRight size={14} aria-hidden />
      </Link>
    </section>
  )
}

function RetestCallout() {
  return (
    <section className="logbook-detail__retest" aria-label="Retest suggestion">
      <span className="logbook-detail__retest-icon" aria-hidden>
        <CalendarClock size={16} />
      </span>
      <div className="logbook-detail__retest-body">
        <strong>Suggested retest</strong>
        <small>Based on your last lab date and retest cadence. Upload your next results when ready.</small>
      </div>
      <Link href="/labs/upload" className="logbook-detail__retest-link">
        Upload <ArrowUpRight size={14} aria-hidden />
      </Link>
    </section>
  )
}
