import type { SupplementGlyphKind } from "@/src/lib/supplementDisplay"

/** Per-supplement accent — ring + glyph color only; no row “card” fill or icon boxes. */
export type SupplementCardTheme = {
  cardClass: string
  iconTileClass: string
  iconClass: string
  ringColor: string
  ringGlow: string
}

const baseRow = "border-0 bg-transparent shadow-none"

const fallback: SupplementCardTheme = {
  cardClass: baseRow,
  iconTileClass: "border-0 bg-transparent",
  iconClass: "text-zinc-400",
  ringColor: "rgba(161, 161, 170, 0.75)",
  ringGlow: "rgba(161, 161, 170, 0.25)",
}

export function getSupplementCardTheme(kind: SupplementGlyphKind): SupplementCardTheme {
  switch (kind) {
    case "iron":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-amber-200/90",
        ringColor: "rgba(180, 101, 74, 0.9)",
        ringGlow: "rgba(194, 120, 95, 0.28)",
      }
    case "magnesium":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-violet-200/90",
        ringColor: "rgba(196, 181, 253, 0.88)",
        ringGlow: "rgba(196, 181, 253, 0.3)",
      }
    case "vitamin-d":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-orange-300/90",
        ringColor: "rgba(234, 88, 12, 0.82)",
        ringGlow: "rgba(251, 146, 60, 0.32)",
      }
    case "omega":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-teal-300/90",
        ringColor: "rgba(45, 212, 191, 0.82)",
        ringGlow: "rgba(45, 212, 191, 0.26)",
      }
    case "b12":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-violet-300/90",
        ringColor: "rgba(168, 85, 184, 0.85)",
        ringGlow: "rgba(192, 132, 252, 0.26)",
      }
    case "herb":
      return {
        cardClass: baseRow,
        iconTileClass: "border-0 bg-transparent",
        iconClass: "text-emerald-300/90",
        ringColor: "rgba(52, 211, 153, 0.8)",
        ringGlow: "rgba(52, 211, 153, 0.25)",
      }
    default:
      return fallback
  }
}

/** Same tinted “signal meter” shell as Performance signals — use on Today protocol rows. */
export function getProtocolSignalMeterClass(kind: SupplementGlyphKind): string {
  switch (kind) {
    case "iron":
      return "dashboard-signal-meter--protocol-iron"
    case "magnesium":
      return "dashboard-signal-meter--protocol-magnesium"
    case "vitamin-d":
      return "dashboard-signal-meter--protocol-vitamin-d"
    case "omega":
      return "dashboard-signal-meter--protocol-omega"
    case "b12":
      return "dashboard-signal-meter--protocol-b12"
    case "herb":
      return "dashboard-signal-meter--protocol-herb"
    default:
      return "dashboard-signal-meter--protocol-default"
  }
}

/** Track fill class — paired with `getProtocolSignalMeterClass`. */
export function getProtocolMeterFillClass(kind: SupplementGlyphKind): string {
  switch (kind) {
    case "iron":
      return "dashboard-protocol-meter__fill--iron"
    case "magnesium":
      return "dashboard-protocol-meter__fill--magnesium"
    case "vitamin-d":
      return "dashboard-protocol-meter__fill--vitamin-d"
    case "omega":
      return "dashboard-protocol-meter__fill--omega"
    case "b12":
      return "dashboard-protocol-meter__fill--b12"
    case "herb":
      return "dashboard-protocol-meter__fill--herb"
    default:
      return "dashboard-protocol-meter__fill--default"
  }
}
