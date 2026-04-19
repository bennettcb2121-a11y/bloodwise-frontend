"use client"

import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"
import type { WeekStripDay } from "@/src/lib/protocolWeekStrip"

type Props = {
  dailyScore: number
  completed: number
  total: number
  streakDays: number
  weekStrip: WeekStripDay[]
  pointsTotal: number | null
  /** Short-lived delta from last adjustment (protocol or signals). */
  deltaFlash?: number | null
  /** When true, note that daily score blends protocol + habits. */
  blendsSignals?: boolean
}

/**
 * Compact daily score strip: protocol + habits blend, week dots, streak.
 * Borderless — structure from type + spacing, not gray panels.
 */
export function ProtocolDailySummary({
  dailyScore,
  completed,
  total,
  streakDays,
  weekStrip,
  pointsTotal,
  deltaFlash = null,
  blendsSignals = false,
}: Props) {
  const spring = useSpring(0, { stiffness: 120, damping: 22, mass: 0.8 })
  const widthPct = useTransform(spring, (v) => `${Math.round(v)}%`)

  useEffect(() => {
    spring.set(dailyScore)
  }, [dailyScore, spring])

  return (
    <div className="protocol-daily-summary">
      <div className="protocol-daily-summary__row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="protocol-daily-summary__title" aria-live="polite">
              <span className="protocol-daily-summary__title-label">Daily score</span>{" "}
              <span className="inline-flex items-baseline gap-1.5">
                <motion.span
                  key={dailyScore}
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="protocol-daily-summary__score-num tabular-nums"
                >
                  {dailyScore}
                </motion.span>
                <AnimatePresence mode="popLayout">
                  {deltaFlash != null && deltaFlash !== 0 ? (
                    <motion.span
                      key={deltaFlash}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        deltaFlash > 0 ? "bg-emerald-900/40 text-emerald-200/95" : "bg-rose-900/35 text-rose-200/95"
                      }`}
                    >
                      {deltaFlash > 0 ? "+" : ""}
                      {deltaFlash}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </span>
            <span className="protocol-daily-summary__today-meta">
              {completed}/{total} today
            </span>
          </div>
          {blendsSignals ? (
            <p className="protocol-daily-summary__blend-hint">
              Includes protocol and the signals below.
            </p>
          ) : null}

          <div
            className="protocol-daily-summary__track"
            role="progressbar"
            aria-valuenow={dailyScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Daily score ${dailyScore} percent`}
          >
            <motion.div className="protocol-daily-summary__track-fill" style={{ width: widthPct }} />
          </div>
        </div>

        {streakDays > 0 ? (
          <div className="protocol-daily-summary__streak">
            <span className="protocol-daily-summary__streak-label" aria-hidden>
              Streak
            </span>
            <span className="protocol-daily-summary__streak-num tabular-nums">{streakDays}d</span>
          </div>
        ) : null}
      </div>

      <div className="protocol-daily-summary__week">
        <p className="protocol-daily-summary__week-label">This week</p>
        <div className="protocol-daily-summary__week-grid" role="list" aria-label="Days completed this week">
          {weekStrip.map((d) => (
            <div key={d.dateStr} className="protocol-daily-summary__week-item" role="listitem">
              <span
                className={`protocol-daily-summary__week-day ${d.isToday ? "protocol-daily-summary__week-day--today" : ""}`}
              >
                {d.label}
              </span>
              <div
                className={`protocol-daily-summary__week-cell ${
                  d.completed ? "protocol-daily-summary__week-cell--done" : ""
                } ${d.isToday ? "protocol-daily-summary__week-cell--today" : ""}`}
                title={`${d.dateStr}${d.completed ? " — logged" : ""}`}
              />
            </div>
          ))}
        </div>
      </div>

      {pointsTotal != null ? (
        <p className="protocol-daily-summary__points-note">
          Up to +{pointsTotal} score when all steps logged
        </p>
      ) : null}
    </div>
  )
}
