"use client"

import { useCallback, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import {
  activityFeedbackLine,
  hydrationFeedbackLine,
  sleepFeedbackLine,
  sunFeedbackLine,
} from "@/src/lib/readinessComposite"
import { Activity, Droplets, Moon, Sun } from "lucide-react"

type Props = {
  metrics: DailyMetrics
  onUpdate: (partial: Partial<DailyMetrics>) => void
}

function pct(n: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (n / max) * 100))
}

export function PerformanceSignalInputs({ metrics, onUpdate }: Props) {
  const [hydrationRipple, setHydrationRipple] = useState(0)

  const onHydration = useCallback(
    (v: number) => {
      setHydrationRipple((k) => k + 1)
      onUpdate({ hydration_cups: v })
    },
    [onUpdate]
  )

  const sleepH = metrics.sleep_hours ?? 0
  const hyd = metrics.hydration_cups ?? 0
  const sun = metrics.sun_minutes ?? 0
  const act = metrics.activity_level ?? 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <SleepMeter value={sleepH} onChange={(v) => onUpdate({ sleep_hours: v })} />
      <HydrationMeter
        value={hyd}
        onChange={onHydration}
        rippleKey={hydrationRipple}
      />
      <SunMeter value={sun} onChange={(v) => onUpdate({ sun_minutes: v })} />
      <ActivityMeter value={act} onChange={(v) => onUpdate({ activity_level: v })} />
    </div>
  )
}

function SleepMeter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const p = pct(value, 12)
  const feedback = sleepFeedbackLine(value)
  return (
    <div className="dashboard-signal-meter dashboard-signal-meter--sleep">
      <div
        className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 rounded-full bg-violet-400/8 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span className="dashboard-signal-meter__icon text-[color:var(--color-text-secondary)]">
          <Moon size={20} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">Sleep</span>
            <span className="tabular-nums text-sm font-medium text-[color:var(--color-text-secondary)]">
              {value} h
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[color:var(--color-text-muted)]">{feedback}</p>
        </div>
      </div>
      <div className="dashboard-signal-meter__track">
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
          aria-valuetext={`${value} hours`}
        />
        <motion.div
          className="h-full rounded-full bg-violet-400/82"
          initial={false}
          animate={{
            width: `${p}%`,
            boxShadow: p > 55 ? "0 0 10px rgba(167, 139, 250, 0.28)" : "0 0 4px rgba(167, 139, 250, 0.12)",
          }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
      </div>
    </div>
  )
}

function HydrationMeter({
  value,
  onChange,
  rippleKey,
}: {
  value: number
  onChange: (v: number) => void
  rippleKey: number
}) {
  const p = pct(value, 16)
  const feedback = hydrationFeedbackLine(value)
  return (
    <div className="dashboard-signal-meter dashboard-signal-meter--hydration">
      <div className="relative flex items-start gap-3">
        <span className="dashboard-signal-meter__icon text-[color:var(--color-text-secondary)]">
          <Droplets size={20} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">Hydration</span>
            <span className="tabular-nums text-sm font-medium text-[color:var(--color-text-secondary)]">
              {value} cups
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[color:var(--color-text-muted)]">{feedback}</p>
        </div>
      </div>
      {/* Horizontal track (same as Sleep/Sun). Vertical tank + % height spring was unreliable with Motion. */}
      <div className="dashboard-signal-meter__track">
        <input
          type="range"
          min={0}
          max={16}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
          aria-valuetext={`${value} cups`}
        />
        <motion.div
          className="h-full rounded-full bg-sky-400/78"
          initial={false}
          animate={{
            width: `${p}%`,
            boxShadow:
              p > 55 ? "0 0 10px rgba(56, 189, 248, 0.28)" : "0 0 4px rgba(56, 189, 248, 0.14)",
          }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
        <AnimatePresence>
          {rippleKey > 0 ? (
            <motion.span
              key={rippleKey}
              className="pointer-events-none absolute inset-0 z-10 rounded-full bg-sky-400/22"
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SunMeter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const p = pct(value, 120)
  const feedback = sunFeedbackLine(value)
  const glow = 0.1 + (p / 100) * 0.22
  return (
    <div className="dashboard-signal-meter dashboard-signal-meter--sun">
      <motion.div
        className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full bg-orange-300/14 blur-2xl"
        animate={{ opacity: glow, scale: 0.96 + (p / 100) * 0.06 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span className="relative dashboard-signal-meter__icon text-[color:var(--color-text-secondary)]">
          <Sun size={20} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">Sun exposure</span>
            <span className="tabular-nums text-sm font-medium text-[color:var(--color-text-secondary)]">
              {value} min
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[color:var(--color-text-muted)]">{feedback}</p>
        </div>
      </div>
      <div className="dashboard-signal-meter__track">
        <input
          type="range"
          min={0}
          max={120}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
          aria-valuetext={`${value} minutes`}
        />
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-400/88 to-orange-600/88"
          initial={false}
          animate={{
            width: `${p}%`,
            boxShadow: `0 0 ${6 + p * 0.06}px rgba(234, 88, 12, ${0.16 + p / 420})`,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
      </div>
    </div>
  )
}

function ActivityMeter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const level = value >= 1 && value <= 5 ? value : 0
  const feedback = activityFeedbackLine(level || undefined)
  const high = level >= 4
  return (
    <div className="dashboard-signal-meter dashboard-signal-meter--activity">
      <div className="relative flex items-start gap-3">
        <span className="dashboard-signal-meter__icon text-[color:var(--color-text-secondary)]">
          <Activity size={20} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">Activity</span>
            <span className="text-sm font-medium text-[color:var(--color-text-secondary)]">
              {level > 0 ? `Level ${level}` : "—"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[color:var(--color-text-muted)]">{feedback}</p>
        </div>
      </div>
      <div
        className="mt-4 flex h-14 items-end justify-between gap-2 px-1"
        role="group"
        aria-label="Activity level 1 to 5"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const on = level === n
          return (
            <motion.button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(n)}
              className={`dashboard-signal-step relative flex-1 rounded-lg border transition-colors ${
                on ? "dashboard-signal-step--on" : ""
              }`}
              style={{ height: `${28 + n * 10}px` }}
              animate={
                on && high
                  ? { scale: 1.04, boxShadow: "0 0 8px rgba(163, 230, 53, 0.22)" }
                  : { scale: 1, boxShadow: "none" }
              }
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{n}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
