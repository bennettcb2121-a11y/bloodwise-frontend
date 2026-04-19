"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { supplementProtocolDisplay } from "@/src/lib/supplementDisplay"
import type { SupplementGlyphKind } from "@/src/lib/supplementDisplay"
import {
  getSupplementDetail,
  getIronVitaminCSupplementalPairing,
  getProtocolInteractionBlocks,
  isIronStackRow,
  parseTimingBadge,
  type TimingBadgeKind,
} from "@/src/lib/supplementProtocolDetail"
import { stackItemStorageKey } from "@/src/lib/stackAcquisition"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { computeStackProductFit } from "@/src/lib/stackProductFit"
import { getStackItemBadgeKind } from "@/src/lib/stackLabSafety"
import { ProtocolLabFitPopover } from "@/src/components/ProtocolLabFitPopover"
import { Circle, Sun, Droplets, Fish, Pill, Leaf, ChevronDown } from "lucide-react"
import {
  getProtocolMeterFillClass,
  getProtocolSignalMeterClass,
} from "@/src/components/dailyTracking/supplementCardTheme"

const PLAN_LINK = "/dashboard/plan#stack"

function ProtocolGlyphIcon({
  kind,
  iconClassName,
  size = 22,
}: {
  kind: SupplementGlyphKind
  iconClassName?: string
  size?: number
}) {
  const c = iconClassName ?? "dashboard-protocol-glyph-svg"
  const stroke = 1.5
  switch (kind) {
    case "iron":
      return <Circle className={c} size={size} strokeWidth={stroke} aria-hidden />
    case "vitamin-d":
      return <Sun className={c} size={size} strokeWidth={stroke} aria-hidden />
    case "magnesium":
      return <Droplets className={c} size={size} strokeWidth={stroke} aria-hidden />
    case "omega":
      return <Fish className={c} size={size} strokeWidth={stroke} aria-hidden />
    case "b12":
      return <Pill className={c} size={size} strokeWidth={stroke} aria-hidden />
    case "herb":
      return <Leaf className={c} size={size} strokeWidth={stroke} aria-hidden />
    default:
      return <Pill className={c} size={size} strokeWidth={stroke} aria-hidden />
  }
}

function badgeClass(kind: TimingBadgeKind): string {
  if (kind === "morning") return "dashboard-timing-badge dashboard-timing-badge--morning"
  if (kind === "evening") return "dashboard-timing-badge dashboard-timing-badge--evening"
  return "dashboard-timing-badge dashboard-timing-badge--anytime"
}

export type SupplementTimingRowProps = {
  row: SavedSupplementStackItem
  done: boolean
  onToggle: () => void
  /** When false and row is iron, show supplemental Vitamin C pairing (stack has no vit C yet). */
  stackHasVitaminC?: boolean
  /** Richer card + motion (Today tab grouped protocol). */
  gamified?: boolean
  /** Shown when this row just logged (matches `row.supplementName`). */
  celebrateItem?: string | null
  /** Points for one logged step (from protocol score budget). */
  pointsPerLog?: number | null
  /** Subtle horizontal stagger for layout rhythm. */
  staggerIndex?: number
  /** Optional row below the card (e.g. supply status on Home). */
  acquisitionSlot?: React.ReactNode
  /** e.g. ··· menu (Update / Delete) on Today protocol rows. */
  actionsSlot?: React.ReactNode
  /** When iron + vitamin C are both on stack, C rows nest under iron (Today tab). */
  nestedVitaminCRows?: SavedSupplementStackItem[]
  renderNestedProtocolRow?: (row: SavedSupplementStackItem) => React.ReactNode
  /** Latest analyzed labs — drives per-row educational “lab fit” copy. */
  analysisResults?: BiomarkerResult[]
}

export function SupplementTimingRow({
  row,
  done,
  onToggle,
  stackHasVitaminC = false,
  gamified = false,
  celebrateItem = null,
  pointsPerLog = null,
  staggerIndex = 0,
  acquisitionSlot,
  actionsSlot,
  nestedVitaminCRows,
  renderNestedProtocolRow,
  analysisResults,
}: SupplementTimingRowProps) {
  const display = supplementProtocolDisplay(row)
  const detail = getSupplementDetail(row.marker, row.supplementName)
  const badge = parseTimingBadge(detail?.timing)
  const interactionBlocks = useMemo(
    () => getProtocolInteractionBlocks(row.marker, row.supplementName),
    [row.marker, row.supplementName]
  )
  const vitPair = getIronVitaminCSupplementalPairing()
  const showVitCSupplemental = isIronStackRow(row.marker, row.supplementName) && !stackHasVitaminC
  const protocolMeterClass = getProtocolSignalMeterClass(display.glyphKind)
  const protocolFillClass = getProtocolMeterFillClass(display.glyphKind)
  const gamifiedMeta = [display.line2, detail?.timing].filter((s): s is string => Boolean(s && String(s).trim()))
  const gamifiedMetaLine = gamifiedMeta.join(" · ")
  const labFit = useMemo(() => {
    if (!analysisResults?.length) return null
    return computeStackProductFit(row.supplementName, row.marker, analysisResults)
  }, [analysisResults, row.supplementName, row.marker])
  const stackBadgeKind = useMemo(() => {
    if (!analysisResults?.length) return null
    return getStackItemBadgeKind(row, analysisResults)
  }, [row, analysisResults])

  const rowBody = gamified ? (
    <motion.div
      initial={false}
      animate={{
        scale: done ? 1.002 : 1,
        opacity: done ? 1 : 0.96,
      }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: "spring", stiffness: 480, damping: 32 }}
      style={{ x: staggerIndex % 2 === 1 ? 1 : 0 }}
      className={`dashboard-signal-meter dashboard-protocol-meter ${protocolMeterClass} overflow-hidden`}
    >
      <div className="relative flex items-start gap-3">
        <button
          type="button"
          className="dashboard-signal-meter__icon protocol-meter__icon-btn"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `Mark ${display.title} not done` : `Mark ${display.title} done`}
        >
          <ProtocolGlyphIcon kind={display.glyphKind} size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <AnimatePresence>
                {celebrateItem === row.supplementName && pointsPerLog != null ? (
                  <motion.span
                    key="score-burst"
                    className="dashboard-protocol-gamified-burst"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  >
                    +{pointsPerLog}
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <span className="dashboard-protocol-gamified-title">
                {display.title}
                {stackBadgeKind === "maintenance" ? (
                  <span className="dashboard-stack-lab-optional" title="Maintenance context — labs in range; optional for your training profile">
                    !
                  </span>
                ) : stackBadgeKind === "optional_lab" ? (
                  <span className="dashboard-stack-lab-optional" title="Labs look good — optional review">
                    !
                  </span>
                ) : stackBadgeKind === "user_product_review" ? (
                  <span
                    className="dashboard-stack-lab-optional"
                    title="Clarion’s lab fit check suggested reviewing this product — you chose to keep logging what you use; discuss with your clinician."
                  >
                    !
                  </span>
                ) : null}
              </span>
              <span className={`${badgeClass(badge.kind)} ${gamified ? "dashboard-timing-badge--inline" : "origin-left scale-90"}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`dashboard-protocol-gamified-status${done ? " dashboard-protocol-gamified-status--done" : ""}`}
                aria-hidden
              >
                {done ? "Done" : "To do"}
              </span>
              <Link
                href={PLAN_LINK}
                className="dashboard-protocol-dosing-link dashboard-protocol-dosing-link--sleek"
                onClick={(e) => e.stopPropagation()}
              >
                Dosing
              </Link>
              {actionsSlot}
            </div>
          </div>
          {gamifiedMetaLine ? (
            <p className="dashboard-protocol-gamified-meta">{gamifiedMetaLine}</p>
          ) : null}
          {labFit && gamified ? (
            <div className="dashboard-protocol-lab-fit-row" role="note">
              <ProtocolLabFitPopover
                variant="gamified"
                chipLabel={labFit.chipLabel}
                chipTone={labFit.chipTone}
                rationale={labFit.rationale}
                contextLabel={display.title}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="dashboard-signal-meter__track" aria-hidden>
        <motion.div
          className={`dashboard-protocol-meter__fill ${protocolFillClass}`}
          initial={false}
          animate={{ width: done ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        />
      </div>
    </motion.div>
  ) : (
    <div className={`dashboard-supplement-timing-row ${done ? "dashboard-supplement-timing-row--done" : ""}`}>
      <button
        type="button"
        className={`dashboard-protocol-check ${done ? "dashboard-protocol-check--on" : ""}`}
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${display.title} not done` : `Mark ${display.title} done`}
      >
        <span className="dashboard-protocol-check-mark" aria-hidden />
      </button>
      <div className="dashboard-supplement-timing-row-main">
        <span className="dashboard-protocol-glyph" aria-hidden>
          <ProtocolGlyphIcon kind={display.glyphKind} />
        </span>
        <div className="dashboard-supplement-timing-text">
          <div className="dashboard-supplement-timing-title-row">
            <span className="dashboard-protocol-title">
              {display.title}
              {stackBadgeKind === "maintenance" ? (
                <span className="dashboard-stack-lab-optional" title="Maintenance context — labs in range; optional for your training profile">
                  !
                </span>
              ) : stackBadgeKind === "optional_lab" ? (
                <span className="dashboard-stack-lab-optional" title="Labs look good — optional review">
                  !
                </span>
              ) : stackBadgeKind === "user_product_review" ? (
                <span
                  className="dashboard-stack-lab-optional"
                  title="Clarion’s lab fit check suggested reviewing this product — you chose to keep logging what you use; discuss with your clinician."
                >
                  !
                </span>
              ) : null}
            </span>
            <span className={badgeClass(badge.kind)}>{badge.label}</span>
          </div>
          {display.line2 ? <span className="dashboard-protocol-sub">{display.line2}</span> : null}
          {detail?.timing ? <span className="dashboard-supplement-timing-hint">{detail.timing}</span> : null}
          {labFit && !gamified ? (
            <div className="dashboard-protocol-lab-fit-row dashboard-protocol-lab-fit-row--plain" role="note">
              <ProtocolLabFitPopover
                chipLabel={labFit.chipLabel}
                chipTone={labFit.chipTone}
                rationale={labFit.rationale}
                contextLabel={display.title}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="dashboard-supplement-timing-actions">
        <Link href={PLAN_LINK} className="dashboard-protocol-dosing-link" onClick={(e) => e.stopPropagation()}>
          Dosing
        </Link>
        {actionsSlot}
      </div>
    </div>
  )

  return (
    <li className="dashboard-supplement-timing-row-wrap">
      {rowBody}
      <details
        className={`dashboard-supplement-interactions${gamified ? " dashboard-supplement-interactions--gamified" : ""}`}
      >
        <summary className="dashboard-supplement-interactions__summary">Interactions & spacing</summary>
        <ul className="dashboard-supplement-interactions__list" role="list">
          {interactionBlocks.map((b) => (
            <li key={b.label} className="dashboard-supplement-interactions__item">
              <span className="dashboard-supplement-interactions__label">{b.label}</span>
              <span className="dashboard-supplement-interactions__text">{b.text}</span>
            </li>
          ))}
        </ul>
      </details>

      {showVitCSupplemental ? (
        <details className={`dashboard-supplement-pairing-nested${gamified ? " dashboard-supplement-pairing-nested--gamified" : ""}`}>
          <summary className="dashboard-supplement-pairing-nested__summary">
            <ChevronDown className="dashboard-supplement-pairing-nested__chev" size={16} strokeWidth={2} aria-hidden />
            <span className="dashboard-supplement-pairing-nested__kicker">Supplemental</span>
            <span className="dashboard-supplement-pairing-nested__name">{vitPair.label}</span>
            <span className="dashboard-supplement-pairing-nested__dose-inline">250–500 mg · same meal as iron</span>
          </summary>
          <div className="dashboard-supplement-pairing-nested__body">
            <p className="dashboard-supplement-pairing-nested__dose">{vitPair.doseLine}</p>
            <p className="dashboard-supplement-pairing-nested__note">{vitPair.footnote}</p>
            <Link href={PLAN_LINK} className="dashboard-supplement-pairing-nested__plan-link">
              Add on Plan
            </Link>
          </div>
        </details>
      ) : null}
      {nestedVitaminCRows && nestedVitaminCRows.length > 0 && renderNestedProtocolRow ? (
        <details
          className={`dashboard-supplement-pairing-nested dashboard-supplement-pairing-nested--iron-pair${
            gamified ? " dashboard-supplement-pairing-nested--gamified" : ""
          }`}
        >
          <summary className="dashboard-supplement-pairing-nested__summary">
            <ChevronDown className="dashboard-supplement-pairing-nested__chev" size={16} strokeWidth={2} aria-hidden />
            <span className="dashboard-supplement-pairing-nested__kicker">Iron absorption</span>
            <span className="dashboard-supplement-pairing-nested__name">Vitamin C</span>
            <span className="dashboard-supplement-pairing-nested__dose-inline">
              {nestedVitaminCRows.length === 1
                ? "Same meal as iron · supports non-heme absorption"
                : `${nestedVitaminCRows.length} items · same meal as iron`}
            </span>
          </summary>
          <div className="dashboard-supplement-pairing-nested__iron-pair-stack">
            {nestedVitaminCRows.map((vitRow) => (
              <div key={stackItemStorageKey(vitRow)} className="dashboard-supplement-pairing-nested__iron-pair-item">
                {renderNestedProtocolRow(vitRow)}
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {acquisitionSlot}
    </li>
  )
}

export function groupRowsByTimingKind(
  rows: SavedSupplementStackItem[]
): { morning: SavedSupplementStackItem[]; evening: SavedSupplementStackItem[]; anytime: SavedSupplementStackItem[] } {
  const morning: SavedSupplementStackItem[] = []
  const evening: SavedSupplementStackItem[] = []
  const anytime: SavedSupplementStackItem[] = []
  for (const row of rows) {
    const detail = getSupplementDetail(row.marker, row.supplementName)
    const { kind } = parseTimingBadge(detail?.timing)
    if (kind === "morning") morning.push(row)
    else if (kind === "evening") evening.push(row)
    else anytime.push(row)
  }
  return { morning, evening, anytime }
}
