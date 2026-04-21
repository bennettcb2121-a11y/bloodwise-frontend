"use client"

/**
 * Month grid calendar for the Logbook.
 *
 * Renders a full 42-cell grid (6 rows × 7 cols, Sunday-start). Each day shows:
 *   - Its day-of-month number
 *   - A tiny dot-row encoding how many items were checked (0 → no dots;
 *     1–3 → filled dots up to 3)
 *   - A lab badge (past) or a retest badge (future) in the top-right
 *   - "Today" gets a ring outline
 *   - Days outside the current month are muted (leading / trailing spacers)
 *
 * The grid is clickable — the parent page owns the selection state and decides
 * what to render in the detail panel. Keyboard support: arrow keys move focus
 * between days, Enter/Space selects, just like a standard date-picker.
 */

import React, { useCallback, useMemo, useRef } from "react"
import { ChevronLeft, ChevronRight, FlaskConical, CalendarClock } from "lucide-react"
import type { LogbookMonth, LogbookDay } from "@/src/lib/logbook"

type Props = {
  month: LogbookMonth
  selectedIso: string | null
  onSelectDay: (iso: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  /** Disable moving forward past this month (e.g. don't let users nav 10 years ahead). */
  maxForwardMonths?: number
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const

export function LogbookCalendar({
  month,
  selectedIso,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const gridRef = useRef<HTMLDivElement | null>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, iso: string) => {
      const nodes = gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-iso]")
      if (!nodes) return
      const list = Array.from(nodes)
      const idx = list.findIndex((n) => n.dataset.iso === iso)
      if (idx < 0) return

      const move = (next: number) => {
        e.preventDefault()
        const target = list[Math.max(0, Math.min(list.length - 1, next))]
        target?.focus()
      }
      switch (e.key) {
        case "ArrowLeft":
          return move(idx - 1)
        case "ArrowRight":
          return move(idx + 1)
        case "ArrowUp":
          return move(idx - 7)
        case "ArrowDown":
          return move(idx + 7)
        case "Enter":
        case " ":
          e.preventDefault()
          return onSelectDay(iso)
      }
    },
    [onSelectDay]
  )

  // Hide weeks where every day is a leading/trailing spacer — never happens with
  // 42 cells but cheap guard so we don't render empty rows if this evolves.
  const weeks = useMemo(() => month.weeks.filter((w) => w.days.some((d) => d.inMonth)), [month.weeks])

  return (
    <section className="logbook-cal" aria-label={`Protocol logbook — ${month.label}`}>
      <header className="logbook-cal__header">
        <button
          type="button"
          className="logbook-cal__nav"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <h2 className="logbook-cal__label">{month.label}</h2>
        <button
          type="button"
          className="logbook-cal__nav"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </header>

      <div className="logbook-cal__weekdays" aria-hidden>
        {WEEKDAY_LABELS.map((l, i) => (
          <span key={`${l}-${i}`} className="logbook-cal__weekday">
            {l}
          </span>
        ))}
      </div>

      <div ref={gridRef} className="logbook-cal__grid" role="grid">
        {weeks.map((w, wi) => (
          <div key={wi} role="row" className="logbook-cal__row">
            {w.days.map((d) => (
              <DayCell
                key={d.isoDate}
                day={d}
                selected={d.isoDate === selectedIso}
                onSelect={onSelectDay}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        ))}
      </div>

      <footer className="logbook-cal__legend" aria-label="Calendar legend">
        <span className="logbook-cal__legend-item">
          <span className="logbook-cal__legend-dots">
            <span className="logbook-cal__dot logbook-cal__dot--filled" />
            <span className="logbook-cal__dot logbook-cal__dot--filled" />
            <span className="logbook-cal__dot logbook-cal__dot--filled" />
          </span>
          Protocol complete
        </span>
        <span className="logbook-cal__legend-item">
          <span className="logbook-cal__legend-badge logbook-cal__legend-badge--lab">
            <FlaskConical size={12} strokeWidth={2.2} aria-hidden />
          </span>
          Lab tested
        </span>
        <span className="logbook-cal__legend-item">
          <span className="logbook-cal__legend-badge logbook-cal__legend-badge--retest">
            <CalendarClock size={12} strokeWidth={2.2} aria-hidden />
          </span>
          Retest due
        </span>
      </footer>
    </section>
  )
}

/** Individual day cell. Extracted so it can keep its own memoization boundary. */
function DayCell({
  day,
  selected,
  onSelect,
  onKeyDown,
}: {
  day: LogbookDay
  selected: boolean
  onSelect: (iso: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, iso: string) => void
}) {
  // Dot row: cap at 3 dots to stay readable. More than 3 checks in a day is
  // common for stacks; we still show 3 to signal "full". We only render dots
  // at all when the day has at least one check AND belongs to the current
  // month — placeholder dots on empty days read as "things I missed" and
  // make the grid feel noisy.
  const showDots = day.inMonth && day.checksCompleted > 0
  const filledDots = Math.min(3, day.checksCompleted)
  const dots = showDots
    ? [0, 1, 2].map((i) =>
        i < filledDots ? "logbook-cal__dot logbook-cal__dot--filled" : "logbook-cal__dot"
      )
    : []

  const classes = [
    "logbook-cal__cell",
    day.inMonth ? "" : "logbook-cal__cell--out",
    day.isToday ? "logbook-cal__cell--today" : "",
    selected ? "logbook-cal__cell--selected" : "",
    day.hasLab ? "logbook-cal__cell--lab" : "",
    day.isRetestDay ? "logbook-cal__cell--retest-day" : "",
    day.isRetestWindow && !day.isRetestDay ? "logbook-cal__cell--retest-window" : "",
    day.checksCompleted > 0 ? "logbook-cal__cell--logged" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const labelParts = [
    new Date(day.isoDate + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    day.checksCompleted > 0 ? `${day.checksCompleted} items checked` : "No items logged",
    day.hasLab ? "Bloodwork tested" : "",
    day.isRetestDay ? "Suggested retest day" : "",
  ].filter(Boolean)

  return (
    <button
      type="button"
      role="gridcell"
      data-iso={day.isoDate}
      aria-selected={selected}
      aria-label={labelParts.join(" · ")}
      className={classes}
      onClick={() => onSelect(day.isoDate)}
      onKeyDown={(e) => onKeyDown(e, day.isoDate)}
      tabIndex={selected || (day.isToday && !selected) ? 0 : -1}
    >
      <span className="logbook-cal__cell-num">{day.dayOfMonth}</span>
      {dots.length > 0 ? (
        <span className="logbook-cal__cell-dots" aria-hidden>
          {dots.map((cls, i) => (
            <span key={i} className={cls} />
          ))}
        </span>
      ) : null}
      {day.hasLab ? (
        <span className="logbook-cal__badge logbook-cal__badge--lab" aria-hidden>
          <FlaskConical size={13} strokeWidth={2.2} />
        </span>
      ) : null}
      {day.isRetestDay ? (
        <span className="logbook-cal__badge logbook-cal__badge--retest" aria-hidden>
          <CalendarClock size={13} strokeWidth={2.2} />
        </span>
      ) : null}
    </button>
  )
}
