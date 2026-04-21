"use client"

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import {
  loadSavedState,
  upsertProfile,
  getSubscription,
  getBloodworkHistory,
  getProtocolLog,
  getProtocolLogHistory,
  updateLatestBloodworkStackSnapshot,
  getSupplementInventory,
} from "@/src/lib/bloodwiseDb"
import type {
  BloodworkSaveRow,
  ProfileRow,
  SavedSupplementStackItem,
  SubscriptionRow,
  SupplementInventoryRow,
} from "@/src/lib/bloodwiseDb"
import { computeRunningLow } from "@/src/lib/bottleRunout"
import { loadReorderSnoozeMap, snoozeReorder } from "@/src/lib/reorderSnooze"
import { RunningLowCard } from "@/src/components/RunningLowCard"
import { ComplianceFooter } from "@/src/components/ComplianceFooter"
import type { DailyMetrics } from "@/src/lib/dailyMetrics"
import { analyzeBiomarkers, type BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { getRetestRecommendations } from "@/src/lib/retestEngine"
import { scoreToLabel, countByStatus } from "@/src/lib/scoreEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"
import {
  getScoreBreakdown,
  getScoreDrivers,
  getImprovementForecast,
  getOrderedScoreDrivers,
  getOrderedFocusResults,
  getCategoryForMarker,
  SCORE_CATEGORIES,
} from "@/src/lib/scoreBreakdown"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { getDashboardStatus, getDoThisFirst } from "@/src/lib/dashboardStatus"
import { getContextualInsight } from "@/src/lib/dashboardContextLine"
import { getAdherence } from "@/src/lib/adherence"
import { getEarnedBadges } from "@/src/lib/badges"
import { getLatestLearningItem, getLearningItemForPriority } from "@/src/lib/learningFeed"
import { getLongTermInsightForPriorities } from "@/src/lib/longTermInsights"
import { CLARION_PROFILE_UPDATED_EVENT, dispatchProfileUpdated } from "@/src/lib/profileEvents"
import { writeBootstrapCache } from "@/src/lib/dashboardBootstrapCache"
import { buildHomeStatusLine } from "@/src/lib/homeStatusLine"
import { pickDailyNote, dayOfYear } from "@/src/lib/dailyHomeNote"
import { getBiomarkerProfileNarrative } from "@/src/lib/biomarkerProfileNarrative"
import { getRangeComparison } from "@/src/lib/analyzeBiomarkers"
import { getPrioritySummary, getStatusTone, inferWhyItMatters } from "@/src/lib/priorityEngine"
import { detectPatterns } from "@/src/lib/patternEngine"
import { getGuidesForPriorities, getGuidesForBiomarker } from "@/src/lib/guides"
import {
  getFeaturedMicrocopy,
  getTodaysTip,
  getTodayFocusActionsWithIcons,
  splitFeaturedTodayActions,
} from "@/src/lib/dashboardTips"
import { parseSupplementRow, shortStackDoseLabel } from "@/src/lib/supplementDisplay"
import { CHALLENGES, getChallengeProgress, getChallengeExtra } from "@/src/lib/challenges"
import {
  hasClarionAnalysisAccess,
  hasLabPersonalizationAccess,
  subscriptionStatusGrantsAccess,
} from "@/src/lib/accessGate"
import { buildLiteSupplementSuggestions, LITE_DISCLAIMER } from "@/src/lib/symptomLiteSupplements"
import { getStackItemReorderContext } from "@/src/lib/stackItemReorder"
import { filterStackItemsByLabSafety, getStackItemBadgeKind } from "@/src/lib/stackLabSafety"
import { supplementRecommendations, type SupplementRecommendation } from "@/src/lib/supplements"
import { optimizeStack } from "@/src/lib/stackOptimizer"
import { computeSavings } from "@/src/lib/savingsEngine"
import {
  loadStackAcquisition,
  saveStackAcquisition,
  setStackItemAcquisition,
  migrateStackAcquisitionMap,
  mergeInferredAcquisitionDefaults,
  stackItemStorageKey,
  type StackAcquisitionMap,
  type AcquisitionMode,
} from "@/src/lib/stackAcquisition"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import { getPriorityMarkerSeries } from "@/src/lib/dashboardTrendData"
import { parseCurrentSupplementsEntries } from "@/src/lib/supplementMetadata"
import {
  dedupeStackByStorageKey,
  filterOrphanLifestyleRowsFromLabSnapshot,
  mergeLabStackWithProfileStack,
  sortedSupplementNamesKey,
  stackItemsFromProfileCurrentSupplements,
} from "@/src/lib/profileStackMerge"
import { deleteMergedStackItem, updateMergedStackItem } from "@/src/lib/stackMutations"
import { loadDoseAckMap, setDoseAcknowledged } from "@/src/lib/dosePromptStorage"
import {
  BookOpen,
  Trophy,
  Settings as SettingsIcon,
  ListChecks,
  Target,
  Lightbulb,
  ArrowUpCircle,
  Package,
  BarChart2,
  LineChart,
  ChevronDown,
  Sparkles,
  DollarSign,
} from "lucide-react"
import { TypewriterHeading } from "@/src/components/TypewriterHeading"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { AddToHomeScreenPopup } from "@/src/components/AddToHomeScreenPopup"
import { FirstRunChecklist } from "@/src/components/FirstRunChecklist"
import { CLARION_OPEN_ASSISTANT_EVENT } from "@/src/components/ClarionAssistant"
import { ProtocolTracker } from "@/src/components/ProtocolTracker"
import { CurrentSupplementsCaptureModal } from "@/src/components/CurrentSupplementsCaptureModal"
import { StackItemActionsMenu } from "@/src/components/StackItemActionsMenu"
import { StackItemEditModal } from "@/src/components/StackItemEditModal"
import { StackDosePromptModal } from "@/src/components/StackDosePromptModal"
import { DailyHealthCheckIn } from "@/src/components/DailyHealthCheckIn"
const BetweenPanelsInsightLazy = dynamic(
  () => import("@/src/components/BetweenPanelsInsight").then((m) => ({ default: m.BetweenPanelsInsight })),
  { ssr: false, loading: () => null }
)
import { PanelScoreEditorial } from "@/src/components/PanelScoreEditorial"
import { CurrentSupplementsEditor } from "@/src/components/CurrentSupplementsEditor"
import { contributorArrowForStatus, getPanelScoreInterpretation } from "@/src/lib/panelScoreCopy"
import { notifications } from "@mantine/notifications"
import { getTodayInsightLine } from "@/src/lib/todayInsightLine"
import { shortMarkerLabel } from "@/src/lib/dashboardHomeData"
import { getRoadmapPhase, ROADMAP_PHASES } from "@/src/lib/healthRoadmap"
import {
  getPremiumHeroHeadline,
  getPremiumHeroLede,
  getHeroPositiveLine,
  getTipOfDayStable,
  getMindfulProtocolRailMessage,
} from "@/src/lib/dashboardNarrativeCopy"
import {
  DASHBOARD_SKY_MOODS,
  getDashboardSkyMood,
  isDashboardSkyMood,
  type DashboardSkyMood,
} from "@/src/lib/dashboardSkyMood"
import { useDashboardSkyAtmosphere } from "@/src/contexts/DashboardSkyAtmosphereContext"

const DASHBOARD_GREETING_FOLLOW_LEAD = "Let's make today count"
const DASHBOARD_GREETING_FOLLOW_REST =
  " — movement, sleep, nutrition, and your plan work together—start wherever feels easiest."

function buildShortFocusTitle(markerName: string, status?: string): string {
  const raw = markerName.trim()
  const m = raw.toLowerCase()
  const st = (status ?? "").toLowerCase()
  if (m.includes("hs-crp") || m === "crp" || m.includes("c-reactive")) return `Lower inflammation (${raw})`
  if (m.includes("crp") || m.includes("esr") || m.includes("inflammation")) return `Lower inflammation (${raw})`
  if (m.includes("vitamin d") || m.includes("25-oh")) {
    if (st === "high") return "Review elevated Vitamin D"
    return "Rebuild Vitamin D levels"
  }
  if (m.includes("ferritin")) {
    if (st === "high") return "Review elevated ferritin"
    return "Rebuild iron stores (ferritin)"
  }
  if ((m.includes("b12") || m.includes("cobalamin")) && st === "high") return "Review elevated B12"
  return `Improve ${raw}`
}

/** Keep hero “why now” to 1–2 short sentences for scanability. */
function clampGuidedWhyText(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= maxChars) return t
  const cut = t.slice(0, maxChars)
  const lastPeriod = cut.lastIndexOf(".")
  if (lastPeriod >= 48) return cut.slice(0, lastPeriod + 1).trim()
  const sp = cut.lastIndexOf(" ")
  if (sp > 48) return `${cut.slice(0, sp).trim()}…`
  return `${cut.trim()}…`
}

function shortWhySummaryLine(marker: string, status?: string): string {
  const m = marker.toLowerCase()
  const st = (status ?? "").toLowerCase()
  if (m.includes("crp") || m.includes("inflammation")) {
    return "High hs-CRP = higher inflammation → affects recovery, energy, and long-term health."
  }
  if (m.includes("vitamin d")) {
    if (st === "high") return "Levels are above target — clarify supplements and retest with your clinician."
    return "More stable energy, better recovery, stronger immune resilience."
  }
  if (m.includes("ferritin") || m.includes("iron")) {
    if (st === "high") return "Iron stores are elevated — avoid extra iron unless your clinician advises."
    return "Iron affects oxygen delivery, fatigue, and endurance."
  }
  if ((m.includes("b12") || m.includes("cobalamin")) && st === "high") {
    return "High serum B12 needs clinical context — not a signal to add more B12."
  }
  return `Improving ${marker} aligns with how you feel day to day.`
}

const BIOMARKER_ACRONYMS = new Set([
  "BUN",
  "LDL",
  "HDL",
  "CRP",
  "HS-CRP",
  "ALT",
  "AST",
  "GGT",
  "TSH",
  "T3",
  "T4",
  "A1C",
  "MCH",
  "MCV",
  "MCHC",
  "RBC",
  "WBC",
  "RDW",
  "MPV",
  "ESR",
  "ALP",
  "PSA",
  "FSH",
  "LH",
  "SHBG",
  "DHEA",
  "DHEA-S",
  "IGF-1",
  "VLDL",
  "APOA",
  "APOB",
  "APOA1",
  "APOB100",
  "NA",
  "K",
  "CL",
  "CO2",
  "BNP",
  "NT-PROBNP",
  "D-DIMER",
  "PT",
  "PTT",
  "INR",
  "MCP-1",
  "CMV",
  "EBV",
  "HIV",
  "HCG",
])

/** Keep acronyms uppercased, otherwise return a friendly lowercase phrase. */
function noteTitleFor(markerName: string): string {
  const label = shortMarkerLabel(markerName) || markerName
  const isAcronym =
    BIOMARKER_ACRONYMS.has(label.toUpperCase()) ||
    (label.length <= 5 && /^[A-Z0-9-]+$/.test(label))
  const formatted = isAcronym ? label.toUpperCase() : label.toLowerCase()
  return `On your ${formatted}`
}

function mapOptimizedRecToSavedStackItem(
  rec: SupplementRecommendation & { duplicateMarkersMerged?: string[] }
): SavedSupplementStackItem {
  return {
    supplementName: rec.name ?? "",
    dose: rec.dose ?? "",
    monthlyCost: Number(rec.estimatedMonthlyCost) || 0,
    recommendationType: rec.recommendationType ?? "Core",
    reason: rec.whyThisIsRecommended || rec.whyRecommended || "",
    marker: rec.marker ?? (Array.isArray(rec.duplicateMarkersMerged) ? rec.duplicateMarkersMerged[0] : undefined),
    ...(rec.stackHint ? { stackHint: rec.stackHint } : {}),
  }
}

function findAnalysisForMarker(results: BiomarkerResult[], markerName: string): BiomarkerResult | null {
  const m = markerName.trim().toLowerCase()
  if (!m) return null
  const byExact = results.find((r) => (r.name || "").toLowerCase() === m)
  if (byExact) return byExact
  if (m.includes("vitamin d")) {
    return (
      results.find(
        (r) =>
          (r.name || "").toLowerCase().includes("vitamin d") || (r.name || "").toLowerCase().includes("25-oh")
      ) ?? null
    )
  }
  return results.find((r) => (r.name || "").toLowerCase().includes(m.slice(0, Math.min(6, m.length)))) ?? null
}

function ScoreSparklinePreview({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null
  const w = 120
  const h = 36
  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const d = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW
      const y = pad + innerH - ((v - min) / span) * innerH
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className ?? "dashboard-explore-sparkline"} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProtocolCompletionRing({ pct, label }: { pct: number; label: string }) {
  const r = 36
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset = c * (1 - clamped / 100)
  return (
    <div className="dashboard-guided-rail__ring-wrap" role="img" aria-label={label}>
      <svg width="88" height="88" viewBox="0 0 88 88" className="dashboard-guided-rail__ring-svg" aria-hidden>
        <circle className="dashboard-guided-rail__ring-track" cx="44" cy="44" r={r} fill="none" strokeWidth="6" />
        <circle
          className="dashboard-guided-rail__ring-progress"
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <span className="dashboard-guided-rail__ring-pct" aria-hidden>
        {clamped}%
      </span>
    </div>
  )
}

/**
 * Display-normalize a user-entered supplement label for the Home "On file" preview.
 * Rules: title-case words; keep small connectors lowercase (from, of, with, and, for);
 * normalize unit tokens (IU, mg, mcg, ml) to conventional casing.
 * Purely cosmetic — the stored `current_supplements` entry keeps the user's original text.
 */
function formatSupplementPreviewName(input: string): string {
  const s = input.trim()
  if (!s) return s
  const CONNECTORS = new Set(["from", "of", "with", "and", "for", "a", "an", "the", "to"])
  const UNITS: Record<string, string> = {
    iu: "IU",
    mg: "mg",
    mcg: "mcg",
    µg: "mcg",
    ug: "mcg",
    g: "g",
    ml: "ml",
    l: "L",
    tbsp: "tbsp",
    tsp: "tsp",
  }
  return s
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase()
      const unit = UNITS[lower]
      if (unit) return unit
      if (i > 0 && CONNECTORS.has(lower)) return lower
      if (/^[0-9]/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

function DashboardWhatYouTakeStrip({
  className,
  headingId,
  previewLine,
  isEmpty,
  onOpen,
}: {
  className?: string
  headingId: string
  previewLine: string | null
  isEmpty: boolean
  onOpen: () => void
}) {
  return (
    <section
      className={`${className ?? "dashboard-what-you-take"}${isEmpty ? " dashboard-what-you-take--empty" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="dashboard-what-you-take__inner">
        <div className="dashboard-what-you-take__copy">
          <p className="dashboard-what-you-take__eyebrow">
            <Sparkles size={14} strokeWidth={2.25} aria-hidden />
            {isEmpty ? "One-time setup" : "What I take today"}
          </p>
          <h2 id={headingId} className="dashboard-what-you-take__title">
            {isEmpty ? "What are you actually taking?" : "What I take today"}
          </h2>
          <p className="dashboard-what-you-take__desc">
            {isEmpty
              ? "Today's doses and supply tracking below show Clarion's lab-based plan. Add what's in your cabinet so they reflect your real bottles — photo, barcode, paste a list, or type."
              : "Snap a bottle, scan a barcode, paste a list, or just type — we'll match it to your plan and keep today in sync."}
          </p>
          {previewLine ? (
            <p className="dashboard-what-you-take__saved">
              <span className="dashboard-what-you-take__saved-label">On file:</span> {previewLine}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={`dashboard-what-you-take__cta${isEmpty ? " dashboard-what-you-take__cta--primary" : ""}`}
          onClick={onOpen}
        >
          <Sparkles size={18} strokeWidth={2.25} aria-hidden />
          {isEmpty ? "Add what I take" : "Add or update"}
        </button>
      </div>
    </section>
  )
}

/** Home v2 — Block 1. Calm, specific recognition of the user and their state. */
function HomeBlock1_Recognition({
  greet,
  firstName,
  statusLine,
}: {
  greet: string
  firstName: string
  statusLine: string
}) {
  return (
    <header className="home-v2-recognition">
      <h1 className="home-v2-recognition__greet">
        {greet}, {firstName}.
      </h1>
      <p className="home-v2-recognition__status">{statusLine}</p>
    </header>
  )
}

/** Home v2 — Block 2. Savings hero: one big number + a small before/after. */
function HomeBlock2_Savings({
  currentMonthlySpend,
  optimizedMonthlySpend,
  annualSavings,
}: {
  currentMonthlySpend: number
  optimizedMonthlySpend: number
  annualSavings: number
}) {
  return (
    <section className="home-v2-savings" aria-label="Savings snapshot">
      <p className="home-v2-savings__eyebrow">What Clarion saves you</p>
      <p className="home-v2-savings__hero">
        You&apos;re on track to save{" "}
        <span className="home-v2-savings__amount">${annualSavings}</span> this year.
      </p>
      <div className="home-v2-savings__compare">
        <div>
          <span className="home-v2-savings__label">Current stack</span>
          <span className="home-v2-savings__value home-v2-savings__value--muted">
            ${currentMonthlySpend}/mo
          </span>
        </div>
        <span className="home-v2-savings__arrow" aria-hidden>→</span>
        <div>
          <span className="home-v2-savings__label">Optimized</span>
          <span className="home-v2-savings__value home-v2-savings__value--accent">
            ${optimizedMonthlySpend}/mo
          </span>
        </div>
      </div>
    </section>
  )
}

/** Home v2 — Block 2 fallback. Slot never feels empty. */
function HomeBlock2_SavingsEmpty() {
  return (
    <section className="home-v2-savings home-v2-savings--empty" aria-label="Savings snapshot">
      <p className="home-v2-savings__eyebrow">What Clarion saves you</p>
      <p className="home-v2-savings__hero">Add what you currently take to see your savings.</p>
      <Link href="/dashboard/plan#current-supplements" className="home-v2-savings__cta">
        Add current supplements →
      </Link>
    </section>
  )
}

/** Home v2 — Block 3 positive state. Silence would miss a trust moment. */
function HomeBlock3_AllStocked() {
  return (
    <section className="home-v2-allstocked" aria-label="Supply status">
      <p className="home-v2-allstocked__line">All supplements have 10+ days supply.</p>
    </section>
  )
}

/** Home v2 — Block 3 nudge. Day-1 users with a stack but no inventory tracking yet. */
function HomeBlock3_InventoryPrompt() {
  return (
    <section className="home-v2-allstocked home-v2-allstocked--prompt" aria-label="Supply status">
      <p className="home-v2-allstocked__line">
        Add a bottle count to get reorder reminders before you run out.
      </p>
      <Link href="/dashboard/plan#stack" className="home-v2-allstocked__link">
        Set up inventory →
      </Link>
    </section>
  )
}

/** Home v2 — Block 5. A single pill summarizing streak + weekly consistency. */
function HomeBlock5_Progress({
  streakDays,
  weekConsistencyPct,
}: {
  streakDays: number
  weekConsistencyPct: number
}) {
  return (
    <section className="home-v2-progress" aria-label="Progress this week">
      <p className="home-v2-progress__line">
        <span className="home-v2-progress__streak">{streakDays}-day streak</span>
        <span className="home-v2-progress__dot" aria-hidden>·</span>
        <span className="home-v2-progress__pct">
          {weekConsistencyPct}% consistency this week
        </span>
      </p>
    </section>
  )
}

/** Home v2 — Block 6. One small, specific observation chosen for today. */
function HomeBlock6_DailyNote({
  note,
}: {
  note: { title: string; body: string; source: "marker" | "protocol" | "generic" }
}) {
  return (
    <section className="home-v2-note" aria-label="Note for today">
      <p className="home-v2-note__eyebrow">Note for today</p>
      <p className="home-v2-note__title">{note.title}</p>
      <p className="home-v2-note__body">{note.body}</p>
    </section>
  )
}

/** Home v2 — Block 7. Quiet escape hatch; not a CTA. */
function HomeBlock7_More() {
  return (
    <nav className="home-v2-more" aria-label="More sections">
      <span className="home-v2-more__label">More:</span>
      <Link href="/dashboard/biomarkers">Biomarkers</Link>
      <Link href="/dashboard/trends">Trends</Link>
      <Link href="/dashboard/logbook">Logbook</Link>
      <Link href="/labs/upload">Update labs</Link>
    </nav>
  )
}

/**
 * Home — "Update your bloodwork" action tile.
 *
 * Goal: make adding new lab results a first-class home action so a returning
 * user never has to re-walk the whole onboarding survey just to log a fresh
 * retest. Each upload becomes its own `bloodwork_saves` row (insert, not
 * upsert), which is exactly how the trends chart measures progression over
 * time — so older results are preserved and the chart keeps filling in.
 *
 * Copy changes based on how stale the last save is: under 6 weeks reads as a
 * calm "keep your panel current"; 6+ weeks reads as a gentle nudge.
 */
function HomeBlock_UpdateLabs({ lastSavedAt }: { lastSavedAt: string | null | undefined }) {
  const daysSince = (() => {
    if (!lastSavedAt) return null
    const t = Date.parse(lastSavedAt)
    if (!Number.isFinite(t)) return null
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
  })()
  const isStale = daysSince != null && daysSince >= 42
  const lastSavedLabel = (() => {
    if (daysSince == null) return ""
    if (daysSince <= 1) return "saved today"
    if (daysSince < 7) return `last save ${daysSince} days ago`
    if (daysSince < 60) return `last save ${Math.round(daysSince / 7)} weeks ago`
    return `last save ${Math.round(daysSince / 30)} months ago`
  })()
  return (
    <section className="home-v2-update-labs" aria-label="Update your bloodwork">
      <div className="home-v2-update-labs__copy">
        <p className="home-v2-update-labs__eyebrow">
          {isStale ? "Time for a retest?" : "New lab results?"}
        </p>
        <p className="home-v2-update-labs__body">
          Upload a PDF or photos. Clarion reads them and updates your trends —
          we keep every prior save so you can see progression.
          {lastSavedLabel ? <span className="home-v2-update-labs__meta"> · {lastSavedLabel}</span> : null}
        </p>
      </div>
      <Link href="/labs/upload" className="home-v2-update-labs__cta">
        Update bloodwork
      </Link>
    </section>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { setAtmosphere } = useDashboardSkyAtmosphere()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [supplementInventory, setSupplementInventory] = useState<SupplementInventoryRow[] | null>(null)
  const [reorderSnoozeMap, setReorderSnoozeMap] = useState<Record<string, number>>({})
  const [prefsPhone, setPrefsPhone] = useState("")
  const [prefsRetestWeeks, setPrefsRetestWeeks] = useState(8)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [showBelowFold, setShowBelowFold] = useState(false)
  const [showPrioritiesAndGuides, setShowPrioritiesAndGuides] = useState(false)
  const [showNewResultsBanner, setShowNewResultsBanner] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [protocolTodayComplete, setProtocolTodayComplete] = useState<boolean | null>(null)
  const [protocolHasStreak, setProtocolHasStreak] = useState(false)
  const [protocolTodayX, setProtocolTodayX] = useState<number>(0)
  const [protocolTodayY, setProtocolTodayY] = useState<number>(0)
  const [protocolStreakDays, setProtocolStreakDays] = useState<number>(0)
  const [protocolHistory, setProtocolHistory] = useState<Array<{ log_date: string; checks: Record<string, boolean> }>>([])
  const [protocolTodayChecks, setProtocolTodayChecks] = useState<Record<string, boolean>>({})
  /** Dev-only: force sky mood; `null` = follow protocol + time */
  const [devSkyOverride, setDevSkyOverride] = useState<DashboardSkyMood | null>(null)
  /** Home v2: sky-mood chip strip is hidden unless ?sky=1 is in the URL. */
  const [showSkyControls, setShowSkyControls] = useState(false)
  /** Bumps on an interval + when the tab wakes so time-of-day sky doesn’t stay stale (5 min was too slow; background tabs throttle timers). */
  const [skyClock, setSkyClock] = useState(0)
  /** Today = protocol + habits; Labs = score + momentum; Explore = links + learning */
  const [activeHomeTab, setActiveHomeTab] = useState<"today" | "labs" | "explore">("today")
  /** Habit sliders — blended into daily score on Today tab. */
  const [habitMetricsForDailyScore, setHabitMetricsForDailyScore] = useState<DailyMetrics>({})
  /** Today tab: capture what you already take (photo / barcode AI). */
  const [whatYouTakeOpen, setWhatYouTakeOpen] = useState(false)
  /** When true, opening the capture modal also launches link → dose → lab fit wizard. */
  const [whatYouTakeOpenGuided, setWhatYouTakeOpenGuided] = useState(false)
  const [stackEditRow, setStackEditRow] = useState<SavedSupplementStackItem | null>(null)
  const [dosePromptRow, setDosePromptRow] = useState<SavedSupplementStackItem | null>(null)
  const [doseAckTick, setDoseAckTick] = useState(0)
   /** Plan-style supply status for each stack row (local). */
  const [stackAcqMap, setStackAcqMap] = useState<StackAcquisitionMap>({})
  /** Dedupe bloodwork stack_snapshot sync (lab + profile merge). */
  const stackSnapshotSyncInFlightRef = useRef<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setShowBelowFold(true), 0)
    return () => clearTimeout(t)
  }, [])

  /** Open priorities section when landing with #priorities-guides (e.g. from sidebar / deep link) */
  useEffect(() => {
    const openPriorities = () => {
      if (typeof window === "undefined" || window.location.hash !== "#priorities-guides") return
      setShowPrioritiesAndGuides(true)
      requestAnimationFrame(() => {
        document.getElementById("priorities-guides")?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
    openPriorities()
    window.addEventListener("hashchange", openPriorities)
    return () => window.removeEventListener("hashchange", openPriorities)
  }, [])

  /** Smooth scroll + soft highlight when opening #protocol from home links */
  useEffect(() => {
    const pulse = () => {
      if (typeof window === "undefined" || window.location.hash !== "#protocol") return
      setActiveHomeTab("today")
      const el = document.getElementById("protocol")
      if (!el) return
      const deferred = el.querySelector("details.dashboard-protocol-deferred")
      if (deferred instanceof HTMLDetailsElement && !deferred.open) deferred.open = true
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        el.classList.add("dashboard-today-protocol--highlight")
        window.setTimeout(() => el.classList.remove("dashboard-today-protocol--highlight"), 2200)
      })
    }
    pulse()
    window.addEventListener("hashchange", pulse)
    return () => window.removeEventListener("hashchange", pulse)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const bump = () => setSkyClock((n) => n + 1)
    const id = window.setInterval(bump, 60_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") bump()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const q = params.get("sky")
    if (q === "1") {
      setShowSkyControls(true)
      return
    }
    if (process.env.NODE_ENV !== "development") return
    if (isDashboardSkyMood(q)) {
      setDevSkyOverride(q)
      setShowSkyControls(true)
    }
  }, [])

  const handleSavePrefs = useCallback(async () => {
    if (!user || !profile) return
    setPrefsSaving(true)
    setPrefsSaved(false)
    try {
      await upsertProfile(user.id, {
        age: profile.age ?? "",
        sex: profile.sex ?? "",
        sport: profile.sport ?? "",
        goal: profile.goal ?? "",
        current_supplement_spend: profile.current_supplement_spend ?? "",
        current_supplements: profile.current_supplements ?? "",
        shopping_preference: profile.shopping_preference ?? "Best value",
        improvement_preference: profile.improvement_preference ?? "",
        profile_type: profile.profile_type ?? "",
        email: profile.email ?? undefined,
        phone: prefsPhone.trim() || undefined,
        retest_weeks: prefsRetestWeeks,
        height_cm: profile.height_cm ?? undefined,
        weight_kg: profile.weight_kg ?? undefined,
        supplement_form_preference: profile.supplement_form_preference ?? "any",
        diet_preference: profile.diet_preference ?? undefined,
        symptoms: profile.symptoms ?? undefined,
        health_goals: profile.health_goals ?? undefined,
        streak_milestones: profile.streak_milestones ?? undefined,
        daily_reminder: profile.daily_reminder ?? undefined,
        score_goal: profile.score_goal ?? undefined,
        notify_reorder_email: profile.notify_reorder_email ?? undefined,
        notify_reorder_days: profile.notify_reorder_days ?? undefined,
      })
      const { profile: fresh } = await loadSavedState(user.id)
      if (fresh) {
        setProfile(fresh)
        setPrefsPhone(fresh.phone ?? "")
        setPrefsRetestWeeks(fresh.retest_weeks ?? 8)
      }
      setPrefsSaved(true)
    } finally {
      setPrefsSaving(false)
    }
  }, [user, profile, prefsPhone, prefsRetestWeeks])

  /** Keep Home in sync when supplements sheet saves from the log FAB / checker */
  useEffect(() => {
    const reload = () => {
      if (!user?.id) return
      loadSavedState(user.id)
        .then(({ profile: p }) => {
          if (p) {
            setProfile(p)
            setPrefsPhone(p.phone ?? "")
            setPrefsRetestWeeks(p.retest_weeks ?? 8)
          }
        })
        .catch(() => {})
    }
    window.addEventListener(CLARION_PROFILE_UPDATED_EVENT, reload)
    return () => window.removeEventListener(CLARION_PROFILE_UPDATED_EVENT, reload)
  }, [user?.id])

  const handleStackAcquisitionChange = useCallback(
    (key: string, mode: AcquisitionMode) => {
      if (!user?.id) return
      setStackAcqMap(setStackItemAcquisition(user.id, key, { mode }))
    },
    [user?.id]
  )

  const hasPaidAnalysis = Boolean(profile?.analysis_purchased_at)
  const hasActiveSubscription = subscriptionStatusGrantsAccess(subscription?.status)
  const returnedFromSubscriptionCheckout =
    typeof window !== "undefined" && window.location.search.includes("subscription=success")

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        writeBootstrapCache(user.id, { profile: p ?? null, bloodwork: b ?? null }, sub ?? null)
        if (!p) {
          upsertProfile(user.id, {
            age: "",
            sex: "",
            sport: "",
            goal: "",
            current_supplement_spend: "",
            current_supplements: "",
            shopping_preference: "Best value",
            retest_weeks: 8,
            improvement_preference: "",
            supplement_form_preference: "any",
          }).then(() => {
            setProfile({ user_id: user.id, age: "", sex: "", sport: "", goal: "", current_supplement_spend: "", current_supplements: "", shopping_preference: "Best value", retest_weeks: 8, improvement_preference: "", supplement_form_preference: "any" } as ProfileRow)
            setPrefsRetestWeeks(8)
          }).catch(() => {})
        } else {
          setProfile(p)
          setPrefsPhone(p.phone ?? "")
          setPrefsRetestWeeks(p.retest_weeks ?? 8)
        }
        setBloodwork(b)
        setSubscription(sub)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
        setBloodworkHistory([])
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    getBloodworkHistory(user.id, 10)
      .then(setBloodworkHistory)
      .catch(() => setBloodworkHistory([]))
  }, [user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("newResults") === "1") {
      setShowNewResultsBanner(true)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  // In-app toast for streak milestones (7, 10, 30 days) — show once per session per milestone when prefs allow
  useEffect(() => {
    if (typeof window === "undefined" || protocolStreakDays < 7) return
    if (profile?.streak_milestones === false) return
    const milestones = [7, 10, 30]
    if (!milestones.includes(protocolStreakDays)) return
    try {
      const key = `clarion_streak_toast_${protocolStreakDays}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
      notifications.show({
        title: "Streak milestone",
        message: `You've logged your protocol ${protocolStreakDays} ${protocolStreakDays === 1 ? "day" : "days"} in a row. Keep it up!`,
        color: "green",
      })
    } catch (_) {}
  }, [protocolStreakDays, profile?.streak_milestones])

  // After returning from subscription checkout, refetch a few times so webhook-updated subscription is picked up, then clean URL
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    const search = window.location.search
    if (!search.includes("subscription=success")) return
    const refetch = () => {
      loadSavedState(user.id).then(({ profile: p }) => { if (p) setProfile(p) }).catch(() => {})
      getSubscription(user.id).then((sub) => {
        setSubscription(sub)
        if (subscriptionStatusGrantsAccess(sub?.status)) router.replace("/dashboard")
      }).catch(() => {})
    }
    refetch()
    const t1 = setTimeout(refetch, 1500)
    const t2 = setTimeout(() => {
      refetch()
      router.replace("/dashboard")
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [user?.id, router])

  // Clarion Lite checkout success — webhook may lag; refetch profile (plan_tier) + subscription
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    const search = window.location.search
    if (!search.includes("lite=success")) return
    const refetch = () => {
      loadSavedState(user.id).then(({ profile: p }) => { if (p) setProfile(p) }).catch(() => {})
      getSubscription(user.id).then(setSubscription).catch(() => {})
    }
    refetch()
    const t1 = setTimeout(refetch, 1500)
    const t2 = setTimeout(() => {
      refetch()
      router.replace("/dashboard")
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [user?.id, router])

  // Redirect to paywall when no access (unless dev bypass via NEXT_PUBLIC_DEV_SKIP_PAYWALL=1).
  const hasAnyAccess = hasClarionAnalysisAccess(profile, subscription, bloodwork)
  useEffect(() => {
    if (authLoading || !user || loading) return
    if (profile === null && !loading) return
    if (!hasAnyAccess && profile !== null) {
      router.replace("/paywall")
    }
  }, [authLoading, user, loading, profile, hasAnyAccess, router])

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
    [profile?.age, profile?.sex, profile?.sport, profile?.training_focus]
  )
  /** Must be memoized: a fresh array every render breaks downstream useMemos and the protocol log effect (infinite setState loop). */
  const analysisResults = useMemo((): BiomarkerResult[] => {
    if (!bloodwork?.biomarker_inputs || Object.keys(bloodwork.biomarker_inputs).length === 0) return []
    return analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
  }, [bloodwork?.biomarker_inputs, profileForAnalysis])
  const retestRecommendations = useMemo(() => getRetestRecommendations(analysisResults), [analysisResults])

  const profileForSupplementRecs = useMemo(
    () =>
      profile
        ? {
            shopping_preference: profile.shopping_preference ?? "Best value",
            diet_preference: profile.diet_preference?.trim() || null,
            supplement_form_preference: profile.supplement_form_preference ?? "any",
            improvement_preference: profile.improvement_preference ?? null,
            sport: profile.sport?.trim() || null,
            goal: profile.goal?.trim() || null,
            profile_type: profile.profile_type?.trim() || null,
            health_goals: profile.health_goals?.trim() || null,
          }
        : null,
    [
      profile?.shopping_preference,
      profile?.diet_preference,
      profile?.supplement_form_preference,
      profile?.improvement_preference,
      profile?.sport,
      profile?.goal,
      profile?.profile_type,
      profile?.health_goals,
    ]
  )

  const dashboardSupplementRecs = useMemo(() => {
    try {
      return supplementRecommendations(analysisResults as BiomarkerResult[], {
        supplementFormPreference: profile?.supplement_form_preference === "no_pills" ? "no_pills" : "any",
        profile: profileForSupplementRecs,
      })
    } catch {
      return []
    }
  }, [analysisResults, profile?.supplement_form_preference, profileForSupplementRecs])

  const dashboardOptimizedFromLabs = useMemo(() => {
    try {
      return optimizeStack(dashboardSupplementRecs)
    } catch {
      return {
        stack: [],
        totalMonthlyCost: 0,
        totalUniqueSupplements: 0,
        savingsVsHighestPotency: 0,
        cheapestPlanMonthlyCost: 0,
        highestPotencyPlanMonthlyCost: 0,
      }
    }
  }, [dashboardSupplementRecs])

  const profileStackItems = useMemo(
    () => stackItemsFromProfileCurrentSupplements(profile?.current_supplements),
    [profile?.current_supplements]
  )

  const rawStackFromSnapshotUnfiltered = useMemo(() => {
    const snap = bloodwork?.stack_snapshot
    if (!snap || !("stack" in snap) || !Array.isArray(snap.stack)) return []
    return (snap.stack as SavedSupplementStackItem[]).filter((s) => s?.supplementName?.trim())
  }, [bloodwork?.stack_snapshot])

  const rawStackFromSnapshot = useMemo(
    () => filterOrphanLifestyleRowsFromLabSnapshot(rawStackFromSnapshotUnfiltered),
    [rawStackFromSnapshotUnfiltered]
  )

  const derivedStackFromAnalysis = useMemo((): SavedSupplementStackItem[] => {
    if (rawStackFromSnapshot.length > 0) return []
    return dashboardOptimizedFromLabs.stack.map((rec) =>
      mapOptimizedRecToSavedStackItem(rec as SupplementRecommendation & { duplicateMarkersMerged?: string[] })
    )
  }, [rawStackFromSnapshot, dashboardOptimizedFromLabs])

  /** Labs/onboarding snapshot or derived recommendations — before profile “what you take”. */
  const baseStackFromLabs = useMemo(
    () => (rawStackFromSnapshot.length > 0 ? rawStackFromSnapshot : derivedStackFromAnalysis),
    [rawStackFromSnapshot, derivedStackFromAnalysis]
  )

  const combinedRawStackItems = useMemo(
    () => dedupeStackByStorageKey(mergeLabStackWithProfileStack(baseStackFromLabs, profileStackItems)),
    [baseStackFromLabs, profileStackItems]
  )

  const labSafeStackItems = useMemo(
    () => filterStackItemsByLabSafety(combinedRawStackItems, analysisResults),
    [combinedRawStackItems, analysisResults]
  )

  /** Fetch supplement inventory once per user; refresh when the profile updates (editor saves). */
  useEffect(() => {
    if (!user?.id) {
      setSupplementInventory(null)
      return
    }
    let cancelled = false
    const refresh = () => {
      getSupplementInventory(user.id)
        .then((rows) => {
          if (!cancelled) setSupplementInventory(rows)
        })
        .catch(() => {
          if (!cancelled) setSupplementInventory([])
        })
    }
    refresh()
    const onProfileUpdated = () => refresh()
    if (typeof window !== "undefined") {
      window.addEventListener(CLARION_PROFILE_UPDATED_EVENT, onProfileUpdated)
    }
    return () => {
      cancelled = true
      if (typeof window !== "undefined") {
        window.removeEventListener(CLARION_PROFILE_UPDATED_EVENT, onProfileUpdated)
      }
    }
  }, [user?.id])

  /** Hydrate snooze map from localStorage once on mount (prunes expired entries). */
  useEffect(() => {
    if (typeof window === "undefined") return
    setReorderSnoozeMap(loadReorderSnoozeMap())
  }, [])

  const notifyReorderDays = useMemo(() => {
    const raw = profile?.notify_reorder_days
    const n = typeof raw === "number" ? raw : Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7
  }, [profile?.notify_reorder_days])

  const runningLowItems = useMemo(() => {
    if (supplementInventory === null) return []
    return computeRunningLow(labSafeStackItems, supplementInventory, notifyReorderDays, reorderSnoozeMap)
  }, [labSafeStackItems, supplementInventory, notifyReorderDays, reorderSnoozeMap])

  const handleReorderSnooze = useCallback(
    (name: string) => {
      snoozeReorder(name, 3)
      setReorderSnoozeMap(loadReorderSnoozeMap())
    },
    []
  )

  /** Live estimate: profile spend vs current lab-safe stack costs (matches Plan savings when stack is in sync). */
  const homeSavingsSummary = useMemo(() => {
    const userSpend = Number(profile?.current_supplement_spend || 0) || 0
    const optimizedSpend = labSafeStackItems.reduce((sum, s) => sum + (Number(s.monthlyCost) || 0), 0)
    return computeSavings(userSpend, { totalMonthlyCost: optimizedSpend })
  }, [profile?.current_supplement_spend, labSafeStackItems])

  /** String snapshot of stack sync inputs — use instead of array deps on the DB sync effect (avoids React “dependency array changed size”). */
  const stackSnapshotSyncSignature = useMemo(() => {
    const labKey = sortedSupplementNamesKey(labSafeStackItems)
    const rawFilteredKey = sortedSupplementNamesKey(rawStackFromSnapshot)
    const rawUnfilteredKey = sortedSupplementNamesKey(rawStackFromSnapshotUnfiltered)
    const monthlyTotal = labSafeStackItems.reduce((sum, s) => sum + (Number(s.monthlyCost) || 0), 0)
    const snapshotNeedsCleanup = rawUnfilteredKey !== rawFilteredKey
    const upToDate = labKey === rawFilteredKey && !snapshotNeedsCleanup
    return `${rawUnfilteredKey}|${rawFilteredKey}|${labKey}|${monthlyTotal}|${upToDate ? "1" : "0"}`
  }, [rawStackFromSnapshotUnfiltered, rawStackFromSnapshot, labSafeStackItems])

  const acqStackSignature = useMemo(
    () => sortedSupplementNamesKey(labSafeStackItems),
    [labSafeStackItems]
  )

  const acqStackProductSig = useMemo(
    () =>
      labSafeStackItems
        .map(
          (s) =>
            `${stackItemStorageKey(s)}:${s.productUrl ?? ""}:${s.stackEntryId ?? ""}:${s.userChoseKeepProduct ? "1" : ""}`
        )
        .join("|"),
    [labSafeStackItems]
  )

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    const raw = loadStackAcquisition(user.id)
    if (labSafeStackItems.length === 0) {
      setStackAcqMap(raw)
      return
    }
    const { map, changed } = migrateStackAcquisitionMap(raw, labSafeStackItems)
    const { map: merged, changed: changedInf } = mergeInferredAcquisitionDefaults(labSafeStackItems, map)
    if (changed || changedInf) saveStackAcquisition(user.id, merged)
    setStackAcqMap(merged)
  }, [user?.id, acqStackSignature, acqStackProductSig])

  /** Supplement names for daily protocol — full lab-safe stack (not acquisition-filtered). */
  const stackNamesForProtocol = useMemo(
    () => labSafeStackItems.map((s) => s.supplementName).filter(Boolean),
    [labSafeStackItems]
  )

  /** Today tab + ProtocolTracker: use full lab-safe stack so logging doesn’t require Plan “I have it” first. */
  const protocolStackSnapshot = useMemo(() => {
    if (labSafeStackItems.length === 0) return undefined
    const snap = bloodwork?.stack_snapshot as { totalMonthlyCost?: number } | undefined
    return { stack: labSafeStackItems, totalMonthlyCost: snap?.totalMonthlyCost ?? 0 }
  }, [labSafeStackItems, bloodwork?.stack_snapshot])

  const stackPreviewItems = useMemo(() => labSafeStackItems.slice(0, 5), [labSafeStackItems])

  /**
   * Keep bloodwork stack_snapshot aligned with the merged lab + “what you take” protocol
   * (empty snapshot + recommendations, or profile-only adds like iron / D / magnesium).
   */
  useEffect(() => {
    if (!user?.id || !bloodwork?.id) return
    if (labSafeStackItems.length === 0) {
      stackSnapshotSyncInFlightRef.current = null
      return
    }
    const snapshotNeedsCleanup =
      sortedSupplementNamesKey(rawStackFromSnapshotUnfiltered) !== sortedSupplementNamesKey(rawStackFromSnapshot)
    if (
      sortedSupplementNamesKey(labSafeStackItems) === sortedSupplementNamesKey(rawStackFromSnapshot) &&
      !snapshotNeedsCleanup
    ) {
      stackSnapshotSyncInFlightRef.current = null
      return
    }
    if (stackSnapshotSyncInFlightRef.current === bloodwork.id) return
    stackSnapshotSyncInFlightRef.current = bloodwork.id
    const totalMonthly = labSafeStackItems.reduce((sum, s) => sum + (Number(s.monthlyCost) || 0), 0)
    updateLatestBloodworkStackSnapshot(user.id, { stack: labSafeStackItems, totalMonthlyCost: totalMonthly }, undefined)
      .then(() => loadSavedState(user.id))
      .then(({ bloodwork: b }) => {
        if (b) setBloodwork(b)
      })
      .catch(() => {
        stackSnapshotSyncInFlightRef.current = null
      })
  }, [user?.id, bloodwork?.id, stackSnapshotSyncSignature])

  // Protocol state for "Next action" block and Today strip: today X/Y, streak
  useEffect(() => {
    if (!user?.id || stackNamesForProtocol.length === 0) {
      setProtocolTodayComplete(null)
      setProtocolHasStreak(false)
      setProtocolTodayX(0)
      setProtocolTodayY(0)
      setProtocolStreakDays(0)
      setProtocolHistory([])
      setProtocolTodayChecks({})
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const stack = stackNamesForProtocol
    Promise.all([getProtocolLog(user.id, today), getProtocolLogHistory(user.id, 14)])
      .then(([todayChecks, history]) => {
        setProtocolTodayChecks(todayChecks)
        setProtocolHistory(history.slice(0, 7))
        const completed = stack.filter((item) => todayChecks[item]).length
        const total = stack.length
        const todayComplete = total > 0 && completed === total
        const byDate: Record<string, boolean> = {}
        history.forEach(({ log_date, checks }) => {
          byDate[log_date] = Object.values(checks).some(Boolean)
        })
        byDate[today] = todayComplete
        let streak = 0
        for (let i = 0; i < 14; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().slice(0, 10)
          if (byDate[dateStr]) streak++
          else break
        }
        setProtocolTodayComplete(todayComplete)
        setProtocolHasStreak(streak > 0)
        setProtocolTodayX(completed)
        setProtocolTodayY(total)
        setProtocolStreakDays(streak)
      })
      .catch(() => {
        setProtocolTodayComplete(null)
        setProtocolHasStreak(false)
        setProtocolTodayX(0)
        setProtocolTodayY(0)
        setProtocolStreakDays(0)
        setProtocolTodayChecks({})
      })
  }, [user?.id, stackNamesForProtocol])

  const scoreBreakdown = useMemo(
    () => (analysisResults.length > 0 ? getScoreBreakdown(analysisResults) : null),
    [analysisResults]
  )
  const scoreDrivers = useMemo(
    () => (analysisResults.length > 0 ? getScoreDrivers(analysisResults, 5) : []),
    [analysisResults]
  )

  const scoreSparklineSeries = useMemo(() => {
    return [...bloodworkHistory]
      .reverse()
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number" && !Number.isNaN(s))
  }, [bloodworkHistory])
  /** Oldest → newest panel scores (history is newest-first from API). */
  const scoreJourney = useMemo(() => {
    if (bloodworkHistory.length < 2) return null
    const chronological = [...bloodworkHistory].reverse()
    const oldestRaw = chronological[0]?.score
    const newestRaw = chronological[chronological.length - 1]?.score
    if (typeof oldestRaw !== "number" || typeof newestRaw !== "number") return null
    return {
      from: Math.round(oldestRaw),
      to: Math.round(newestRaw),
      improved: newestRaw > oldestRaw,
    }
  }, [bloodworkHistory])
  const stackNames = stackNamesForProtocol
  const scoreCategoriesWithMarkers = useMemo(() => {
    const seen = new Set<string>()
    for (const r of analysisResults) {
      if (r?.name) seen.add(getCategoryForMarker(r.name))
    }
    return SCORE_CATEGORIES.filter((c) => seen.has(c))
  }, [analysisResults])
  const adherenceResult = useMemo(
    () => (protocolHistory.length > 0 && stackNames.length > 0 ? getAdherence(protocolHistory, stackNames) : null),
    [protocolHistory, stackNames]
  )
  const earnedBadges = useMemo(
    () =>
      getEarnedBadges(
        protocolHistory,
        protocolStreakDays,
        bloodworkHistory,
        protocolTodayComplete === true
      ),
    [protocolHistory, protocolStreakDays, bloodworkHistory, protocolTodayComplete]
  )

  const retestWeeks = profile?.retest_weeks ?? 8
  const lastBloodworkAt = bloodwork?.updated_at ?? bloodwork?.created_at ?? null
  const retestCountdown = useMemo(() => {
    if (!lastBloodworkAt || !retestWeeks) return null
    const last = new Date(lastBloodworkAt).getTime()
    const weeksMs = retestWeeks * 7 * 24 * 60 * 60 * 1000
    const dueDate = last + weeksMs
    const now = Date.now()
    if (now < dueDate) {
      const weeksUntil = Math.ceil((dueDate - now) / (7 * 24 * 60 * 60 * 1000))
      return { type: "until" as const, weeks: weeksUntil }
    }
    const weeksOverdue = Math.ceil((now - dueDate) / (7 * 24 * 60 * 60 * 1000))
    return { type: "overdue" as const, weeks: weeksOverdue }
  }, [lastBloodworkAt, retestWeeks])

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile), [profile])

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10, priorityContext),
    [analysisResults, priorityContext]
  )

  const improvementForecast = useMemo(() => {
    const marker = orderedDrivers[0]?.markerName?.trim() || null
    if (!marker || analysisResults.length === 0) return null
    return getImprovementForecast(analysisResults, marker)
  }, [analysisResults, orderedDrivers])

  const panelScoreRounded = useMemo(
    () => (bloodwork?.score != null ? Math.round(bloodwork.score) : 0),
    [bloodwork?.score]
  )
  const panelInterpretation = useMemo(() => getPanelScoreInterpretation(panelScoreRounded), [panelScoreRounded])
  const panelContributors = useMemo(
    () =>
      orderedDrivers.slice(0, 3).map((d) => ({
        label: shortMarkerLabel(d.markerName || d.label),
        arrow: contributorArrowForStatus(d.status),
      })),
    [orderedDrivers]
  )
  const lastLogDate = useMemo(() => {
    if (!protocolHistory.length) return null
    const dates = protocolHistory.map((p) => p.log_date).filter(Boolean)
    return dates.length > 0 ? dates.sort().reverse()[0] ?? null : null
  }, [protocolHistory])
  const hasStack = labSafeStackItems.length > 0

  const doseGateSignature = useMemo(
    () =>
      labSafeStackItems
        .map((s) => `${stackItemStorageKey(s)}::${(s.dose ?? "").trim()}`)
        .sort()
        .join("|"),
    [labSafeStackItems]
  )

  const refreshAfterStackMutation = useCallback(async () => {
    if (!user?.id) return
    dispatchProfileUpdated()
    const { profile: p, bloodwork: b } = await loadSavedState(user.id)
    if (p) setProfile(p)
    if (b) setBloodwork(b)
  }, [user?.id])

  const renderStackRowActions = useCallback(
    ({ row }: { row: SavedSupplementStackItem; storageKey: string }) => (
      <StackItemActionsMenu
        compact
        ariaLabel={`Actions for ${row.supplementName}`}
        onEdit={() => setStackEditRow(row)}
        onDelete={() => {
          if (!user?.id) return
          if (!window.confirm(`Remove “${row.supplementName}” from your stack?`)) return
          void (async () => {
            try {
              await deleteMergedStackItem(user.id, row, profile, bloodwork)
              await refreshAfterStackMutation()
              notifications.show({ title: "Removed", message: "Your stack was updated.", color: "green" })
            } catch {
              notifications.show({ title: "Couldn’t update", message: "Try again in a moment.", color: "red" })
            }
          })()
        }}
      />
    ),
    [user?.id, profile, bloodwork, refreshAfterStackMutation]
  )

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return
    if (labSafeStackItems.length === 0) {
      setDosePromptRow(null)
      return
    }
    const ack = loadDoseAckMap(user.id)
    for (const row of labSafeStackItems) {
      const k = stackItemStorageKey(row)
      if (ack[k]) continue
      if (row.dose?.trim()) continue
      setDosePromptRow(row)
      return
    }
    setDosePromptRow(null)
  }, [user?.id, doseGateSignature, labSafeStackItems, doseAckTick])

  const dashboardStatus = useMemo(
    () =>
      getDashboardStatus({
        orderedDriversCount: orderedDrivers.length,
        protocolTodayComplete,
        protocolStreakDays,
        retestCountdown,
        lastLogDate,
        hasStack,
      }),
    [orderedDrivers.length, protocolTodayComplete, protocolStreakDays, retestCountdown, lastLogDate, hasStack]
  )
  const doThisFirst = useMemo(
    () =>
      getDoThisFirst({
        orderedDrivers,
        protocolTodayComplete,
        hasStack,
      }),
    [orderedDrivers, protocolTodayComplete, hasStack]
  )

  /** Home tab that best matches the next action — soft pulse invites attention without harsh UI cuts */
  const nudgeHomeTab = useMemo((): "today" | "labs" | "explore" => {
    if (hasStack && protocolTodayComplete !== true) return "today"
    if (retestCountdown?.type === "until" && retestCountdown.weeks <= 2) return "labs"
    if (orderedDrivers.length > 0) return "labs"
    return "explore"
  }, [hasStack, protocolTodayComplete, retestCountdown, orderedDrivers.length])

  const topFocusForSummary = useMemo(
    () => getOrderedFocusResults(analysisResults, 3, priorityContext),
    [analysisResults, priorityContext]
  )
  const topPriorityNames = useMemo(
    () => topFocusForSummary.slice(0, 3).map((t: { name?: string; marker?: string }) => t.name || t.marker || "").filter(Boolean),
    [topFocusForSummary]
  )
  const statusCounts = useMemo(() => countByStatus(analysisResults), [analysisResults])
  const prioritySummary = useMemo(
    () => getPrioritySummary(analysisResults, topFocusForSummary),
    [analysisResults, topFocusForSummary]
  )
  const detectedPatternsForSummary = useMemo(() => detectPatterns(analysisResults), [analysisResults])
  const bloodwiseSummary = useMemo(() => {
    const score = bloodwork?.score ?? 0
    if (analysisResults.length === 0 || typeof score !== "number") return null
    return getBloodwiseSummary({
      analysisResults,
      score,
      statusCounts,
      topFocus: topFocusForSummary,
      prioritySummary,
      detectedPatterns: detectedPatternsForSummary,
    })
  }, [analysisResults, bloodwork?.score, statusCounts, topFocusForSummary, prioritySummary, detectedPatternsForSummary])

  const heroFocus = useMemo(() => {
    const marker = orderedDrivers[0]?.markerName?.trim() || ""
    if (!marker) {
      return {
        title: "Your health snapshot",
        gain: null as number | null,
        potentialScore: null as number | null,
        statusChip: null as string | null,
        markerForWhy: "",
      }
    }
    const title = buildShortFocusTitle(marker, orderedDrivers[0]?.status)
    const currentSc = typeof bloodwork?.score === "number" ? Math.round(bloodwork.score) : 0
    const gain =
      improvementForecast && improvementForecast.projectedScore > currentSc
        ? Math.round(improvementForecast.projectedScore - improvementForecast.currentScore)
        : null
    const potentialScore =
      improvementForecast && improvementForecast.projectedScore > currentSc
        ? Math.round(improvementForecast.projectedScore)
        : null
    const topResult = analysisResults.find(
      (r) => (r.name || (r as { marker?: string }).marker || "").toLowerCase() === marker.toLowerCase()
    )
    const tone = topResult ? getStatusTone(topResult.status) : null
    let statusChip: string | null = null
    if (tone?.label === "Borderline") statusChip = "Slightly elevated"
    else if (tone?.label === "High") statusChip = "Elevated"
    else if (tone?.label === "Deficient") statusChip = "Below optimal"
    else if (tone?.label === "Optimal" || tone?.label === "Normal") statusChip = "In range"

    return {
      title,
      gain,
      potentialScore,
      statusChip,
      markerForWhy: marker,
    }
  }, [orderedDrivers, improvementForecast, bloodwork?.score, analysisResults])

  const challengeByDate = useMemo(() => {
    const map: Record<string, boolean> = {}
    protocolHistory.forEach(({ log_date, checks }) => {
      if (log_date && Object.values(checks ?? {}).some(Boolean)) map[log_date] = true
    })
    return map
  }, [protocolHistory])
  const challengeExtra = useMemo(
    () => getChallengeExtra(bloodworkHistory, (inputs, p) => analyzeBiomarkers(inputs, p)),
    [bloodworkHistory]
  )
  const challengesSummary = useMemo(() => {
    let completed = 0
    let nextClosest: { name: string; left: string } | null = null
    for (const ch of CHALLENGES) {
      const { current, completed: done } = getChallengeProgress(ch, challengeByDate, challengeExtra)
      if (done) completed++
      else if (nextClosest == null && ch.rule === "protocol_streak" && ch.target > current) {
        nextClosest = { name: ch.name, left: `${ch.target - current} more day${ch.target - current !== 1 ? "s" : ""}` }
      } else if (nextClosest == null && ch.rule === "protocol_week" && ch.target > current) {
        nextClosest = { name: ch.name, left: `${ch.target - current} more day${ch.target - current !== 1 ? "s" : ""} this week` }
      }
    }
    return { completed, total: CHALLENGES.length, nextClosest }
  }, [challengeByDate, challengeExtra])

  const daysSinceLog =
    lastLogDate != null
      ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000))
      : null
  const hasBloodwork = Boolean(
    bloodwork &&
      ((bloodwork.selected_panel?.length ?? 0) > 0 ||
        bloodwork.score != null ||
        (bloodwork.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0))
  )
  const hasLabPersonalization = useMemo(
    () => hasLabPersonalizationAccess(profile, bloodwork),
    [profile, bloodwork]
  )
  const liteSupplementSuggestions = useMemo(
    () =>
      profile
        ? buildLiteSupplementSuggestions({
            symptoms: profile.symptoms ?? null,
            profile_type: profile.profile_type ?? null,
            improvement_preference: profile.improvement_preference ?? null,
          })
        : [],
    [profile]
  )
  const currentSupplementsDigest = useMemo(() => {
    const raw = profile?.current_supplements
    if (!raw?.trim()) return { count: 0, previewLine: null as string | null }
    const entries = parseCurrentSupplementsEntries(raw)
    if (entries.length === 0) return { count: 0, previewLine: null as string | null }
    const names = entries.map((e) => formatSupplementPreviewName(e.name))
    const shown = names.slice(0, 3).join(", ")
    const extra = names.length > 3 ? ` +${names.length - 3} more` : ""
    return { count: entries.length, previewLine: `${shown}${extra}` }
  }, [profile?.current_supplements])
  const whatYouTakeCount = currentSupplementsDigest.count
  const whatYouTakePreviewLine = currentSupplementsDigest.previewLine
  /** True when labs + any stack item combine to produce a lab-fit chip (what the checklist's "see your fit" step aims at). */
  const anyStackFitComputed = useMemo(() => {
    if (!hasBloodwork) return false
    if (analysisResults.length === 0) return false
    if (labSafeStackItems.length === 0) return false
    const entries = parseCurrentSupplementsEntries(profile?.current_supplements ?? "")
    return entries.some((e) => Boolean(e.fitStatus))
  }, [hasBloodwork, analysisResults, labSafeStackItems, profile?.current_supplements])
  const nudgeBanner = useMemo(() => {
    if (nudgeDismissed || !hasBloodwork) return null
    if (hasStack && protocolTodayComplete !== true && daysSinceLog != null && daysSinceLog >= 2) {
      return {
        message: `You haven't logged your protocol in ${daysSinceLog} days.`,
        cta: "Log now",
        href: "/dashboard#protocol",
      }
    }
    if (retestCountdown && retestCountdown.type === "until" && retestCountdown.weeks <= 2 && retestCountdown.weeks > 0) {
      return {
        message: `Suggested retest in ${retestCountdown.weeks} week${retestCountdown.weeks !== 1 ? "s" : ""}. Add to calendar?`,
        cta: "Add to calendar",
        href: (() => {
          if (!lastBloodworkAt) return "/?step=labs"
          const due = new Date(lastBloodworkAt)
          due.setDate(due.getDate() + (profile?.retest_weeks ?? 8) * 7)
          const start = due.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
          const end = new Date(due.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15)
          return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Clarion+retest+due&dates=${start}/${end}`
        })(),
        external: true,
      }
    }
    return null
  }, [nudgeDismissed, hasBloodwork, hasStack, protocolTodayComplete, daysSinceLog, retestCountdown, lastBloodworkAt, profile?.retest_weeks])
  const greeting = useMemo(() => {
    const h = typeof window !== "undefined" ? new Date().getHours() : 12
    if (h < 5) return "Still up"
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  }, [])
  const displayName = useMemo(() => {
    const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name
    if (typeof name === "string" && name.trim()) {
      const first = name.trim().split(/\s+/)[0]
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    }
    const email = user?.email
    if (typeof email === "string" && email.includes("@")) {
      const part = email.split("@")[0].replace(/[._]/g, " ").trim()
      if (!part) return "there"
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }
    return "there"
  }, [user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email])

  /** Second line typewriter starts after the greeting’s pop has begun (stagger matches TypewriterHeading pop). */
  const greetingFollowPopDelayMs = useMemo(() => {
    const first = `${greeting}, ${displayName}`
    return Math.min(2600, Math.max(680, first.length * 42 + 400))
  }, [greeting, displayName])

  const greetingFollowRestPopDelayMs = useMemo(
    () => greetingFollowPopDelayMs + DASHBOARD_GREETING_FOLLOW_LEAD.length * 42 + 280,
    [greetingFollowPopDelayMs]
  )

  const todayFocusWithIcons = useMemo(
    () =>
      getTodayFocusActionsWithIcons(
        scoreDrivers,
        bloodwork?.stack_snapshot as { stack?: { supplementName?: string; dose?: string; marker?: string }[] } | undefined
      ),
    [scoreDrivers, bloodwork?.stack_snapshot]
  )

  const featuredTodaySplit = useMemo(
    () => splitFeaturedTodayActions(todayFocusWithIcons),
    [todayFocusWithIcons]
  )

  const heroMomentumLine = useMemo(() => {
    if (protocolStreakDays >= 1) {
      return `${protocolStreakDays}-day streak`
    }
    if (heroFocus.gain != null && heroFocus.gain > 0) {
      return `You're one step away from +${heroFocus.gain} points`
    }
    return null
  }, [protocolStreakDays, heroFocus.gain])

  const featuredHeroUi = useMemo(() => {
    const featured = featuredTodaySplit.featured
    if (!featured) return null
    const hasProtocolSteps = hasStack && protocolTodayY > 0
    let eyebrow = "Next up"
    let eyebrowClass = ""
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        eyebrow = "Completed today"
        eyebrowClass = "dashboard-featured-eyebrow--done"
      } else if (protocolTodayX > 0) {
        eyebrow = "In progress"
        eyebrowClass = "dashboard-featured-eyebrow--progress"
      } else {
        eyebrow = "Next up"
      }
    }
    const micro = getFeaturedMicrocopy(featured, hasProtocolSteps ? protocolTodayY : null)
    let stepLine: string | null = null
    if (hasProtocolSteps) {
      if (protocolTodayComplete === true) {
        stepLine = `All ${protocolTodayY} steps logged`
      } else {
        stepLine = `Step ${protocolTodayX + 1} of ${protocolTodayY}`
      }
    }
    const doneToday = hasProtocolSteps && protocolTodayComplete === true
    const startLabel = doneToday ? "View plan →" : "Start protocol →"
    const startHref = doneToday ? "/dashboard#protocol" : "/dashboard/actions"
    return { featured, eyebrow, eyebrowClass, micro, stepLine, startLabel, startHref, doneToday }
  }, [
    featuredTodaySplit,
    hasStack,
    protocolTodayY,
    protocolTodayX,
    protocolTodayComplete,
  ])

  const todayInsightLineText = useMemo(
    () =>
      getTodayInsightLine({
        doThisFirst: doThisFirst ? { line: doThisFirst.line, title: doThisFirst.title } : null,
        heroFocusTitle: heroFocus.title,
        featuredMicro: featuredHeroUi?.micro ?? null,
        featuredLabel: featuredHeroUi?.featured?.label ?? null,
      }),
    [doThisFirst, heroFocus.title, featuredHeroUi]
  )

  const reportDateRelative = useMemo(() => {
    const iso = bloodwork?.created_at
    if (!iso) return null
    const then = new Date(iso)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()
    const days = Math.floor((start - startThen) / (24 * 60 * 60 * 1000))
    if (days === 0) return "Updated today"
    if (days === 1) return "Updated yesterday"
    if (days < 7) return `Updated ${days} days ago`
    const weeks = Math.floor(days / 7)
    if (weeks === 1) return "Updated 1 week ago"
    if (weeks < 4) return `Updated ${weeks} weeks ago`
    return `Updated ${then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }, [bloodwork?.created_at])

  const previousScore =
    bloodworkHistory.length >= 2 && bloodworkHistory[1]?.score != null
      ? bloodworkHistory[1].score
      : null
  const currentScore = bloodwork?.score ?? null
  const scoreDelta =
    currentScore != null && previousScore != null ? currentScore - previousScore : null

  const contextualInsightLine = useMemo(
    () =>
      getContextualInsight({
        orderedDrivers,
        analysisResults,
        reportDateRelative,
        retestCountdown,
      }),
    [orderedDrivers, analysisResults, reportDateRelative, retestCountdown]
  )

  const optimalMarkerLabels = useMemo(() => {
    return analysisResults
      .filter((r) => {
        const s = (r.status || "").toLowerCase()
        return s === "optimal" || s === "normal" || s === "in range"
      })
      .map((r) => shortMarkerLabel(r.name || ""))
      .filter(Boolean)
      .slice(0, 4)
  }, [analysisResults])

  const heroPositiveLine = useMemo(
    () =>
      getHeroPositiveLine({
        optimalMarkerLabels,
        protocolStreakDays,
      }),
    [optimalMarkerLabels, protocolStreakDays]
  )

  const scoreProgressionLine = useMemo(() => {
    if (scoreDelta != null && scoreDelta !== 0) {
      return `${scoreDelta > 0 ? "+" : ""}${Math.round(scoreDelta)} from last panel`
    }
    if (bloodworkHistory.length < 2) return "First panel — your baseline is set"
    return "Holding steady vs last panel"
  }, [scoreDelta, bloodworkHistory.length])

  const scoreFocusLine = useMemo(() => {
    const m = orderedDrivers[0]?.markerName
    if (m) return `Focus: ${shortMarkerLabel(m)}`
    return null
  }, [orderedDrivers])

  const scoreTierClass = useMemo(() => {
    const s = panelScoreRounded
    if (s >= 85) return "panel-score-editorial--tier-bright"
    if (s >= 70) return "panel-score-editorial--tier-mid"
    if (s >= 60) return "panel-score-editorial--tier-soft"
    return "panel-score-editorial--tier-warm"
  }, [panelScoreRounded])

  const premiumNarrativeInput = useMemo(
    () => ({
      orderedDrivers,
      scoreDelta,
      statusCounts,
      bloodwiseSummary: bloodwiseSummary
        ? {
            overallInterpretation: bloodwiseSummary.overallInterpretation,
            keyFindings: bloodwiseSummary.keyFindings,
          }
        : null,
    }),
    [orderedDrivers, scoreDelta, statusCounts, bloodwiseSummary]
  )

  const homeHeadline = useMemo(
    () => getPremiumHeroHeadline(premiumNarrativeInput),
    [premiumNarrativeInput]
  )

  const homeLede = useMemo(() => getPremiumHeroLede(premiumNarrativeInput), [premiumNarrativeInput])

  const roadmapSnapshot = useMemo(
    () => (analysisResults.length > 0 ? getRoadmapPhase(analysisResults) : null),
    [analysisResults]
  )

  const guidedStepEyebrow = useMemo(() => {
    if (orderedDrivers[0]?.markerName?.trim()) {
      return "Biggest opportunity for growth"
    }
    if (!roadmapSnapshot) {
      return "Your health journey"
    }
    const idx = ROADMAP_PHASES.findIndex((p) => p.id === roadmapSnapshot.currentPhase.id)
    const stepNum = idx >= 0 ? idx + 1 : 1
    return `Step ${stepNum} — ${roadmapSnapshot.currentPhase.label}`
  }, [roadmapSnapshot, orderedDrivers])

  const nextPlanPreviewSteps = useMemo(() => {
    if (stackPreviewItems.length === 0) return []
    return stackPreviewItems
      .filter((s) => {
        const name = s.supplementName?.trim() ?? ""
        return name && !protocolTodayChecks[name]
      })
      .slice(0, 3)
  }, [stackPreviewItems, protocolTodayChecks])

  const guidedHeroHeadline = useMemo(() => {
    if (hasStack && protocolTodayY > 0 && protocolTodayComplete !== true) {
      return "Finish today’s protocol"
    }
    const first = orderedDrivers[0]?.markerName?.trim()
    if (first) return buildShortFocusTitle(first, orderedDrivers[0]?.status)
    const fallback = (heroFocus.title || homeHeadline || "").trim()
    if (!fallback) return "Take your next step"
    if (/^(improve|lower|raise|finish|focus|add|complete|start|take|get|build|track|log)\b/i.test(fallback)) {
      return fallback
    }
    return `Today: ${fallback}`
  }, [hasStack, protocolTodayY, protocolTodayComplete, orderedDrivers, heroFocus.title, homeHeadline])

  const guidedBenefitLine = useMemo(() => {
    const m = orderedDrivers[0]?.markerName
    const raw = m
      ? shortWhySummaryLine(m, orderedDrivers[0]?.status)
      : heroPositiveLine || "Small, steady steps are how scores move."
    return clampGuidedWhyText(raw, 160)
  }, [orderedDrivers, heroPositiveLine])

  const guidedWhyNowLine = useMemo(() => {
    const raw = doThisFirst?.line ?? contextualInsightLine ?? todayInsightLineText ?? ""
    const clipped = clampGuidedWhyText(raw, 200)
    const top = orderedDrivers[0]?.markerName?.toLowerCase() ?? ""
    if (top.includes("vitamin d")) {
      if (clipped.length >= 50) return clipped
      return "This is one of the highest-leverage changes for how you feel day to day."
    }
    return clipped || "Your plan turns lab signals into one doable flow."
  }, [doThisFirst, contextualInsightLine, todayInsightLineText, orderedDrivers])

  const guidedHeroSnapshot = useMemo(() => {
    const marker = orderedDrivers[0]?.markerName?.trim()
    if (!marker || analysisResults.length === 0) return null
    const r = findAnalysisForMarker(analysisResults, marker)
    if (!r) return null
    const v = r.value
    const min = r.optimalMin
    const max = r.optimalMax
    if (min != null && max != null && Number.isFinite(v)) {
      const fmt = Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, "")
      const label = shortMarkerLabel(r.name) || r.name
      return `${label}: ${fmt} → target ${min}–${max}`
    }
    if (r.status === "deficient" || r.status === "suboptimal") {
      return "Currently below optimal — high potential for improvement"
    }
    return null
  }, [orderedDrivers, analysisResults])

  const priorityMarkerSeries = useMemo(() => {
    const name = orderedDrivers[0]?.markerName?.trim()
    if (!name || bloodworkHistory.length < 2) return null
    return getPriorityMarkerSeries(bloodworkHistory, name)
  }, [orderedDrivers, bloodworkHistory])

  const protocolWeekDots = useMemo(() => {
    const out: { iso: string; active: boolean }[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const active = protocolHistory.some(
        (p) => p.log_date === iso && Object.values(p.checks ?? {}).some(Boolean)
      )
      out.push({ iso, active })
    }
    return out
  }, [protocolHistory])

  /** Single scannable daily line for the at-a-glance rail (protocol > streak > weekly adherence). */
  const guidedDailyRhythmLine = useMemo(() => {
    if (hasStack && protocolTodayY > 0) {
      const pct = Math.min(100, Math.round((protocolTodayX / protocolTodayY) * 100))
      return {
        label: "Today's protocol",
        text: `${protocolTodayX} of ${protocolTodayY} done`,
        progressPct: pct,
      }
    }
    if (protocolStreakDays >= 2) {
      return {
        label: "Streak",
        text: `${protocolStreakDays} days`,
        progressPct: null,
      }
    }
    if (adherenceResult != null) {
      return {
        label: "This week",
        text: `${adherenceResult.consistencyPct}% consistent`,
        progressPct: Math.min(100, adherenceResult.consistencyPct),
      }
    }
    return null
  }, [hasStack, protocolTodayY, protocolTodayX, protocolStreakDays, adherenceResult])

  const guidedProfileGoalLine = useMemo(() => {
    const g = profile?.goal?.trim()
    if (!g) return null
    if (g.length > 140) return `${g.slice(0, 137)}…`
    return g
  }, [profile?.goal])

  const tipOfDay = useMemo(() => getTipOfDayStable(), [])

  const mindfulRailMessage = useMemo(
    () =>
      getMindfulProtocolRailMessage({
        hasStack,
        protocolTodayY,
        protocolTodayComplete,
        protocolStreakDays,
      }),
    [hasStack, protocolTodayY, protocolTodayComplete, protocolStreakDays]
  )

  const weeklyCheckInDays = useMemo(
    () => protocolWeekDots.filter((d) => d.active).length,
    [protocolWeekDots]
  )

  const protocolTodayCompletionPct = useMemo(() => {
    if (!hasStack || protocolTodayY <= 0) return null
    return Math.min(100, Math.round((protocolTodayX / protocolTodayY) * 100))
  }, [hasStack, protocolTodayY, protocolTodayX])

  const homeLearningTeaser = useMemo(() => {
    const priority = topPriorityNames[0]
    if (priority) {
      const byPriority = getLearningItemForPriority(priority)
      if (byPriority) return byPriority
    }
    return getLatestLearningItem()
  }, [topPriorityNames])

  const unifiedBanner = useMemo(() => {
    if (!bloodwork || !(bloodwork.selected_panel?.length > 0 || bloodwork.score != null)) return null
    if (nudgeBanner && !nudgeDismissed) return { kind: "nudge" as const, ...nudgeBanner }
    if (showNewResultsBanner) return { kind: "newResults" as const, scoreDelta }
    return null
  }, [bloodwork, nudgeBanner, nudgeDismissed, showNewResultsBanner, scoreDelta])

  const computedSkyMood = useMemo(
    () =>
      getDashboardSkyMood({
        hour: new Date().getHours(),
        hasStack,
        protocolTodayY,
        protocolTodayX,
        protocolTodayComplete,
        daysSinceLog,
        panelScore: bloodwork?.score != null && Number.isFinite(Number(bloodwork.score)) ? Number(bloodwork.score) : null,
      }),
    [skyClock, hasStack, protocolTodayY, protocolTodayX, protocolTodayComplete, daysSinceLog, bloodwork?.score]
  )

  const targetSkyMood = useMemo(() => devSkyOverride ?? computedSkyMood, [devSkyOverride, computedSkyMood])

  const lastSkyPayloadRef = useRef<{ mood: DashboardSkyMood; nightIncomplete: boolean } | null>(null)
  useEffect(() => {
    if (!hasBloodwork) {
      lastSkyPayloadRef.current = null
      setAtmosphere(null)
      return
    }
    const nightIncomplete = targetSkyMood === "night" && protocolTodayComplete !== true
    const prev = lastSkyPayloadRef.current
    if (prev && prev.mood === targetSkyMood && prev.nightIncomplete === nightIncomplete) {
      return
    }
    lastSkyPayloadRef.current = { mood: targetSkyMood, nightIncomplete }
    setAtmosphere({
      moodOverride: targetSkyMood,
      nightIncomplete,
    })
  }, [hasBloodwork, targetSkyMood, protocolTodayComplete, setAtmosphere])

  useEffect(() => {
    return () => setAtmosphere(null)
  }, [setAtmosphere])

  const applyDevSky = useCallback((m: DashboardSkyMood | null) => {
    setDevSkyOverride(m)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (m == null) url.searchParams.delete("sky")
    else url.searchParams.set("sky", m)
    window.history.replaceState({}, "", url)
  }, [])

  /** Home v2 status line — priority order encoded in homeStatusLine.ts. */
  const homeStatusLineText = useMemo(() => {
    const retestWeeksUntil =
      retestCountdown && retestCountdown.type === "until" ? retestCountdown.weeks : null
    return buildHomeStatusLine({
      runningLowCount: runningLowItems.length,
      retestWeeks: retestWeeksUntil,
      streakDays: protocolStreakDays,
      adherencePct: adherenceResult?.overallPct ?? 0,
      hasStack,
      hasBloodwork,
    })
  }, [
    runningLowItems.length,
    retestCountdown,
    protocolStreakDays,
    adherenceResult?.overallPct,
    hasStack,
    hasBloodwork,
  ])

  /** Home v2 "note for today" — marker verdict first, protocol insight next, curated fallback last. */
  const homeDailyNote = useMemo((): { title: string; body: string; source: "marker" | "protocol" | "generic" } => {
    const topMarker = orderedDrivers[0]?.markerName?.trim()
    if (hasBloodwork && topMarker) {
      const match = findAnalysisForMarker(analysisResults, topMarker)
      if (match && typeof match.value === "number" && Number.isFinite(match.value)) {
        try {
          const narrative = getBiomarkerProfileNarrative(topMarker, match, profile)
          const comparison = getRangeComparison(topMarker, match.value, profileForAnalysis)
          const body = (comparison.verdict || narrative.fitForGoals || narrative.whyForYou).trim()
          if (body) {
            return {
              title: noteTitleFor(topMarker),
              body,
              source: "marker",
            }
          }
        } catch {
          // fall through to the next source
        }
      }
    }
    if (hasStack && contextualInsightLine) {
      return { title: "Today's note", body: contextualInsightLine, source: "protocol" }
    }
    const fallback = pickDailyNote(dayOfYear())
    return { title: fallback.title, body: fallback.body, source: "generic" }
  }, [hasBloodwork, hasStack, orderedDrivers, analysisResults, profile, profileForAnalysis, contextualInsightLine])

  const firstName = useMemo(() => {
    if (!displayName || displayName === "there") return "there"
    return displayName
  }, [displayName])

  const annualSavingsRounded = Math.round(homeSavingsSummary.annualSavings)
  const currentMonthlySpendRounded = Math.round(homeSavingsSummary.userCurrentSpend)
  const optimizedMonthlySpendRounded = Math.round(homeSavingsSummary.optimizedSpend)
  const weekConsistencyPct = adherenceResult?.consistencyPct ?? 0

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-shell dashboard-shell--clarion-home">
        <div className="dashboard-container dashboard-loading-skeleton" aria-busy="true" aria-label="Loading dashboard">
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--display" />
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--narrow" />
          <div className="dashboard-skeleton-block dashboard-skeleton-hero" />
          <div className="dashboard-skeleton-block dashboard-skeleton-line dashboard-skeleton-line--wide" />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="dashboard-shell dashboard-shell-unauth">
        <div className="dashboard-container">
          <div className="dashboard-unauth">
            <h1 className="dashboard-unauth-title">Dashboard</h1>
            <p className="dashboard-unauth-text">Log in to view your dashboard and save your results.</p>
            <div className="dashboard-unauth-actions">
              <Link href="/login" className="dashboard-unauth-link dashboard-unauth-link-primary">
                Log in
              </Link>
              <Link href="/" className="dashboard-unauth-link">
                Back to home
              </Link>
            </div>
          </div>
        </div>
        <style jsx>{`
          .dashboard-shell-unauth {
            background: var(--color-bg) !important;
            color: var(--color-text-primary) !important;
          }
          .dashboard-unauth {
            text-align: center;
            padding: 48px 24px;
          }
          .dashboard-unauth-title {
            margin: 0 0 12px;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--color-text-primary);
          }
          .dashboard-unauth-text {
            margin: 0 0 24px;
            color: var(--color-text-secondary);
          }
          .dashboard-unauth-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          .dashboard-unauth-link {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid var(--color-border);
            background: var(--color-surface-elevated);
            color: var(--color-text-primary);
            font-weight: 600;
            text-decoration: none;
            font-size: 16px;
            transition: background 0.2s, border-color 0.2s;
          }
          .dashboard-unauth-link:hover {
            background: var(--color-surface);
            border-color: var(--color-border-strong);
          }
          .dashboard-unauth-link-primary {
            background: var(--color-accent);
            border: none;
            color: var(--color-accent-contrast);
            box-shadow: var(--shadow-md);
          }
          .dashboard-unauth-link-primary:hover {
            filter: brightness(1.06);
          }
        `}</style>
      </main>
    )
  }

  // Everyone who has paid for the $49 analysis gets full dashboard access (no subscription gate)
  const score = panelScoreRounded

  const isDev = process.env.NODE_ENV === "development"

  return (
    <main className="dashboard-shell dashboard-shell--clarion-home">
      <AddToHomeScreenPopup />
      <div className="dashboard-container">
        {!hasBloodwork ? (
          <header className="dashboard-header">
            <TypewriterHeading variant="pop" className="dashboard-greeting dashboard-greeting-typewriter">
              {`${greeting}, ${displayName}`}
            </TypewriterHeading>
            <Link href="/" className="dashboard-back">← Back to Clarion Labs</Link>
          </header>
        ) : null}

        <FirstRunChecklist
          hasBloodwork={hasBloodwork}
          cabinetCount={whatYouTakeCount}
          anyStackFitComputed={anyStackFitComputed}
          onOpenCabinet={() => setWhatYouTakeOpen(true)}
          addLabsHref="/?step=labs"
          seeFitHref="/dashboard/plan"
          seeReportHref="/dashboard/analysis"
        />

        {hasBloodwork && unifiedBanner && (
          <div
            className={
              unifiedBanner.kind === "nudge"
                ? "dashboard-nudge-banner"
                : "dashboard-new-results-banner dashboard-new-results-banner--compact"
            }
            role="status"
          >
            {unifiedBanner.kind === "newResults" ? (
              <span>
                Updated panel
                {unifiedBanner.scoreDelta != null && unifiedBanner.scoreDelta > 0
                  ? ` — score up ${Math.round(unifiedBanner.scoreDelta)} points vs your last save.`
                  : unifiedBanner.scoreDelta != null && unifiedBanner.scoreDelta < 0
                    ? ` — score ${Math.abs(Math.round(unifiedBanner.scoreDelta))} points vs last save.`
                    : " — your biomarkers and trends are refreshed."}
              </span>
            ) : (
              <>
                <span>{unifiedBanner.message}</span>
                {unifiedBanner.external ? (
                  <a href={unifiedBanner.href} target="_blank" rel="noopener noreferrer">
                    {unifiedBanner.cta}
                  </a>
                ) : (
                  <Link href={unifiedBanner.href}>{unifiedBanner.cta}</Link>
                )}
              </>
            )}
            <button
              type="button"
              className={unifiedBanner.kind === "nudge" ? "dashboard-nudge-dismiss" : "dashboard-new-results-dismiss"}
              onClick={() => {
                if (unifiedBanner.kind === "nudge") setNudgeDismissed(true)
                else setShowNewResultsBanner(false)
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {!hasBloodwork ? (
          hasLabPersonalization ? (
            <div className="dashboard-empty-wrap">
              <h1 className="dashboard-page-headline">Get healthier today</h1>
              <div className="dashboard-card dashboard-empty">
                <div className="dashboard-empty-icon" aria-hidden>◇</div>
                <h2 className="dashboard-empty-title">Get your personalized health plan</h2>
                <p className="dashboard-empty-text">Complete your first panel to see your score and daily tasks.</p>
                <div className="dashboard-empty-actions">
                  <Link href="/?step=labs" className="dashboard-cta dashboard-cta-primary">
                    Start your analysis
                  </Link>
                  <Link href="/labs/upload" className="dashboard-cta-secondary">
                    Have a PDF? Upload it
                  </Link>
                  <Link href="/" className="dashboard-cta-secondary">How it works</Link>
                </div>
              </div>
              <div className="dashboard-card dashboard-subscribe-card">
                <div className="dashboard-card-label">Clarion+</div>
                <p className="dashboard-card-muted">Trends, retest reminders, and recommendations. Cancel anytime.</p>
                <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe — every 2 months</SubscribeButton>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty-wrap">
              <div className="dashboard-lite-upgrade-strip" role="region" aria-label="Upgrade to full Clarion">
                <p className="dashboard-lite-upgrade-strip__text">
                  Add bloodwork to unlock panel score, biomarker trends, and a lab-matched supplement stack—not symptom-only
                  topics.
                </p>
                <Link href="/paywall" className="dashboard-lite-upgrade-strip__cta">
                  Add bloodwork &amp; full analysis
                </Link>
              </div>
              <h1 className="dashboard-lite-hero-title">Your Clarion Lite plan</h1>
              <p className="dashboard-lite-hero-lede">
                Education and habit support based on how you feel and your goals—not a substitute for labs or medical care.
                Below are supplement <em>topics</em> often discussed in general wellness contexts; they are not based on your
                bloodwork.
              </p>
              <div className="dashboard-card">
                <h2 className="dashboard-empty-title" style={{ marginBottom: 12 }}>
                  Topics to discuss with your clinician
                </h2>
                <ul className="dashboard-lite-suggest-list">
                  {liteSupplementSuggestions.map((s) => (
                    <li key={s.presetId} className="dashboard-lite-suggest-item">
                      <p className="dashboard-lite-suggest-name">{s.displayName}</p>
                      <p className="dashboard-lite-suggest-why">{s.whySuggested}</p>
                    </li>
                  ))}
                </ul>
                <p className="dashboard-lite-disclaimer">{LITE_DISCLAIMER}</p>
              </div>
              {profile ? (
                <section className="dashboard-card" aria-labelledby="dashboard-lite-supplements-heading">
                  <h2 id="dashboard-lite-supplements-heading" className="dashboard-empty-title">
                    Supplements you already take
                  </h2>
                  <p className="dashboard-empty-text" style={{ textAlign: "left", maxWidth: "none" }}>
                    Optional: tell us what you use so we can compare if you add labs later. Manage your full profile in
                    Settings.
                  </p>
                  <div className="dashboard-current-supplements-editor">
                    <CurrentSupplementsEditor
                      idPrefix="dashboard-lite-supplements"
                      value={profile.current_supplements ?? ""}
                      onChange={(serialized) =>
                        setProfile((p) => (p ? { ...p, current_supplements: serialized } : null))
                      }
                    />
                  </div>
                  <label className="dashboard-prefs-field dashboard-current-supplements-spend">
                    <span>Monthly supplement spend (approx.)</span>
                    <input
                      type="text"
                      className="dashboard-prefs-input"
                      value={profile.current_supplement_spend ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, current_supplement_spend: e.target.value } : null))
                      }
                      placeholder="e.g. 50"
                      autoComplete="off"
                    />
                  </label>
                  <p className="dashboard-tab-muted" style={{ marginTop: 16 }}>
                    <Link href="/settings">Profile &amp; symptoms →</Link>
                  </p>
                </section>
              ) : null}
              <div className="dashboard-card dashboard-subscribe-card">
                <div className="dashboard-card-label">Clarion+</div>
                <p className="dashboard-card-muted">Already on Lite? Upgrade to full analysis + Clarion+ from the paywall.</p>
                <SubscribeButton className="dashboard-cta dashboard-cta-subscribe">Subscribe — every 2 months</SubscribeButton>
              </div>
            </div>
          )
        ) : (
          <>
            {hasBloodwork && (
              <section
                className="dashboard-today dashboard-home dashboard-home-v2"
                aria-labelledby="dashboard-today-heading"
              >
                <h2 id="dashboard-today-heading" className="visually-hidden">
                  Home
                </h2>

                <HomeBlock1_Recognition
                  greet={greeting}
                  firstName={firstName}
                  statusLine={homeStatusLineText}
                />

                {annualSavingsRounded >= 12 ? (
                  <HomeBlock2_Savings
                    currentMonthlySpend={currentMonthlySpendRounded}
                    optimizedMonthlySpend={optimizedMonthlySpendRounded}
                    annualSavings={annualSavingsRounded}
                  />
                ) : (
                  <HomeBlock2_SavingsEmpty />
                )}

                {supplementInventory !== null ? (
                  runningLowItems.length > 0 ? (
                    <RunningLowCard
                      items={runningLowItems}
                      onSnooze={(item) => handleReorderSnooze(item.supplementName)}
                    />
                  ) : supplementInventory.length > 0 ? (
                    <HomeBlock3_AllStocked />
                  ) : hasStack ? (
                    <HomeBlock3_InventoryPrompt />
                  ) : null
                ) : null}

                <DashboardWhatYouTakeStrip
                  headingId="dashboard-what-you-take-heading"
                  previewLine={whatYouTakePreviewLine}
                  isEmpty={whatYouTakeCount === 0}
                  onOpen={() => setWhatYouTakeOpen(true)}
                />

                <h2 className="home-v2-section-title">Today&apos;s doses</h2>
                <div className="dashboard-today-protocol-card" id="protocol">
                  <ProtocolTracker
                    stackSnapshot={protocolStackSnapshot}
                    hasLabsButEmptyStack={hasBloodwork && labSafeStackItems.length === 0}
                    dashboardHome
                    suppressPlanHead
                    analysisResults={analysisResults}
                    userId={user?.id}
                    groupByTiming
                    finishTodayHref="/dashboard#protocol"
                    renderStackRowActions={renderStackRowActions}
                    onAllComplete={() => {
                      notifications.show({
                        title: "Today's protocol — complete",
                        message: "Steady work. That consistency is what moves labs over time.",
                        color: "green",
                      })
                    }}
                  />
                </div>

                {protocolStreakDays > 0 ? (
                  <HomeBlock5_Progress
                    streakDays={protocolStreakDays}
                    weekConsistencyPct={weekConsistencyPct}
                  />
                ) : null}

                <HomeBlock6_DailyNote note={homeDailyNote} />

                <HomeBlock_UpdateLabs lastSavedAt={bloodwork?.created_at ?? bloodwork?.updated_at ?? null} />

                <HomeBlock7_More />
              </section>
            )}
          </>
        )}

        {!hasBloodwork && user && profile && (
          <section className="dashboard-section dashboard-settings-section" aria-labelledby="dashboard-settings-heading" style={{ marginTop: hasBloodwork ? 32 : 24 }}>
            <h2 id="dashboard-settings-heading" className="dashboard-section-title"><SettingsIcon className="dashboard-section-title-icon" size={18} strokeWidth={2} aria-hidden /> Settings</h2>
            {(() => {
              const fields = [
                !!profile.age?.trim(),
                !!profile.sex?.trim(),
                profile.height_cm != null && profile.height_cm > 0,
                profile.weight_kg != null && profile.weight_kg > 0,
                !!(profile.profile_type?.trim() || profile.goal?.trim()),
              ]
              const complete = fields.filter(Boolean).length
              const total = 5
              const allComplete = complete === total
              return !allComplete ? (
                <div className="dashboard-profile-nudge">
                  <span className="dashboard-profile-nudge-text">Complete your profile ({complete}/{total})</span>
                  <Link href="/settings" className="dashboard-profile-nudge-link">Finish in Settings →</Link>
                </div>
              ) : null
            })()}
            <div className="dashboard-card dashboard-prefs-card">
              <p className="dashboard-prefs-hint">
                Update your profile, supplements you already take, supplement form (pills vs gummies/powder), retest reminders, and more.
              </p>
              <Link href="/settings" className="dashboard-prefs-link">Manage in Settings →</Link>
            </div>
          </section>
        )}
      </div>

      {showSkyControls && hasBloodwork && (
        <div className="dashboard-sky-dev" role="toolbar" aria-label="Sky background selector">
          <span className="dashboard-sky-dev-label">Sky</span>
          <button
            type="button"
            className={devSkyOverride === null ? "dashboard-sky-dev--active" : ""}
            onClick={() => applyDevSky(null)}
          >
            Auto
          </button>
          {DASHBOARD_SKY_MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={devSkyOverride === m ? "dashboard-sky-dev--active" : ""}
              onClick={() => applyDevSky(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <StackItemEditModal
        open={stackEditRow != null}
        title="Update supplement"
        initialName={stackEditRow?.supplementName ?? ""}
        initialDose={stackEditRow?.dose ?? ""}
        initialUrl={stackEditRow?.productUrl ?? ""}
        onClose={() => setStackEditRow(null)}
        onSave={async (payload) => {
          if (!user?.id || !stackEditRow) return
          try {
            await updateMergedStackItem(user.id, stackEditRow, payload, profile, bloodwork)
            setStackEditRow(null)
            await refreshAfterStackMutation()
            notifications.show({ title: "Saved", message: "Supplement details updated.", color: "green" })
          } catch {
            notifications.show({ title: "Couldn’t save", message: "Try again in a moment.", color: "red" })
          }
        }}
      />
      <StackDosePromptModal
        open={dosePromptRow != null}
        productName={dosePromptRow?.supplementName ?? ""}
        onSkip={() => {
          if (!user?.id || !dosePromptRow) return
          setDoseAcknowledged(user.id, stackItemStorageKey(dosePromptRow))
          setDosePromptRow(null)
          setDoseAckTick((n) => n + 1)
        }}
        onSave={async (dose) => {
          if (!user?.id || !dosePromptRow) return
          try {
            await updateMergedStackItem(
              user.id,
              dosePromptRow,
              { supplementName: dosePromptRow.supplementName, dose },
              profile,
              bloodwork
            )
            setDoseAcknowledged(user.id, stackItemStorageKey(dosePromptRow))
            setDosePromptRow(null)
            setDoseAckTick((n) => n + 1)
            await refreshAfterStackMutation()
          } catch {
            notifications.show({ title: "Couldn’t save", message: "Try again in a moment.", color: "red" })
          }
        }}
      />

      {profile && user?.id ? (
        <CurrentSupplementsCaptureModal
          open={whatYouTakeOpen}
          onClose={() => {
            setWhatYouTakeOpen(false)
            setWhatYouTakeOpenGuided(false)
          }}
          initialOpenGuidedWizard={whatYouTakeOpenGuided}
          currentSupplements={profile.current_supplements ?? ""}
          onChangeSupplements={async (serialized) => {
            if (!user?.id) return
            try {
              await upsertProfile(user.id, {
                age: profile.age ?? "",
                sex: profile.sex ?? "",
                sport: profile.sport ?? "",
                goal: profile.goal ?? "",
                current_supplement_spend: profile.current_supplement_spend ?? "",
                current_supplements: serialized,
                shopping_preference: profile.shopping_preference ?? "Best value",
                improvement_preference: profile.improvement_preference ?? "",
                profile_type: profile.profile_type ?? "",
                retest_weeks: profile.retest_weeks ?? 8,
                supplement_form_preference: profile.supplement_form_preference ?? "any",
                health_goals: profile.health_goals ?? undefined,
                symptoms: profile.symptoms ?? undefined,
                height_cm: profile.height_cm ?? undefined,
                weight_kg: profile.weight_kg ?? undefined,
                diet_preference: profile.diet_preference ?? undefined,
                streak_milestones: profile.streak_milestones ?? undefined,
                daily_reminder: profile.daily_reminder ?? undefined,
                score_goal: profile.score_goal ?? undefined,
                notify_reorder_email: profile.notify_reorder_email ?? undefined,
                notify_reorder_days: profile.notify_reorder_days ?? undefined,
                plan_tier: profile.plan_tier ?? undefined,
              })
              setProfile((prev) => (prev ? { ...prev, current_supplements: serialized } : null))
              dispatchProfileUpdated()
            } catch {
              // ignore
            }
          }}
        />
      ) : null}

      <ComplianceFooter variant="footer" />
    </main>
  )
}
