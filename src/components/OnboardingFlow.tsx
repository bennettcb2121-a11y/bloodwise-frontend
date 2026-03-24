"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Target, Pill, Droplet, Activity, Wallet, TrendingUp, ChevronLeft, Lock, FileText, Stethoscope, CheckCircle2, Zap, Utensils, Moon, Layers, Heart, Dumbbell, Lightbulb, ChevronRight, FlaskConical, ShoppingBag, Check } from "lucide-react"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { getMarkerReason, getInputPlaceholder, titleCase, getBiomarkerTiers } from "@/src/lib/panelEngine"
import { getStatusTone, inferWhyItMatters, inferNextStep } from "@/src/lib/priorityEngine"
import { getDisplayRange } from "@/src/lib/analyzeBiomarkers"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import { getAffiliateProductsForBiomarker, AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { getAffiliateProductForStackItem, getAmazonSearchUrl } from "@/src/lib/stackAffiliate"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import { CLARION_RECOMMENDED_PANEL_KEYS } from "@/src/lib/coreBiomarkerProtocols"
import type { ProfileState } from "@/src/lib/panelEngine"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { HEALTH_GOAL_OPTIONS, healthGoalToProfileType } from "@/src/lib/clarionProfiles"
import {
  SUPPLEMENT_PRESETS,
  parseCurrentSupplementsList,
  serializeCurrentSupplementsList,
  getSupplementDisplayName,
} from "@/src/lib/supplementMetadata"
import { compareStackToCurrentSupplements, getUnnecessaryCurrentSupplements } from "@/src/lib/stackComparison"
import { BLOOD_TEST_PROVIDERS, resolveBloodTestCtaUrl } from "@/src/lib/bloodTestProviders"
import { getEvidenceForBiomarker } from "@/src/lib/biomarkerEvidence"
import { getGuidesForBiomarker } from "@/src/lib/guides"
import { PAID_PROTOCOLS } from "@/src/lib/paidProtocols"
import { ThemeToggle } from "@/src/components/ThemeToggle"
import { TypewriterHeading } from "@/src/components/TypewriterHeading"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"

const TRANSITION = { duration: 0.2, ease: "easeOut" as const }
const CARD_STAGGER = 0.03
const CARD_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}
const GRID_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: CARD_STAGGER, delayChildren: 0.04 } },
}
const TOTAL_STEPS = 15
const STEP_HOOK = 0
const STEP_AGE = 1
const STEP_BIOLOGICAL = 2
const STEP_LIFESTYLE = 3
const STEP_GOALS = 4
const STEP_SYMPTOMS = 5
const STEP_SPEND = 6
const STEP_MID_PROGRESS = 7
const STEP_BIOMARKERS = 8
const STEP_HAVE_LABS = 9
const STEP_LABS = 10
const STEP_BLOOD_TEST = 11
const STEP_ANALYSIS = 12
const STEP_SCORE = 13
const STEP_ACTION_PREVIEW = 14
/** Unreachable in main flow; kept for reference / future dashboard views. */
const STEP_INSIGHTS = 99
const STEP_STACK = 100
const STEP_SUMMARY = 101

const LIFESTYLE_ACTIVITY_OPTIONS = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "very_active", label: "Very active" },
]
const LIFESTYLE_SLEEP_OPTIONS = [
  { id: "under_6", label: "Under 6 hrs" },
  { id: "6_7", label: "6–7 hrs" },
  { id: "7_8", label: "7–8 hrs" },
  { id: "8_plus", label: "8+ hrs" },
]
const LIFESTYLE_ALCOHOL_OPTIONS = [
  { id: "no", label: "No" },
  { id: "occasionally", label: "Occasionally" },
  { id: "regularly", label: "Regularly" },
]
const SYMPTOM_OPTIONS = [
  { id: "fatigue", label: "Fatigue" },
  { id: "brain_fog", label: "Brain fog" },
  { id: "low_energy", label: "Low energy" },
  { id: "poor_recovery", label: "Poor recovery" },
  { id: "sleep_issues", label: "Sleep issues" },
  { id: "none", label: "None" },
]

const ANALYSIS_MESSAGES = [
  "Analyzing your profile…",
  "Evaluating biomarkers…",
  "Building your health score…",
]

const AUTO_ADVANCE_MS = 380

function getSupplementSpendResponse(): string {
  return "We'll compare your current spend with your recommended supplement plan."
}
function getPanelResponse(): string {
  return "This is your recommended panel. You can customize it, but we've already prioritized the highest-signal markers."
}

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) }
}
function feetInchesToCm(feet: number, inches: number): number {
  return feet * 30.48 + inches * 2.54
}
function kgToLb(kg: number): number {
  return kg * 2.205
}
function lbToKg(lb: number): number {
  return lb / 2.205
}

const ICON_SIZE = 36
const ICON_STROKE = 1.5
const CARD_ICON_SIZE = 22

const PROFILE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  general_health_adult: Activity,
  fatigue_low_energy: Zap,
  weight_loss_insulin_resistance: Target,
  heart_health_longevity: Heart,
  vegetarian_vegan: Utensils,
  endurance_athlete: Activity,
  strength_hypertrophy_athlete: Dumbbell,
  mixed_sport_athlete: Activity,
  female_athlete: Activity,
  high_volume_adolescent: Activity,
  older_adult_healthy_aging: Heart,
  prediabetes_metabolic_risk: Target,
  anemia_low_iron: Droplet,
  thyroid_symptom_screen: Activity,
  high_inflammation_poor_recovery: Zap,
  sleep_stress_overreaching: Moon,
}

type OnboardingFlowProps = {
  currentStep: number
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  profile: ProfileState
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>
  currentSupplementSpend: string
  setCurrentSupplementSpend: (s: string) => void
  currentSupplements: string
  setCurrentSupplements: (s: string) => void
  selectedPanel: string[]
  setSelectedPanel: React.Dispatch<React.SetStateAction<string[]>>
  inputs: Record<string, string | number>
  handleInputChange: (key: string, value: string) => void
  recommendedMarkers: string[]
  biomarkerKeys: string[]
  activePanel: string[]
  togglePanelMarker: (marker: string) => void
  useRecommendedPanel: () => void
  hasEnoughLabsFlag: boolean
  loadExampleData: () => void
  analysisResults: any[]
  score: number
  statusCounts: { optimal: number; borderline: number; flagged: number }
  scoreToLabel: (s: number) => string
  optimizedStack: { stack: any[]; totalMonthlyCost: number }
  userCurrentSpend: number
  optimizedSpend: number
  estimatedSavingsVsCurrent: number
  annualSavings: number
  openCompareCards: Record<string, boolean>
  toggleCompare: (key: string) => void
  openScienceMarkers: Record<string, boolean>
  toggleScience: (marker: string) => void
  analyzing: boolean
  setAnalyzing: (b: boolean) => void
  userId: string | null
  previousReports: BloodworkSaveRow[]
  previousReportsLoading: boolean
  handleOpenReport: (save: BloodworkSaveRow) => void
  /** Called when user clicks "Go to Dashboard" on final summary. Marks results flow complete and navigates to dashboard. */
  onGoToDashboard?: () => void
  /** When provided, welcome "Start" uses this (e.g. redirect to login if not signed in). */
  onWelcomeContinue?: () => void
  /** If false and user is logged in, results steps show blur + lock overlay. */
  hasPaidAnalysis?: boolean
  /** When true, show "Welcome to Clarion+" instead of subscribe CTA. */
  hasActiveSubscription?: boolean
  /** Go directly to blood-test options step (9) when user says No to "have labs?" (avoids step guard). */
  goToBloodTestStep?: () => void
  /** Go directly to labs step from blood-test step (avoids step-guard loop). */
  goToLabsStep?: () => void
  /** Go directly to analysis step (10) from labs when user clicks Analyze (bypasses step guard). */
  goToAnalysisStep?: () => void
  /** When "insights" or "stack", show "Back to dashboard" on the corresponding results step. */
  resultsView?: string | null
}

export function OnboardingFlow(props: OnboardingFlowProps) {
  const {
    currentStep,
    setCurrentStep,
    profile,
    setProfile,
    currentSupplementSpend,
    setCurrentSupplementSpend,
    currentSupplements,
    setCurrentSupplements,
    selectedPanel,
    inputs,
    handleInputChange,
    recommendedMarkers,
    biomarkerKeys,
    activePanel,
    togglePanelMarker,
    useRecommendedPanel,
    hasEnoughLabsFlag,
    loadExampleData,
    analysisResults,
    score,
    statusCounts,
    scoreToLabel,
    optimizedStack,
    userCurrentSpend,
    optimizedSpend,
    estimatedSavingsVsCurrent,
    annualSavings,
    openCompareCards,
    toggleCompare,
    openScienceMarkers,
    toggleScience,
    analyzing,
    setAnalyzing,
    userId,
    previousReports,
    previousReportsLoading,
    handleOpenReport,
    onGoToDashboard,
  onWelcomeContinue,
  hasPaidAnalysis = false,
  hasActiveSubscription = false,
  goToBloodTestStep,
  goToLabsStep,
  goToAnalysisStep,
  resultsView = null,
} = props

const reduceMotion = useReducedMotion()

const [hasLabResults, setHasLabResults] = useState<boolean | null>(null)
const [customSupplementInput, setCustomSupplementInput] = useState("")
const [heightWeightUnits, setHeightWeightUnits] = useState<"imperial" | "metric">("imperial")

const supplementList =
  currentSupplements === "No" || !currentSupplements?.trim()
    ? []
    : parseCurrentSupplementsList(currentSupplements)
const setSupplementList = (list: string[]) => {
  setCurrentSupplements(list.length === 0 ? "" : serializeCurrentSupplementsList(list))
}

/* Selected state: soft glass (CSS only) */

  const [analysisMessageIndex, setAnalysisMessageIndex] = React.useState(0)
  const [displayedScore, setDisplayedScore] = React.useState(0)
  const hasSupplements = Boolean(optimizedStack.stack?.length)
  const autoAdvanceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoAdvance = React.useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      setCurrentStep((s: number) => Math.min(STEP_ACTION_PREVIEW, s + 1))
    }, AUTO_ADVANCE_MS)
  }, [setCurrentStep])

  React.useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current) }, [])

  React.useEffect(() => {
    if (currentStep !== STEP_ANALYSIS || !analyzing) return
    const interval = setInterval(() => {
      setAnalysisMessageIndex((i) => (i + 1) % ANALYSIS_MESSAGES.length)
    }, 800)
    return () => clearInterval(interval)
  }, [currentStep, analyzing])

  React.useEffect(() => {
    if (currentStep !== STEP_ANALYSIS || !analyzing) return
    const t = setTimeout(() => {
      setAnalyzing(false)
      setCurrentStep(STEP_SCORE)
    }, 3000)
    return () => clearTimeout(t)
  }, [currentStep, analyzing, setCurrentStep, setAnalyzing])

  // Health score count-up when entering score step
  React.useEffect(() => {
    if (currentStep !== STEP_SCORE) {
      setDisplayedScore(0)
      return
    }
    setDisplayedScore(0)
    const target = Math.round(score)
    const duration = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - t, 3)
      setDisplayedScore(Math.round(easeOut * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [currentStep, score])

  const goNext = () => setCurrentStep((s: number) => Math.min(STEP_ACTION_PREVIEW, s + 1))
  const goBack = () => {
    if (currentStep === STEP_ANALYSIS) setCurrentStep(STEP_LABS)
    else if (currentStep === STEP_BLOOD_TEST) setCurrentStep(STEP_HAVE_LABS)
    else setCurrentStep((s: number) => Math.max(STEP_HOOK, s - 1))
  }

  const handleAnalyze = () => {
    if (goToAnalysisStep) goToAnalysisStep()
    else {
      setCurrentStep(STEP_ANALYSIS)
      setAnalyzing(true)
    }
  }

  const handleUseRecommended = () => {
    useRecommendedPanel()
    setCurrentStep(STEP_HAVE_LABS)
  }
  const biomarkerTiers = getBiomarkerTiers(recommendedMarkers)

  const sliderValue = Math.min(300, Math.max(0, Number(currentSupplementSpend) || 0))
  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100

  return (
    <main className={`onboarding-shell ${currentStep === STEP_HOOK ? "onboarding-shell-hero" : ""}`}>
      <header
        className={`onboarding-header ${currentStep === STEP_HOOK ? "onboarding-header--hero" : ""}`}
      >
        <div className="onboarding-header-inner">
          {currentStep > STEP_HOOK && currentStep !== STEP_ANALYSIS ? (
            <button type="button" className="onboarding-back" onClick={goBack} aria-label="Back">
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
          ) : <div className="onboarding-header-spacer" />}
          <ClarionLabsLogo variant="header" href="/" />
          <div className="onboarding-header-actions">
            <ThemeToggle className="onboarding-header-theme-toggle" />
            {userId ? (
              <>
                <SubscribeButton className="onboarding-header-btn">Subscribe</SubscribeButton>
                <Link href="/dashboard" className="onboarding-header-btn">Dashboard</Link>
              </>
            ) : (
              <Link href="/login" className="onboarding-header-btn">Log in</Link>
            )}
          </div>
        </div>
        {currentStep > STEP_HOOK ? (
        <div className="onboarding-progress-wrap">
          <span className="onboarding-progress-label">Step {currentStep + 1} of {TOTAL_STEPS}</span>
          <p className="onboarding-journey-text" aria-hidden>Profile → Lifestyle → Biomarkers → Score → Plan</p>
          <div className="onboarding-progress-bar">
            <motion.div
              className="onboarding-progress-fill"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
        ) : null}
      </header>

      <div className={`onboarding-container ${currentStep === STEP_HOOK ? "onboarding-container-hero" : ""}`}>
      <AnimatePresence mode="wait">
        {currentStep === STEP_HOOK && (
          <div className="onboarding-hero-wrap">
            <div className="onboarding-hero-backdrop" aria-hidden>
              <div className="onboarding-hero-glow onboarding-hero-glow--headline" />
            </div>
            <motion.section
              key="hook"
              className="onboarding-screen onboarding-hero-layout"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="onboarding-hero-grid">
                <div className="onboarding-hero-copy">
                  <h1 className="onboarding-hero-quote">
                    <span className="onboarding-hero-kicker">Stop guessing your health.</span>
                    <span className="onboarding-hero-quote-core">
                      <span className="onboarding-hero-quote-line">Understand your body.</span>
                      <span className="onboarding-hero-quote-line">Feel better.</span>
                      <span className="onboarding-hero-quote-line onboarding-hero-quote-line--payoff">Save money.</span>
                    </span>
                  </h1>
                  <div className="onboarding-hero-lede">
                    <p className="onboarding-hero-lede-line">Upload your labs.</p>
                    <p className="onboarding-hero-lede-line">
                      We tell you what matters, what to fix, and what not to waste money on.
                    </p>
                  </div>
                  <div className="onboarding-hero-cta-block">
                    <button
                      type="button"
                      className="onboarding-primary-btn onboarding-hero-cta"
                      onClick={onWelcomeContinue ?? goNext}
                    >
                      {!userId && onWelcomeContinue ? "Sign in to continue" : "Start my plan"}
                      <ChevronRight size={20} strokeWidth={2.5} aria-hidden />
                    </button>
                    <p className="onboarding-hero-micro">
                      Takes ~3 minutes <span className="onboarding-hero-micro-sep">•</span> No labs? We&apos;ll guide you
                    </p>
                  </div>
                </div>
                <motion.div
                  className="onboarding-hero-preview"
                  aria-hidden
                  initial={false}
                  animate={reduceMotion ? { y: 0 } : { y: [0, -9, 0] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  <div className="onboarding-hero-preview-glow" />
                  <div className="onboarding-hero-preview-card">
                    <div className="onboarding-hero-preview-stack">
                      <p className="onboarding-hero-preview-journey">
                        <span>Labs</span>
                        <span className="onboarding-hero-preview-journey-arrow">→</span>
                        <span>Plan</span>
                        <span className="onboarding-hero-preview-journey-arrow">→</span>
                        <span>Actions</span>
                      </p>
                      <div className="onboarding-hero-preview-score-hero">
                        <span className="onboarding-hero-preview-score-num">72</span>
                        <span className="onboarding-hero-preview-score-word">Score</span>
                      </div>
                      <div className="onboarding-hero-preview-body">
                        <div className="onboarding-hero-preview-kv">
                          <span className="onboarding-hero-preview-k">Top focus</span>
                          <span className="onboarding-hero-preview-v">Inflammation</span>
                        </div>
                        <div className="onboarding-hero-preview-kv">
                          <span className="onboarding-hero-preview-k">Low biomarkers</span>
                          <span className="onboarding-hero-preview-v">Vitamin D, Magnesium</span>
                        </div>
                        <div className="onboarding-hero-preview-kv onboarding-hero-preview-kv--plan">
                          <span className="onboarding-hero-preview-k">Today&apos;s plan</span>
                          <span className="onboarding-hero-preview-v">3 actions</span>
                        </div>
                      </div>
                      <div className="onboarding-hero-preview-savings">
                        <p className="onboarding-hero-preview-savings-main">
                          Estimated savings <strong>$34/mo</strong>
                        </p>
                        <p className="onboarding-hero-preview-savings-sub">Only buy what you need</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          </div>
        )}

        {currentStep === STEP_AGE && (
          <motion.section
            key="age"
            className="onboarding-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <TypewriterHeading className="onboarding-headline">How old are you?</TypewriterHeading>
            <p className="onboarding-subtext">We use this to personalize your biomarker ranges and recommendations.</p>
            <label className="onboarding-field-label">
              <span>Age</span>
              <input type="number" value={profile.age} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} placeholder="25" min={1} max={120} className="onboarding-input onboarding-input-age" />
            </label>
            <p className="onboarding-curiosity-hook">Most people have at least 3 suboptimal biomarkers. Do you know which ones you have?</p>
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_BIOLOGICAL && (
          <motion.section
            key="biological"
            className="onboarding-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <TypewriterHeading className="onboarding-headline">A few details so we can personalize</TypewriterHeading>
            <p className="onboarding-subtext">Sex, height, and weight help us tailor your optimal ranges and which biomarkers matter most.</p>
            <p className="onboarding-field-label onboarding-sex-label">Sex</p>
            <div className="onboarding-pill-row onboarding-sex-row">
              {[
                { id: "Male", label: "Male" },
                { id: "Female", label: "Female" },
                { id: "Other", label: "Other" },
                { id: "Prefer not to say", label: "Prefer not to say" },
              ].map((opt) => {
                const isSelected = profile.sex === opt.id
                return (
                  <motion.button key={opt.id} type="button" className={`onboarding-answer-pill ${isSelected ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, sex: opt.id }))} aria-pressed={isSelected}>
                    <span className="onboarding-answer-pill-title">{opt.label}</span>
                  </motion.button>
                )
              })}
            </div>
            <div className="onboarding-units-toggle-wrap">
              <span className="onboarding-units-label">Units</span>
              <button type="button" role="switch" aria-checked={heightWeightUnits === "metric"} className={`onboarding-units-toggle ${heightWeightUnits === "metric" ? "onboarding-units-toggle--metric" : ""}`} onClick={(e) => { e.preventDefault(); setHeightWeightUnits((u) => (u === "imperial" ? "metric" : "imperial")); }}>
                <span className={heightWeightUnits === "imperial" ? "onboarding-units-active" : undefined}>ft/in, lb</span>
                <span className={heightWeightUnits === "metric" ? "onboarding-units-active" : undefined}>cm, kg</span>
              </button>
            </div>
            {heightWeightUnits === "imperial" ? (
              <div key="imperial">
                <label className="onboarding-field-label">
                  <span>Height</span>
                  <div className="onboarding-height-row">
                    <input type="number" placeholder="5" min={3} max={8} value={profile.heightCm?.trim() && Number(profile.heightCm) > 0 ? String(cmToFeetInches(Number(profile.heightCm)).feet) : ""} onChange={(e) => { const feet = e.target.value === "" ? 0 : Number(e.target.value); const { inches } = profile.heightCm?.trim() ? cmToFeetInches(Number(profile.heightCm)) : { inches: 0 }; setProfile((p) => ({ ...p, heightCm: feet || inches ? String(Math.round(feetInchesToCm(feet, inches))) : "" })) }} className="onboarding-input onboarding-input-ft" />
                    <span className="onboarding-unit-suffix">ft</span>
                    <input type="number" placeholder="10" min={0} max={11} value={profile.heightCm?.trim() && Number(profile.heightCm) > 0 ? String(cmToFeetInches(Number(profile.heightCm)).inches) : ""} onChange={(e) => { const inches = e.target.value === "" ? 0 : Number(e.target.value); const { feet } = profile.heightCm?.trim() ? cmToFeetInches(Number(profile.heightCm)) : { feet: 0 }; setProfile((p) => ({ ...p, heightCm: feet || inches ? String(Math.round(feetInchesToCm(feet, inches))) : "" })) }} className="onboarding-input onboarding-input-in" />
                    <span className="onboarding-unit-suffix">in</span>
                  </div>
                </label>
                <label className="onboarding-field-label">
                  <span>Weight (lb)</span>
                  <input type="number" step="any" placeholder="e.g. 150" value={profile.weightKg?.trim() && Number(profile.weightKg) > 0 ? String(Number((kgToLb(Number(profile.weightKg))).toFixed(1))) : ""} onChange={(e) => { const raw = e.target.value.trim(); if (raw === "") { setProfile((p) => ({ ...p, weightKg: "" })); return; } const lb = Number(raw); if (!Number.isNaN(lb) && lb > 0) setProfile((p) => ({ ...p, weightKg: String(lb / 2.205) })); }} className="onboarding-input" />
                </label>
              </div>
            ) : (
              <div key="metric">
                <label className="onboarding-field-label">
                  <span>Height (cm)</span>
                  <input type="number" value={profile.heightCm ?? ""} onChange={(e) => setProfile((p) => ({ ...p, heightCm: e.target.value }))} placeholder="170" min={100} max={250} className="onboarding-input" />
                </label>
                <label className="onboarding-field-label">
                  <span>Weight (kg)</span>
                  <input type="number" step="any" value={profile.weightKg ?? ""} onChange={(e) => setProfile((p) => ({ ...p, weightKg: e.target.value }))} placeholder="e.g. 70" className="onboarding-input" />
                </label>
              </div>
            )}
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_LIFESTYLE)}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_LIFESTYLE && (
          <motion.section key="lifestyle" className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">Lifestyle</TypewriterHeading>
            <p className="onboarding-subtext">This helps determine which biomarkers matter most.</p>
            <p className="onboarding-field-label">How active are you?</p>
            <div className="onboarding-pill-row">
              {LIFESTYLE_ACTIVITY_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" className={`onboarding-answer-pill ${profile.activityLevel === opt.id ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, activityLevel: opt.id }))} aria-pressed={profile.activityLevel === opt.id}>{opt.label}</button>
              ))}
            </div>
            <p className="onboarding-field-label">How many hours do you sleep per night?</p>
            <div className="onboarding-pill-row">
              {LIFESTYLE_SLEEP_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" className={`onboarding-answer-pill ${profile.sleepHours === opt.id ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, sleepHours: opt.id }))} aria-pressed={profile.sleepHours === opt.id}>{opt.label}</button>
              ))}
            </div>
            <p className="onboarding-field-label">Do you exercise regularly?</p>
            <div className="onboarding-pill-row">
              <button type="button" className={`onboarding-answer-pill ${profile.exerciseRegularly === "Yes" ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, exerciseRegularly: "Yes" }))} aria-pressed={profile.exerciseRegularly === "Yes"}>Yes</button>
              <button type="button" className={`onboarding-answer-pill ${profile.exerciseRegularly === "No" ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, exerciseRegularly: "No" }))} aria-pressed={profile.exerciseRegularly === "No"}>No</button>
            </div>
            <p className="onboarding-field-label">Do you drink alcohol?</p>
            <div className="onboarding-pill-row">
              {LIFESTYLE_ALCOHOL_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" className={`onboarding-answer-pill ${profile.alcohol === opt.id ? "selected" : ""}`} onClick={() => setProfile((p) => ({ ...p, alcohol: opt.id }))} aria-pressed={profile.alcohol === opt.id}>{opt.label}</button>
              ))}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_GOALS)}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_GOALS && (
          <motion.section key="goals" className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">What are your main health goals?</TypewriterHeading>
            <p className="onboarding-subtext">We&apos;ll tailor your panel and recommendations to what you want to improve.</p>
            <div className="onboarding-pill-row onboarding-improvement-grid" role="group" aria-label="Health goals">
              {HEALTH_GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`onboarding-answer-pill ${profile.healthGoal === opt.id ? "selected" : ""}`}
                  onClick={() => setProfile((p) => ({ ...p, healthGoal: opt.id, profileType: opt.profileType }))}
                  aria-pressed={profile.healthGoal === opt.id}
                >
                  <span className="onboarding-answer-pill-title">{opt.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_SYMPTOMS)} disabled={!profile.healthGoal}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_SYMPTOMS && (
          <motion.section key="symptoms" className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">Do you experience any of the following?</TypewriterHeading>
            <p className="onboarding-subtext">Select any that apply. This helps us prioritize the right biomarkers.</p>
            <div className="onboarding-pill-row onboarding-symptoms-grid" role="group" aria-label="Symptoms">
              {SYMPTOM_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`onboarding-answer-pill ${profile.symptoms === opt.id || (profile.symptoms && profile.symptoms.split(",").includes(opt.id)) ? "selected" : ""}`}
                  onClick={() => setProfile((p) => ({ ...p, symptoms: opt.id === "none" ? "none" : (p.symptoms === "none" ? opt.id : p.symptoms?.includes(opt.id) ? p.symptoms.split(",").filter((s) => s.trim() !== opt.id).join(",") || "none" : [p.symptoms, opt.id].filter(Boolean).join(",")) })) }
                  aria-pressed={!!(profile.symptoms === opt.id || (profile.symptoms && profile.symptoms.split(",").includes(opt.id)))}
                >
                  <span className="onboarding-answer-pill-title">{opt.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_SPEND)}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_SPEND && (
          <motion.section key="spend" className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">About how much do you spend on supplements per month?</TypewriterHeading>
            <p className="onboarding-subtext">Most people overspend on supplements they don&apos;t actually need.</p>
            {Number(currentSupplementSpend) > 0 && <p className="onboarding-adaptive-response">{getSupplementSpendResponse()}</p>}
            <div className="onboarding-slider-wrap">
              <div className="onboarding-slider-value">${sliderValue}{sliderValue >= 300 ? "+" : ""} / month</div>
              <input type="range" min={0} max={300} value={sliderValue} onChange={(e) => setCurrentSupplementSpend(e.target.value)} className="onboarding-slider" />
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_MID_PROGRESS)}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_MID_PROGRESS && (
          <motion.section key="mid-progress" className="onboarding-screen onboarding-screen-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">We&apos;re building your health profile…</TypewriterHeading>
            <p className="onboarding-subtext">Potential biomarkers we may recommend:</p>
            <div className="onboarding-mid-progress-markers">
              {(recommendedMarkers.length >= 5 ? recommendedMarkers.slice(0, 6) : recommendedMarkers.length > 0 ? recommendedMarkers : ["Iron", "Vitamin D", "Magnesium", "Omega-3", "Inflammation markers"]).map((m) => (
                <span key={m} className="onboarding-panel-chip">{titleCase(m)}</span>
              ))}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_BIOMARKERS)}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_BIOMARKERS && (
          <motion.section key="panel" className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION}>
            <TypewriterHeading className="onboarding-headline">Based on your profile, these biomarkers matter most.</TypewriterHeading>
            <p className="onboarding-subtext">Recommended tests are based on your age, sex, activity, and goals. Ranges are tailored to you.</p>
            {recommendedMarkers.length > 0 && (
              <div className="onboarding-panel-recommended-card">
                {(biomarkerTiers.high.length > 0 || biomarkerTiers.moderate.length > 0 || biomarkerTiers.optional.length > 0) ? (
                  <>
                    {biomarkerTiers.high.length > 0 && (
                      <div className="onboarding-tier-section">
                        <h2 className="onboarding-section-header">High priority</h2>
                        <div className="onboarding-panel-chips">
                          {biomarkerTiers.high.map((marker) => (
                            <span key={marker} className="onboarding-panel-chip">{titleCase(marker)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {biomarkerTiers.moderate.length > 0 && (
                      <div className="onboarding-tier-section">
                        <h2 className="onboarding-section-header">Moderate priority</h2>
                        <div className="onboarding-panel-chips">
                          {biomarkerTiers.moderate.map((marker) => (
                            <span key={marker} className="onboarding-panel-chip">{titleCase(marker)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {biomarkerTiers.optional.length > 0 && (
                      <div className="onboarding-tier-section">
                        <h2 className="onboarding-section-header">Optional</h2>
                        <div className="onboarding-panel-chips">
                          {biomarkerTiers.optional.map((marker) => (
                            <span key={marker} className="onboarding-panel-chip">{titleCase(marker)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="onboarding-adaptive-response">{recommendedMarkers.length} biomarkers</p>
                )}
                <div className="onboarding-button-row">
                  <button type="button" className="onboarding-primary-btn" onClick={handleUseRecommended}>
                    Use Recommended Panel <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                  </button>
                  <button type="button" className="onboarding-secondary-btn" onClick={() => setCurrentStep(STEP_HAVE_LABS)}>
                    Customize Panel
                  </button>
                </div>
              </div>
            )}
            <h2 className="onboarding-section-header onboarding-section-header--divider">Customize your panel</h2>
            <p className="onboarding-customize-label">Select or deselect from the core set:</p>
            <div className="onboarding-panel-toggles">
              {CLARION_RECOMMENDED_PANEL_KEYS.filter((marker) => biomarkerKeys.includes(marker)).map((marker) => {
                const isSelected = activePanel.includes(marker)
                return (
                  <button key={marker} type="button" className={`onboarding-panel-toggle ${isSelected ? "selected" : ""}`} onClick={() => togglePanelMarker(marker)}>
                    {titleCase(marker)}
                  </button>
                )
              })}
            </div>
            {activePanel.length > 0 && <div className="onboarding-customize-hint">Selected: {activePanel.map(titleCase).join(", ")}</div>}
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(STEP_HAVE_LABS)} style={{ marginTop: 16 }}>
              Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_HAVE_LABS && (
          <motion.section
            key="have-labs"
            className="onboarding-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <TypewriterHeading className="onboarding-headline">Do you already have lab results?</TypewriterHeading>
            <p className="onboarding-subtext">If you have recent bloodwork, enter your values. If not, we’ll point you to the right tests.</p>
            <div className="onboarding-option-cards-two" role="group" aria-label="Lab results">
              <motion.button
                type="button"
                className={`onboarding-option-card onboarding-answer-card ${hasLabResults === true ? "selected" : ""}`}
                onClick={() => {
                  setHasLabResults(true)
                  setCurrentStep(STEP_LABS)
                }}
                aria-pressed={hasLabResults === true}
              >
                {hasLabResults === true && (
                  <span className="onboarding-answer-card-check" aria-hidden><Check size={18} strokeWidth={2.5} /></span>
                )}
                <span className="onboarding-answer-card-icon" aria-hidden><CheckCircle2 size={CARD_ICON_SIZE} strokeWidth={1.5} /></span>
                <span className="onboarding-answer-card-title">Yes, I already have results</span>
                <span className="onboarding-answer-card-desc">Enter your values and get your personalized analysis.</span>
              </motion.button>
              <motion.button
                type="button"
                className={`onboarding-option-card onboarding-answer-card ${hasLabResults === false ? "selected" : ""}`}
                onClick={() => {
                  setHasLabResults(false)
                  if (goToBloodTestStep) goToBloodTestStep()
                  else setCurrentStep(STEP_BLOOD_TEST)
                }}
                aria-pressed={hasLabResults === false}
              >
                {hasLabResults === false && (
                  <span className="onboarding-answer-card-check" aria-hidden><Check size={18} strokeWidth={2.5} /></span>
                )}
                <span className="onboarding-answer-card-icon" aria-hidden><Droplet size={CARD_ICON_SIZE} strokeWidth={1.5} /></span>
                <span className="onboarding-answer-card-title">No, help me get the right test</span>
                <span className="onboarding-answer-card-desc">We’ll point you to the right panels and providers.</span>
              </motion.button>
            </div>
          </motion.section>
        )}

        {currentStep === STEP_LABS && (
          <motion.section
            key="labs"
            className="onboarding-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <TypewriterHeading className="onboarding-headline">Enter your lab results</TypewriterHeading>
            <p className="onboarding-subtext">Enter values for each biomarker so we can build your personalized plan. Your target range appears after you enter a value.</p>
            <div className="onboarding-lab-inputs">
              {activePanel.map((key) => {
                const hasValue = inputs[key] !== undefined && inputs[key] !== "" && String(inputs[key]).trim() !== ""
                const displayRange = getDisplayRange(key, profile)
                return (
                  <div key={key} className="onboarding-lab-card">
                    <label>
                      <span className="onboarding-lab-label">{titleCase(key)}</span>
                      {displayRange && (
                        <span className="onboarding-lab-range">
                          Target for you: {displayRange.optimalMin}–{displayRange.optimalMax}
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={String(inputs[key] ?? "")} onChange={(e) => handleInputChange(key, e.target.value)} placeholder={getInputPlaceholder(key)} />
                  </div>
                )
              })}
            </div>
            <button type="button" className="onboarding-secondary-btn" onClick={loadExampleData}>Load example panel</button>
            <button type="button" className="onboarding-primary-btn" onClick={handleAnalyze} disabled={!hasEnoughLabsFlag}>Analyze <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></button>
          </motion.section>
        )}

        {currentStep === STEP_BLOOD_TEST && (
          <motion.section
            key="blood-test"
            className="onboarding-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <TypewriterHeading className="onboarding-headline">Get the right bloodwork</TypewriterHeading>
            <p className="onboarding-subtext">We recommend the biomarkers that matter most for your profile. You can request these through your doctor or order online.</p>
            <div className="onboarding-blood-test-options">
              <div className="onboarding-blood-test-card">
                <span className="onboarding-blood-test-card-icon" aria-hidden><FileText size={40} strokeWidth={1.5} /></span>
                <h3 className="onboarding-blood-test-card-title">Use your doctor</h3>
                <p className="onboarding-blood-test-card-desc">Ask your doctor to order the same biomarkers we recommend. Take your panel list with you.</p>
                <p className="onboarding-blood-test-panel-hint">Your recommended panel: {activePanel.map(titleCase).join(", ")}</p>
              </div>
              <div className="onboarding-blood-test-card">
                <span className="onboarding-blood-test-card-icon" aria-hidden><FlaskConical size={40} strokeWidth={1.5} /></span>
                <h3 className="onboarding-blood-test-card-title">Order online</h3>
                <p className="onboarding-blood-test-card-desc">Each option below fits a different goal (lowest cost, most tests, fastest turnaround, or affiliate). Clarion does not run labs; we help you interpret results.</p>
                <div className="onboarding-blood-test-providers">
                  {BLOOD_TEST_PROVIDERS.map((provider) => (
                    <div key={provider.id} className="onboarding-blood-test-provider">
                      {provider.badge && <span className="onboarding-blood-test-badge">{provider.badge}</span>}
                      <strong>{provider.name}</strong>
                      <p>{provider.description}</p>
                      <p className="onboarding-blood-test-meta">{provider.biomarkersIncluded} · {provider.priceDisplay}</p>
                      <a href={resolveBloodTestCtaUrl(provider)} target="_blank" rel="noreferrer noopener" className="onboarding-primary-btn onboarding-cta-link">{provider.ctaLabel} <ChevronRight size={16} strokeWidth={2.5} aria-hidden /></a>
                      {provider.affiliateDisclosure && (
                        <p className="onboarding-blood-test-affiliate-disclosure">{provider.affiliateDisclosure}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="onboarding-primary-btn"
              onClick={() => {
                setHasLabResults(true)
                if (goToLabsStep) goToLabsStep()
                else setCurrentStep(STEP_LABS)
              }}
              style={{ marginTop: 24 }}
            >
              Continue — I’ll enter my results <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </motion.section>
        )}

        {currentStep === STEP_ANALYSIS && analyzing && (
          <motion.section
            key="analysis"
            className="onboarding-screen onboarding-screen-center onboarding-screen-analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <div className="onboarding-analysis-loader" role="status" aria-live="polite" aria-label="Analyzing your biomarkers">
              <div className="onboarding-analysis-dots">
                <span /><span /><span />
              </div>
              <p className="onboarding-analysis-message">Please wait — {ANALYSIS_MESSAGES[analysisMessageIndex].toLowerCase()}…</p>
              <div className="onboarding-analysis-progress-wrap">
                <div className="onboarding-analysis-progress" />
              </div>
            </div>
          </motion.section>
        )}

        {currentStep === STEP_SCORE && (
          <motion.section
            key="score"
            className="onboarding-screen onboarding-screen-score onboarding-results-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <div className={userId && !hasPaidAnalysis ? "onboarding-results-blur" : ""}>
            <TypewriterHeading className="onboarding-headline onboarding-score-title">Your Health Score</TypewriterHeading>
            <p className="onboarding-score-subline">Several biomarkers may be outside optimal ranges.</p>
            {profile.profileType && (
              <p className="onboarding-adaptive-response">Tailored to your {profile.profileType.replace(/_/g, " ").toLowerCase()} goals</p>
            )}
            {(() => {
              const topImprove = (analysisResults as any[]).filter((r: any) => r.status === "suboptimal" || r.status === "deficient").slice(0, 5)
              if (topImprove.length === 0) return null
              return (
                <div className="onboarding-score-priority-card">
                  <p className="onboarding-score-priority-intro">Main areas to improve</p>
                  <ol className="onboarding-score-priority-list">
                    {topImprove.map((r: any, i: number) => (
                      <li key={i}>
                        <span className="onboarding-score-priority-num" aria-hidden>{i + 1}</span>
                        <span className="onboarding-score-priority-name">{r.name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })()}
            <div className="onboarding-score-gauge-wrap">
              <svg viewBox="0 0 120 120" className="onboarding-score-gauge-svg">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" opacity="0.15" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(displayedScore / 100) * 327} 327`} strokeDashoffset="0" transform="rotate(-90 60 60)" className="onboarding-score-gauge-fill" />
              </svg>
              <div className="onboarding-score-circle">
                <span className="onboarding-score-value">{displayedScore}</span>
                <span className="onboarding-score-max">/ 100</span>
              </div>
            </div>
            <p className="onboarding-score-label">{scoreToLabel(score)}</p>
            <div className="onboarding-score-categories">
              <div className="onboarding-score-cat"><span>Optimal</span><strong>{statusCounts.optimal}</strong></div>
              <div className="onboarding-score-cat"><span>Borderline</span><strong>{statusCounts.borderline}</strong></div>
              <div className="onboarding-score-cat"><span>Flagged</span><strong>{statusCounts.flagged}</strong></div>
            </div>
            {(() => {
              const needsWork = (analysisResults as any[]).filter((r: any) => r.status === "suboptimal" || r.status === "deficient").slice(0, 3)
              const names = needsWork.map((r: any) => r.name).filter(Boolean)
              const estPoints = Math.min(25, (statusCounts.borderline + statusCounts.flagged) * 6)
              if (names.length > 0 && estPoints > 0) {
                return (
                  <p className="onboarding-score-upside">
                    Improving {names.join(", ")} could raise your score by an estimated {estPoints}+ points.
                  </p>
                )
              }
              return null
            })()}
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></button>
            </div>
            {userId && !hasPaidAnalysis && (
              <div className="onboarding-results-lock-overlay">
                <div className="onboarding-results-lock-card">
                  <Lock size={40} strokeWidth={1.5} className="onboarding-results-lock-icon" />
                  <p className="onboarding-results-lock-title">Your personalized analysis is ready</p>
                  <p className="onboarding-results-lock-text">Get your full plan with a one-time purchase. You’re close — Complete once to see your results, recommendations, and savings.</p>
                  <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta" aria-label="Get my results">Get my results <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {currentStep === STEP_ACTION_PREVIEW && (
          <motion.section
            key="action-preview"
            className="onboarding-screen onboarding-results-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <div className={userId && !hasPaidAnalysis ? "onboarding-results-blur" : ""}>
            <TypewriterHeading className="onboarding-headline">Your Action Plan includes</TypewriterHeading>
            <ul className="onboarding-action-plan-list">
              <li>Personalized biomarker ranges</li>
              <li>Supplement recommendations</li>
              <li>Food strategies</li>
              <li>Lifestyle interventions</li>
              <li>Cost optimization</li>
            </ul>
            {estimatedSavingsVsCurrent > 0 && (
              <div className="onboarding-summary-savings-card">
                <h3 className="onboarding-summary-savings-title">Potential monthly savings</h3>
                <p className="onboarding-summary-savings-monthly">${Math.round(estimatedSavingsVsCurrent)}</p>
              </div>
            )}
            <div className="onboarding-next-actions">
              {hasPaidAnalysis && onGoToDashboard ? (
                <button type="button" className="onboarding-next-btn onboarding-next-btn-primary onboarding-primary-btn" onClick={onGoToDashboard}>
                  Go to Dashboard <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </button>
              ) : hasPaidAnalysis ? (
                <Link href="/dashboard" className="onboarding-next-btn onboarding-next-btn-primary onboarding-primary-btn">Go to Dashboard <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
              ) : (
                <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta onboarding-next-btn onboarding-next-btn-primary">
                  Unlock My Health Plan <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </Link>
              )}
            </div>
            </div>
            {userId && !hasPaidAnalysis && (
              <div className="onboarding-results-lock-overlay">
                <div className="onboarding-results-lock-card">
                  <Lock size={40} strokeWidth={1.5} className="onboarding-results-lock-icon" />
                  <p className="onboarding-results-lock-title">Unlock Your Full Health Plan</p>
                  <p className="onboarding-results-lock-text">Full biomarker analysis, personalized supplement protocol, evidence-based lifestyle recommendations, and ongoing biomarker tracking.</p>
                  <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta" aria-label="Unlock My Health Plan">Unlock My Health Plan <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {currentStep === STEP_INSIGHTS && (
          <motion.section
            key="insights"
            className="onboarding-screen onboarding-results-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            {(resultsView === "insights" || resultsView === "stack") && (
              <p className="onboarding-results-back-wrap">
                <Link href="/dashboard" className="onboarding-results-back">← Back to dashboard</Link>
              </p>
            )}
            <div className={userId && !hasPaidAnalysis ? "onboarding-results-blur" : ""}>
            <TypewriterHeading className="onboarding-headline">Understanding your results</TypewriterHeading>
            <p className="onboarding-subtext">
              What your results mean, why they matter for you, and what to do next.
              {profile.improvementPreference && (
                <span className="onboarding-preference-note"> Recommendations are tailored to your {profile.improvementPreference.toLowerCase()} approach.</span>
              )}
            </p>
            <div className="onboarding-insights-list">
              {analysisResults.map((item: any, idx: number) => {
                const marker = String(item.name || item.marker || "")
                const tone = getStatusTone(item.status)
                const optimalRange = item.optimalMin != null && item.optimalMax != null ? `${item.optimalMin}–${item.optimalMax}` : null
                const whyForYou = getMarkerReason(marker, profile)
                const guidesForMarker = getGuidesForBiomarker(marker)
                const guide = guidesForMarker[0]
                return (
                  <div key={marker + idx} className="onboarding-insight-card">
                    <div className="onboarding-insight-header">
                      <strong>{marker}</strong>
                      <span className={`onboarding-status-badge ${tone.className}`}>{tone.label}</span>
                    </div>
                    <p className="onboarding-insight-value">{item.value ?? "—"} {item.unit || ""}{optimalRange ? <span className="onboarding-insight-optimal"> · Optimal for you: {optimalRange}</span> : null}</p>
                    <p className="onboarding-insight-desc"><strong>What this means for you:</strong> {item.description || inferWhyItMatters(marker)}</p>
                    <p className="onboarding-insight-why">{whyForYou}</p>
                    <p className="onboarding-insight-action"><strong>Recommended next steps:</strong> {item.supplementNotes || inferNextStep(marker, item.status)}</p>
                    {item.retest && <p className="onboarding-insight-retest">Retest: {item.retest}</p>}
                    {guide && (
                      <p className="onboarding-insight-guide">
                        <Link href={`/guides/${guide.slug}`} className="onboarding-guide-link">
                          See our {guide.title} guide →
                        </Link>
                      </p>
                    )}
                    {PAID_PROTOCOLS.some((p) => p.biomarkerKey && marker.toLowerCase().includes(p.biomarkerKey.toLowerCase())) && (
                      <p className="onboarding-insight-guide">
                        <Link href={`/protocols/${PAID_PROTOCOLS.find((p) => p.biomarkerKey && marker.toLowerCase().includes(p.biomarkerKey.toLowerCase()))?.slug ?? "iron"}`} className="onboarding-guide-link">
                          Full protocol (paid) →
                        </Link>
                      </p>
                    )}
                    <button type="button" className="onboarding-ghost-btn" onClick={() => toggleScience(marker)}>
                      {openScienceMarkers[marker] ? "Hide evidence" : "Evidence"}
                    </button>
                    {openScienceMarkers[marker] && (
                      <div className="onboarding-science-drawer">
                        <p className="onboarding-evidence-disclaimer">For education only. Not medical advice. Discuss with your provider.</p>
                        {item.researchSummary && <p>{item.researchSummary}</p>}
                        {item.whyItMatters && <p>{item.whyItMatters}</p>}
                        {getEvidenceForBiomarker(marker).length > 0 && (
                          <ul className="onboarding-evidence-list">
                            {getEvidenceForBiomarker(marker).map((e, i) => (
                              <li key={i}>
                                <a href={e.url} target="_blank" rel="noreferrer noopener" className="onboarding-evidence-link">{e.title}</a>
                                <span className="onboarding-evidence-source"> — {e.source}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></button>
            </div>
            {userId && !hasPaidAnalysis && (
              <div className="onboarding-results-lock-overlay">
                <div className="onboarding-results-lock-card">
                  <Lock size={40} strokeWidth={1.5} className="onboarding-results-lock-icon" />
                  <p className="onboarding-results-lock-title">Your personalized analysis is ready</p>
                  <p className="onboarding-results-lock-text">Get your full plan with a one-time purchase. You’re close — Complete once to see your results, recommendations, and savings.</p>
                  <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta" aria-label="Get my results">Get my results <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {currentStep === STEP_STACK && (
          <motion.section
            key="stack"
            className="onboarding-screen onboarding-results-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            {(resultsView === "insights" || resultsView === "stack") && (
              <p className="onboarding-results-back-wrap">
                <Link href="/dashboard" className="onboarding-results-back">← Back to dashboard</Link>
              </p>
            )}
            <div className={userId && !hasPaidAnalysis ? "onboarding-results-blur" : ""}>
            <TypewriterHeading className="onboarding-headline">Your recommended plan</TypewriterHeading>
            <p className="onboarding-subtext">A plan built from your biomarkers, goals, and how you prefer to improve — {profile.improvementPreference === "Diet" ? "diet-first" : profile.improvementPreference === "Lifestyle" ? "lifestyle-first" : profile.improvementPreference === "Combination" ? "supplements, diet, and lifestyle" : "supplements"}.</p>
            <p className="onboarding-stack-disclaimer">Discuss supplements and doses with your clinician.</p>
            {profile.improvementPreference && profile.improvementPreference !== "Supplements" && (() => {
              const needsWork = (analysisResults as any[]).filter((r: any) => (r.status === "suboptimal" || r.status === "deficient") && r.name)
              const showDiet = profile.improvementPreference === "Diet" || profile.improvementPreference === "Combination"
              const showLifestyle = profile.improvementPreference === "Lifestyle" || profile.improvementPreference === "Combination"
              const dietMarkers = showDiet ? needsWork.filter((r: any) => biomarkerDatabase[r.name]?.foods) : []
              const lifestyleMarkers = showLifestyle ? needsWork.filter((r: any) => biomarkerDatabase[r.name]?.lifestyle) : []
              if (dietMarkers.length === 0 && lifestyleMarkers.length === 0) return null
              return (
                <div className="onboarding-protocol-diet-lifestyle">
                  {dietMarkers.length > 0 && (
                    <div className="onboarding-protocol-block">
                      <h3 className="onboarding-protocol-block-title">Diet</h3>
                      {dietMarkers.map((r: any) => {
                        const entry = biomarkerDatabase[r.name]
                        return entry?.foods ? (
                          <div key={r.name} className="onboarding-protocol-item">
                            <strong>{r.name}</strong>
                            <p>{entry.foods}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                  {lifestyleMarkers.length > 0 && (
                    <div className="onboarding-protocol-block">
                      <h3 className="onboarding-protocol-block-title">Lifestyle</h3>
                      {lifestyleMarkers.map((r: any) => {
                        const entry = biomarkerDatabase[r.name]
                        return entry?.lifestyle ? (
                          <div key={r.name} className="onboarding-protocol-item">
                            <strong>{r.name}</strong>
                            <p>{entry.lifestyle}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
            {!hasSupplements ? (
              <p className="onboarding-muted">No supplement recommendations from your current results.</p>
            ) : (
              <>
                {(profile.improvementPreference === "Diet" || profile.improvementPreference === "Lifestyle") && (
                  <p className="onboarding-protocol-optional">Optional supplement support:</p>
                )}
                {(() => {
                  const compared = compareStackToCurrentSupplements(currentSupplements, optimizedStack.stack)
                  const unnecessary = getUnnecessaryCurrentSupplements(currentSupplements, optimizedStack.stack)
                  return (
                    <>
                      {unnecessary.length > 0 && (
                        <p className="onboarding-stack-unnecessary">You&apos;re currently taking {unnecessary.join(", ")}; based on your biomarkers they&apos;re not a current priority. You can keep taking them or pause and retest later.</p>
                      )}
                      <div className="onboarding-stack-list">
                        {compared.map((rec: any, idx: number) => {
                          const best = rec.bestOverall ?? rec.bestValue
                          const key = `${rec.supplementKey}-${idx}`
                          const leaderboard = rec.leaderboard || []
                          const premium = leaderboard.length > 1 ? leaderboard[1] : null
                          return (
                            <div key={key} className="onboarding-stack-card">
                              <div className="onboarding-stack-card-top">
                                <div>
                                  <strong>{rec.name}</strong>
                                  <span className="onboarding-stack-dose">{rec.dose}</span>
                                </div>
                                <span className="onboarding-stack-price">${Number(rec.estimatedMonthlyCost || 0).toFixed(2)}/mo</span>
                              </div>
                              <p className={`onboarding-stack-status onboarding-stack-status-${rec.status}`}>{rec.statusMessage}</p>
                        <p className="onboarding-stack-why">Included because: {rec.whyThisIsRecommended ?? rec.whyRecommended ?? "Supports your biomarker goals."}</p>
                        {(() => {
                          const stackItem = { supplementName: rec.name, dose: rec.dose ?? "", monthlyCost: Number(rec.estimatedMonthlyCost || 0), recommendationType: "", reason: "", marker: rec.marker }
                          const affiliate = getAffiliateProductForStackItem(stackItem)
                          const reorderUrl = affiliate?.affiliateUrl ?? getAmazonSearchUrl(rec.name)
                          return (
                            <div className="onboarding-stack-recommended-pick">
                              <span className="onboarding-stack-pick-label">Recommended pick</span>
                              <div className="onboarding-stack-recommended-card">
                                {affiliate?.imageUrl && (
                                  <img src={affiliate.imageUrl} alt="" className="onboarding-stack-recommended-img" width={80} height={80} />
                                )}
                                {!affiliate?.imageUrl && (
                                  <div className="onboarding-stack-recommended-img onboarding-stack-recommended-img-placeholder" aria-hidden />
                                )}
                                <div className="onboarding-stack-recommended-info">
                                  <strong className="onboarding-stack-recommended-title">{affiliate?.title ?? best?.productName ?? rec.name}</strong>
                                  <a href={reorderUrl} target="_blank" rel="noopener noreferrer" className="onboarding-link-btn onboarding-stack-recommended-btn">
                                    {affiliate ? "Buy on Amazon" : "View on Amazon"}
                                  </a>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                        {rec.formNote && <p className="onboarding-stack-form-note">{rec.formNote}</p>}
                        {(() => {
                          const detail = getSupplementDetail(rec.marker, rec.name)
                          if (!detail || (!detail.timing && !detail.avoid)) return null
                          return (
                            <div className="onboarding-stack-detail">
                              {detail.timing && <p className="onboarding-stack-timing">When: {detail.timing}</p>}
                              {detail.avoid && <p className="onboarding-stack-avoid">Avoid: {detail.avoid}</p>}
                            </div>
                          )
                        })()}
                        {(best || premium) && (
                          <div className="onboarding-stack-other-options">
                            <span className="onboarding-stack-other-options-label">Other options</span>
                            {best && (
                              <div className="onboarding-stack-pick">
                                <span className="onboarding-stack-pick-label">Best value</span>
                                <span>{best.productName}</span>
                                {best.pricePerServing != null && <span className="onboarding-stack-per-serve">${Number(best.pricePerServing).toFixed(2)}/serving</span>}
                                {best.url && (
                                  <a href={best.url} target="_blank" rel="noreferrer noopener" className="onboarding-link-btn onboarding-link-btn-small">Buy on Amazon</a>
                                )}
                              </div>
                            )}
                            {premium && (
                              <div className="onboarding-stack-pick onboarding-stack-pick-premium">
                                <span className="onboarding-stack-pick-label">Premium pick</span>
                                <span>{premium.productName}</span>
                                {premium.url && (
                                  <a href={premium.url} target="_blank" rel="noreferrer noopener" className="onboarding-link-btn onboarding-link-btn-small">Buy on Amazon</a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <button type="button" className="onboarding-ghost-btn" onClick={() => toggleCompare(key)}>
                          {openCompareCards[key] ? "Hide compare" : "Compare all options"}
                        </button>
                        {openCompareCards[key] && leaderboard.length > 0 && (
                          <ul className="onboarding-stack-compare">
                            {leaderboard.slice(0, 5).map((item: any) => (
                              <li key={item.id}>{item.productName} — ${Number(item.price || 0).toFixed(2)}/mo</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
                </>
                  )
                })()}
                <div className="onboarding-stack-summary">
                  <p><span>Current spend:</span> <strong>${userCurrentSpend.toFixed(2)}/month</strong></p>
                  <p><span>Clarion optimized stack:</span> <strong>${optimizedSpend.toFixed(2)}/month</strong></p>
                  <p className="onboarding-stack-savings"><span>Monthly savings:</span> <strong>${estimatedSavingsVsCurrent.toFixed(2)}</strong></p>
                  <p className="onboarding-stack-annual"><span>Annual savings:</span> <strong>${annualSavings.toFixed(0)}</strong></p>
                </div>
                <div className="onboarding-what-to-expect">
                  <h3 className="onboarding-what-to-expect-title">What to expect</h3>
                  <p>Iron support may take several weeks to materially change ferritin. Vitamin D is usually reassessed after 8–12 weeks. Magnesium may affect sleep, recovery, or muscle function sooner.</p>
                </div>
                {hasActiveSubscription ? (
                  <motion.div
                    className="onboarding-welcome-clarion"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <div className="onboarding-welcome-clarion-badge">✓</div>
                    <h3 className="onboarding-welcome-clarion-title">Welcome to Clarion+</h3>
                    <p className="onboarding-welcome-clarion-desc">You have full access to tracking, history, retest reminders, and smarter recommendations.</p>
                  </motion.div>
                ) : (
                  <div className="onboarding-why-subscribe">
                    <h3 className="onboarding-why-subscribe-title">Why stay with Clarion+</h3>
                    <ul>
                      <li>Track your biomarker history</li>
                      <li>See whether your score improves</li>
                      <li>Get retest reminders</li>
                      <li>Update your protocol when labs change</li>
                      <li>Compare future results against baseline</li>
                      <li>Keep supplement costs optimized over time</li>
                    </ul>
                    <SubscribeButton className="onboarding-primary-btn onboarding-cta-subscribe">Unlock ongoing tracking</SubscribeButton>
                  </div>
                )}
                {/* Curated affiliate product picks — close to protocol */}
                {(() => {
                  const biomarkersInStack = [...new Set(optimizedStack.stack.map((r: any) => r.marker || r.name).filter(Boolean))]
                  const affiliateProducts = biomarkersInStack.flatMap((b) => getAffiliateProductsForBiomarker(b, ["cheapest", "premium", "overall_winner"]))
                  if (affiliateProducts.length === 0) return null
                  return (
                    <div className="onboarding-affiliate-section">
                      <h3 className="onboarding-affiliate-title">Curated product picks</h3>
                      <div className="onboarding-affiliate-grid">
                        {affiliateProducts.slice(0, 6).map((p) => (
                          <div key={p.id} className="onboarding-affiliate-card">
                            {p.imageUrl && (
                              <div className="onboarding-affiliate-card-image-wrap">
                                <img src={p.imageUrl} alt="" className="onboarding-affiliate-card-image" />
                              </div>
                            )}
                            <span className={`onboarding-affiliate-badge ${p.optionType}`}>{p.subtitle || (p.optionType === "overall_winner" ? "Overall winner" : p.optionType === "cheapest" ? "Cheapest" : "Premium")}</span>
                            <strong className="onboarding-affiliate-card-title">{p.title}</strong>
                            <p className="onboarding-affiliate-why">{p.whyRecommended}</p>
                            {p.monthlyCostEstimate != null && <span className="onboarding-affiliate-cost">~${p.monthlyCostEstimate}/mo</span>}
                            <a href={p.affiliateUrl} target="_blank" rel="noreferrer noopener" className="onboarding-affiliate-btn">Buy on Amazon</a>
                          </div>
                        ))}
                      </div>
                      <p className="onboarding-affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
                    </div>
                  )
                })()}
              </>
            )}
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></button>
            </div>
            {userId && !hasPaidAnalysis && (
              <div className="onboarding-results-lock-overlay">
                <div className="onboarding-results-lock-card">
                  <Lock size={40} strokeWidth={1.5} className="onboarding-results-lock-icon" />
                  <p className="onboarding-results-lock-title">Your personalized analysis is ready</p>
                  <p className="onboarding-results-lock-text">Get your full plan with a one-time purchase. You’re close — Complete once to see your results, recommendations, and savings.</p>
                  <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta" aria-label="Get my results">Get my results <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {currentStep === STEP_SUMMARY && (
          <motion.section
            key="next"
            className="onboarding-screen onboarding-results-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <div className={userId && !hasPaidAnalysis ? "onboarding-results-blur" : ""}>
            <TypewriterHeading className="onboarding-headline">You're all set</TypewriterHeading>
            <p className="onboarding-subtext">Your Clarion Health Score: <strong>{score}</strong> / 100. Follow your protocol, retest in 8–12 weeks, and track progress in your dashboard.</p>
            <div className="onboarding-summary-score-block">
              <div className="onboarding-summary-score-ring">
                <span className="onboarding-summary-score-num">{score}</span>
                <span className="onboarding-summary-score-max">/ 100</span>
              </div>
            </div>
            {estimatedSavingsVsCurrent > 0 && (
              <div className="onboarding-summary-savings-card">
                <h3 className="onboarding-summary-savings-title">Estimated savings</h3>
                <p className="onboarding-summary-savings-monthly">${estimatedSavingsVsCurrent.toFixed(0)} / month</p>
                <p className="onboarding-summary-savings-annual">${annualSavings.toFixed(0)} / year</p>
              </div>
            )}
            <p className="onboarding-summary-retest">Recommended retest: 8–12 weeks for key biomarkers.</p>
            <p className="onboarding-summary-dashboard-hint">Your dashboard is where you&apos;ll track your protocol, see trends, and get retest reminders.</p>
            <div className="onboarding-next-actions">
              {onGoToDashboard && (
                <button type="button" className="onboarding-next-btn onboarding-next-btn-primary onboarding-primary-btn" onClick={onGoToDashboard}>
                  Go to Dashboard <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </button>
              )}
              {!onGoToDashboard && <Link href="/dashboard" className="onboarding-next-btn onboarding-next-btn-primary onboarding-primary-btn">Go to Dashboard <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>}
              <button type="button" className="onboarding-next-btn onboarding-next-btn-secondary" onClick={() => setCurrentStep(STEP_STACK)}>Back to stack</button>
              {hasActiveSubscription ? (
                <span className="onboarding-next-badge">You&apos;re a Clarion+ member</span>
              ) : (
                <span className="onboarding-next-clarion-link"><SubscribeButton className="onboarding-ghost-btn">Clarion+ — full history &amp; retest reminders</SubscribeButton></span>
              )}
            </div>
            <p className="onboarding-next-footer">Your dashboard will show your score, top priorities, protocol tracker, and biomarker trends.</p>
            </div>
            {userId && !hasPaidAnalysis && (
              <div className="onboarding-results-lock-overlay">
                <div className="onboarding-results-lock-card">
                  <Lock size={40} strokeWidth={1.5} className="onboarding-results-lock-icon" />
                  <p className="onboarding-results-lock-title">Your personalized analysis is ready</p>
                  <p className="onboarding-results-lock-text">Get your full plan with a one-time purchase. You’re close — Complete once to see your results, recommendations, and savings.</p>
                  <Link href="/paywall" className="onboarding-primary-btn onboarding-results-lock-cta" aria-label="Get my results">Get my results <ChevronRight size={18} strokeWidth={2.5} aria-hidden /></Link>
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      </div>

      <style jsx>{`
        .onboarding-shell {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--color-bg);
          color: var(--color-text-primary);
          display: flex;
          flex-direction: column;
        }
        /* Landing: one continuous field — no “strip” header or side bands */
        .onboarding-shell.onboarding-shell-hero {
          background:
            radial-gradient(ellipse 120% 85% at 50% -18%, color-mix(in srgb, var(--color-accent) 22%, transparent), transparent 55%),
            radial-gradient(ellipse 70% 55% at 85% 35%, color-mix(in srgb, var(--color-accent) 11%, transparent), transparent 50%),
            radial-gradient(ellipse 65% 50% at 12% 55%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 48%),
            var(--color-bg);
          overflow-x: hidden;
        }
        [data-theme="light"] .onboarding-shell.onboarding-shell-hero {
          background:
            radial-gradient(ellipse 120% 85% at 50% -18%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 58%),
            radial-gradient(ellipse 70% 55% at 88% 32%, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 52%),
            var(--color-bg);
        }
        .onboarding-header {
          flex-shrink: 0;
          padding: 14px 20px 16px;
          border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 14%, var(--color-border));
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-surface-elevated) 96%, #0a1210) 0%,
            color-mix(in srgb, var(--color-bg) 35%, var(--color-surface-elevated)) 100%
          );
          backdrop-filter: blur(16px) saturate(1.15);
          -webkit-backdrop-filter: blur(16px) saturate(1.15);
          box-shadow:
            0 1px 0 color-mix(in srgb, #fff 5%, transparent) inset,
            0 8px 28px rgba(0, 0, 0, 0.22);
        }
        .onboarding-header--hero {
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--color-bg) 55%, transparent) 0%,
            transparent 72%
          );
          border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
          box-shadow:
            0 1px 0 color-mix(in srgb, #fff 7%, transparent) inset,
            0 12px 40px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(18px) saturate(1.2);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
          padding: 16px clamp(20px, 4vw, 48px) 18px;
        }
        [data-theme="light"] .onboarding-header {
          background: linear-gradient(180deg, var(--color-surface-elevated) 0%, color-mix(in srgb, var(--color-bg) 40%, white) 100%);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 6px 20px rgba(0, 0, 0, 0.06);
        }
        [data-theme="light"] .onboarding-header--hero {
          background: linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 88%, white) 0%, transparent 85%);
          border-bottom-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-border));
        }
        .onboarding-header-inner {
          max-width: 640px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
        }
        .onboarding-header-inner > :nth-child(1) {
          justify-self: start;
        }
        .onboarding-header-inner > :nth-child(2) {
          justify-self: center;
        }
        .onboarding-header-inner > :nth-child(3) {
          justify-self: end;
        }
        .onboarding-header--hero .onboarding-header-inner {
          max-width: min(1200px, 100%);
          width: 100%;
        }
        .onboarding-header-spacer { width: 40px; min-height: 1px; }
        .onboarding-back {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .onboarding-back:hover { color: var(--color-text-primary); }
        .onboarding-header-actions { display: flex; align-items: center; gap: 10px; }
        .onboarding-header-theme-toggle { flex-shrink: 0; }
        .onboarding-header-btn {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-decoration: none;
          padding: 10px 18px;
          border-radius: var(--clarion-radius-md);
          transition: background 0.2s, color 0.2s;
        }
        .onboarding-header-btn:hover { background: var(--color-surface-elevated); color: var(--color-text-primary); }
        .onboarding-progress-wrap {
          max-width: 820px;
          margin: 0 auto;
          padding: var(--space-16) var(--space-32) 0;
        }
        .onboarding-progress-label {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: var(--space-8);
        }
        .onboarding-journey-text {
          font-size: 11px;
          color: var(--color-text-muted);
          margin: 0 0 var(--space-8);
          letter-spacing: 0.04em;
        }
        .onboarding-progress-bar {
          height: 8px;
          background: var(--color-surface);
          border-radius: var(--clarion-radius-pill, 9999px);
          overflow: hidden;
        }
        .onboarding-progress-fill {
          height: 100%;
          background: var(--color-accent);
          border-radius: var(--clarion-radius-pill, 9999px);
          transition: width 0.35s ease-out;
        }
        .onboarding-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          max-width: 820px;
          margin: 0 auto;
          padding: 48px 32px 72px;
          width: 100%;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .onboarding-container-centered {
          justify-content: center;
        }
        .onboarding-container-hero {
          align-items: center;
          justify-content: center;
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: none;
          margin: 0 auto;
          padding: clamp(12px, 2.5vh, 28px) clamp(20px, 4vw, 48px) clamp(32px, 5vh, 56px);
          box-sizing: border-box;
          background: transparent;
        }
        .onboarding-screen {
          padding: 0;
          width: 100%;
        }
        .onboarding-screen-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .onboarding-screen { padding-top: var(--space-72); }
        .onboarding-screen.onboarding-screen-center,
        .onboarding-hero-content,
        .onboarding-screen.onboarding-hero-layout {
          padding-top: 0;
        }
        .onboarding-next-fallback { margin-top: 32px; }
        .onboarding-headline {
          font-family: var(--font-heading), Georgia, serif;
          font-size: 56px;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.08;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-24);
        }
        @media (max-width: 640px) {
          .onboarding-headline { font-size: clamp(32px, 10vw, 44px); }
        }
        .onboarding-subtext {
          font-size: 18px;
          font-weight: 400;
          line-height: 1.6;
          margin: 0 0 var(--space-32);
          max-width: 560px;
          color: rgba(255, 255, 255, 0.75);
        }
        [data-theme="light"] .onboarding-subtext { color: rgba(0, 0, 0, 0.65); }
        .onboarding-tagline { color: var(--color-accent) !important; font-weight: 600; margin-bottom: 12px !important; }
        [data-theme="light"] .onboarding-tagline { color: var(--color-accent) !important; }
        .onboarding-hero-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          min-height: min(calc(100dvh - 140px), 900px);
          position: relative;
          padding-top: clamp(8vh, 12vh, 18vh);
        }
        .onboarding-hero-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          position: relative;
          z-index: 1;
        }
        .onboarding-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(380px, 520px);
          gap: clamp(16px, 2.5vw, 2rem);
          align-items: stretch;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 901px) {
          .onboarding-hero-preview {
            margin-left: 0;
            align-self: stretch;
          }
        }
        @media (max-width: 900px) {
          .onboarding-hero-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .onboarding-hero-preview {
            max-width: min(440px, 100%);
            margin-left: auto;
            margin-right: auto;
            align-self: center;
          }
        }
        .onboarding-hero-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          width: 100%;
          max-width: 640px;
          align-self: center;
        }
        .onboarding-hero-quote {
          margin: 0;
          padding: 0;
          font-family: var(--font-heading), Georgia, "Times New Roman", serif;
          font-size: clamp(2.45rem, 6.5vw, 3.75rem);
          font-weight: 600;
          letter-spacing: -0.022em;
          line-height: 1.05;
          color: var(--color-text-primary);
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }
        .onboarding-hero-kicker {
          display: block;
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
          font-size: clamp(12px, 1.55vw, 13px);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--color-accent) 92%, #fff 8%);
          margin-bottom: 0.65rem;
          line-height: 1.3;
        }
        [data-theme="light"] .onboarding-hero-kicker {
          color: color-mix(in srgb, var(--color-accent) 88%, #0a3020 12%);
        }
        .onboarding-hero-quote-core {
          display: block;
        }
        .onboarding-hero-quote-core .onboarding-hero-quote-line {
          display: block;
          line-height: 1.05;
        }
        .onboarding-hero-quote-core .onboarding-hero-quote-line + .onboarding-hero-quote-line {
          margin-top: 0.06em;
        }
        .onboarding-hero-lede {
          margin: 0.85rem 0 1.35rem;
          max-width: 34rem;
        }
        .onboarding-hero-lede-line {
          margin: 0;
          font-family: var(--font-body), system-ui, -apple-system, sans-serif;
          font-size: clamp(15px, 2.1vw, 17px);
          font-weight: 500;
          line-height: 1.42;
          color: color-mix(in srgb, var(--color-text-primary) 88%, var(--color-text-muted) 12%);
        }
        .onboarding-hero-lede-line + .onboarding-hero-lede-line {
          margin-top: 0.35rem;
        }
        [data-theme="light"] .onboarding-hero-lede-line {
          color: rgba(0, 0, 0, 0.72);
        }
        .onboarding-hero-quote-line {
          display: block;
        }
        .onboarding-hero-quote-line + .onboarding-hero-quote-line {
          margin-top: 0.06em;
        }
        .onboarding-hero-quote-line--payoff {
          color: color-mix(in srgb, #9ee0b8 55%, var(--color-accent) 45%);
          font-weight: 700;
          letter-spacing: -0.02em;
          animation: hero-payoff-pulse 3.2s ease-in-out infinite;
        }
        [data-theme="light"] .onboarding-hero-quote-line--payoff {
          color: color-mix(in srgb, var(--color-accent) 58%, #0d4a36 42%);
          animation: hero-payoff-pulse-light 3.2s ease-in-out infinite;
        }
        @keyframes hero-payoff-pulse {
          0%,
          100% {
            text-shadow: 0 0 0 transparent;
            filter: brightness(1);
          }
          50% {
            text-shadow: 0 0 28px color-mix(in srgb, var(--color-accent) 55%, transparent);
            filter: brightness(1.08);
          }
        }
        @keyframes hero-payoff-pulse-light {
          0%,
          100% {
            text-shadow: 0 0 0 transparent;
          }
          50% {
            text-shadow: 0 0 20px color-mix(in srgb, var(--color-accent) 35%, transparent);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .onboarding-hero-quote-line--payoff {
            animation: none;
          }
        }
        .onboarding-hero-cta-block {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.55rem;
          padding: 16px 0 0;
          border-top: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
          margin-top: 0.15rem;
          width: 100%;
          max-width: 400px;
        }
        .onboarding-hero-cta {
          margin-top: 0;
        }
        .onboarding-hero-micro {
          font-size: 13px;
          line-height: 1.5;
          color: color-mix(in srgb, var(--color-text-primary) 84%, var(--color-text-muted) 16%);
          margin: 0;
          font-weight: 500;
        }
        .onboarding-hero-micro-sep {
          margin: 0 0.2em;
          opacity: 0.65;
        }
        .onboarding-hero-preview {
          position: relative;
          border-radius: 14px;
          padding: 1px;
          display: flex;
          flex-direction: column;
          min-height: min(520px, 58vh);
          transform: scale(1.08);
          transform-origin: top center;
          background: linear-gradient(
            155deg,
            color-mix(in srgb, var(--color-accent) 28%, transparent),
            color-mix(in srgb, var(--color-border) 50%, var(--color-accent) 22%)
          );
          box-shadow: 0 28px 56px rgba(0, 0, 0, 0.18),
            0 0 0 1px color-mix(in srgb, var(--color-accent) 14%, transparent);
        }
        @media (max-width: 900px) {
          .onboarding-hero-preview {
            transform: scale(1);
            min-height: auto;
          }
        }
        .onboarding-hero-preview-glow {
          position: absolute;
          inset: -28% -20% -10% -20%;
          border-radius: 50%;
          background: radial-gradient(
            ellipse at 50% 35%,
            color-mix(in srgb, var(--color-accent) 45%, transparent),
            color-mix(in srgb, var(--color-accent) 12%, transparent) 45%,
            transparent 70%
          );
          filter: blur(48px);
          opacity: 0.95;
          pointer-events: none;
          z-index: 0;
        }
        .onboarding-hero-preview-card {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          border-radius: 12px;
          overflow: hidden;
          background: color-mix(in srgb, var(--color-surface-elevated) 88%, var(--color-bg) 12%);
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        [data-theme="light"] .onboarding-hero-preview-card {
          background: color-mix(in srgb, #fff 97%, var(--color-surface-elevated) 3%);
        }
        .onboarding-hero-preview-stack {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 22px 20px 18px;
          gap: 0;
          min-height: 100%;
        }
        .onboarding-hero-preview-journey {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 10px;
          margin: 0 0 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--color-text-muted) 92%, var(--color-accent) 8%);
        }
        .onboarding-hero-preview-journey-arrow {
          color: color-mix(in srgb, var(--color-accent) 75%, var(--color-text-muted) 25%);
          font-weight: 500;
          letter-spacing: 0;
        }
        .onboarding-hero-preview-score-hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          padding-bottom: 20px;
          margin-bottom: 2px;
          border-bottom: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
        }
        .onboarding-hero-preview-score-hero .onboarding-hero-preview-score-num {
          font-family: var(--font-heading), Georgia, serif;
          font-size: 3.35rem;
          font-weight: 600;
          letter-spacing: -0.04em;
          color: var(--color-text-primary);
          line-height: 0.95;
        }
        .onboarding-hero-preview-score-word {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .onboarding-hero-preview-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-top: 18px;
          min-height: 0;
        }
        .onboarding-hero-preview-kv {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
        }
        .onboarding-hero-preview-kv:last-child {
          margin-bottom: 0;
        }
        .onboarding-hero-preview-kv--plan {
          flex-direction: row;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 4px;
          padding-top: 14px;
          margin-bottom: 0;
          border-top: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
        }
        .onboarding-hero-preview-k {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .onboarding-hero-preview-v {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.35;
          color: var(--color-text-primary);
        }
        .onboarding-hero-preview-savings {
          margin-top: auto;
          padding: 16px 14px;
          border-radius: 10px;
          background: linear-gradient(
            145deg,
            color-mix(in srgb, var(--color-accent) 22%, transparent),
            color-mix(in srgb, var(--color-accent) 8%, transparent)
          );
          border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
        }
        .onboarding-hero-preview-savings-main {
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .onboarding-hero-preview-savings-main strong {
          color: color-mix(in srgb, var(--color-accent) 90%, var(--color-text-primary) 10%);
          font-weight: 700;
        }
        .onboarding-hero-preview-savings-sub {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: color-mix(in srgb, var(--color-text-primary) 88%, var(--color-text-muted) 12%);
        }
        .onboarding-curiosity-hook {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-accent);
          margin: 20px 0 24px;
          font-style: italic;
        }
        .onboarding-mid-progress-markers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 12px;
          justify-content: center;
          margin: 24px 0 28px;
        }
        .onboarding-action-plan-list {
          list-style: none;
          margin: 0 0 24px;
          padding: 0;
          text-align: left;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }
        .onboarding-action-plan-list li {
          padding: 8px 0;
          padding-left: 24px;
          position: relative;
          font-size: 16px;
          color: var(--color-text-secondary);
        }
        .onboarding-action-plan-list li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: var(--color-success);
          font-weight: 700;
        }
        .onboarding-tier-section { margin-bottom: 16px; }
        .onboarding-subtext-secondary { font-size: 16px; margin-bottom: 16px; }
        .onboarding-adaptive-response {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 var(--space-24);
          padding: 18px var(--space-24);
          background: var(--color-accent-soft);
          border-radius: var(--clarion-card-radius, 14px);
          border: none;
          color: var(--color-text-secondary);
        }
        .onboarding-primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-8);
          min-height: 48px;
          padding: 14px 28px;
          background: #1F6F5B;
          color: #fff;
          border: none;
          font-size: 16px;
          font-weight: 500;
          border-radius: 10px;
          cursor: pointer;
          margin-top: var(--space-16);
          text-decoration: none;
          text-align: center;
          transition: background 0.2s ease;
        }
        .onboarding-primary-btn.onboarding-cta-link {
          margin-top: 12px;
          min-height: 44px;
          padding: 12px 24px;
          font-size: 15px;
        }
        .onboarding-primary-btn:hover:not(:disabled) {
          background: #2A8C72;
        }
        .onboarding-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .onboarding-secondary-btn {
          background: var(--color-surface);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: var(--clarion-radius-md);
          cursor: pointer;
          margin-right: 12px;
          margin-top: 8px;
          transition: background 0.2s, border-color 0.2s;
        }
        .onboarding-secondary-btn:hover { background: var(--color-surface-elevated); border-color: var(--color-border-strong); }
        .onboarding-button-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        .onboarding-card-grid { display: grid; gap: 24px; margin-bottom: var(--space-32); }
        .onboarding-card-grid.two { grid-template-columns: 1fr 1fr; }
        .onboarding-card-grid.four { grid-template-columns: 1fr 1fr; }
        @media (min-width: 640px) {
          .onboarding-card-grid.four { grid-template-columns: repeat(4, 1fr); }
        }
        /* Profile step (Page 2): one section per block, strict 2-col grid, clear card boxes */
        .onboarding-screen--profile {
          padding-bottom: var(--space-72);
        }
        .onboarding-screen--profile .onboarding-headline { margin-bottom: var(--space-24); }
        .onboarding-screen--profile .onboarding-subtext { margin-bottom: var(--space-32); }
        .onboarding-screen--profile .onboarding-adaptive-response { margin-bottom: 40px; }
        .onboarding-screen--profile .onboarding-next-fallback { margin-top: var(--space-48); }
        .onboarding-profile-sections {
          width: 100%;
        }
        .onboarding-profile-section {
          margin-bottom: 32px;
        }
        .onboarding-profile-section:last-child {
          margin-bottom: 0;
        }
        .onboarding-profile-section:not(:first-child) {
          margin-top: var(--space-48);
        }
        .onboarding-profile-section-label {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin: 0 0 14px;
          line-height: 1.2;
        }
        .onboarding-profile-grid-inner {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
        }
        @media (min-width: 540px) {
          .onboarding-profile-grid-inner {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 28px;
          }
        }
        .onboarding-profile-card {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 100px;
          padding: 0;
          border-radius: 9999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          overflow: hidden;
          box-sizing: border-box;
          text-align: left;
        }
        .onboarding-profile-card:hover {
          background: rgba(255,255,255,0.06);
        }
        .onboarding-profile-card-inner,
        .onboarding-profile-card-title,
        .onboarding-profile-card-desc,
        .onboarding-profile-card-icon,
        .onboarding-profile-card-selected-indicator {
          pointer-events: none;
        }
        .onboarding-profile-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-profile-card.selected {
          background: rgba(31, 111, 91, 0.14);
          border: 1px solid rgba(31, 111, 91, 0.35);
          color: var(--color-text-primary);
        }
        .onboarding-profile-card.selected:hover {
          background: rgba(31, 111, 91, 0.18);
        }
        .onboarding-profile-card-inner {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-8);
          padding: 26px;
          width: 100%;
          min-width: 0;
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }
        .onboarding-profile-card-selected-indicator {
          position: absolute;
          top: 16px;
          right: 16px;
          color: #1F6F5B;
          flex-shrink: 0;
        }
        .onboarding-profile-card-icon {
          display: block;
          flex-shrink: 0;
          margin: 0;
          opacity: 0.6;
          color: var(--color-text-primary);
        }
        .onboarding-profile-card.selected .onboarding-profile-card-icon {
          color: var(--color-text-primary);
        }
        .onboarding-profile-card-title {
          font-weight: 600;
          font-size: 15px;
          margin: 0;
          color: var(--color-text-primary);
          display: block;
          line-height: 1.3;
          min-width: 0;
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .onboarding-profile-card.selected .onboarding-profile-card-title {
          color: var(--color-text-primary);
        }
        .onboarding-profile-card-desc {
          font-size: 12px;
          margin: 0;
          color: var(--color-text-secondary);
          display: block;
          line-height: 1.4;
          min-width: 0;
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .onboarding-profile-card.selected .onboarding-profile-card-desc {
          color: var(--color-text-secondary);
        }
        .onboarding-answer-card {
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          text-align: left;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 9999px;
          padding: 26px;
          min-height: 100px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .onboarding-answer-card:hover {
          background: rgba(255,255,255,0.06);
          transform: translateY(-1px);
        }
        .onboarding-answer-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-answer-card.selected {
          background: rgba(31, 111, 91, 0.14);
          border: 1px solid rgba(31, 111, 91, 0.35);
          color: var(--color-text-primary);
        }
        .onboarding-answer-card.selected:hover { transform: translateY(-1px); }
        .onboarding-answer-card-check {
          position: absolute;
          top: 16px;
          right: 16px;
          color: #1F6F5B;
          pointer-events: none;
        }
        .onboarding-answer-card-icon,
        .onboarding-answer-card-title,
        .onboarding-answer-card-desc { pointer-events: none; }
        .onboarding-option-cards-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-24);
          margin-bottom: var(--space-32);
        }
        @media (max-width: 560px) {
          .onboarding-option-cards-two { grid-template-columns: 1fr; }
        }
        .onboarding-option-card { min-height: 120px; }
        .onboarding-improvement-grid { margin-bottom: var(--space-32); }
        .onboarding-improvement-pills { justify-content: center; }
        .onboarding-improvement-pills .onboarding-answer-pill { min-height: 64px; padding: 14px 24px; }
        .onboarding-answer-card.selected .onboarding-answer-card-title { color: var(--color-text-primary); }
        .onboarding-answer-card.selected .onboarding-answer-card-desc { color: var(--color-text-secondary); }
        .onboarding-answer-card-icon {
          display: block;
          margin-bottom: 8px;
          opacity: 0.6;
          color: var(--color-text-primary);
          flex-shrink: 0;
        }
        .onboarding-answer-card.selected .onboarding-answer-card-icon { opacity: 1; color: var(--color-text-primary); }
        .onboarding-answer-card-icon--muted { opacity: 0.5; color: var(--color-text-muted); }
        .onboarding-answer-card.selected .onboarding-answer-card-icon--muted { color: rgba(255, 255, 255, 0.8); }
        .onboarding-answer-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #fafafa;
          display: block;
        }
        .onboarding-answer-card-desc {
          font-size: 14px;
          opacity: 0.65;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          display: block;
          line-height: 1.5;
        }
        .onboarding-field-label { display: flex; flex-direction: column; gap: 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 10px; }
        .onboarding-sex-label { margin-top: var(--space-24); margin-bottom: var(--space-12); }
        .onboarding-sex-row { margin-bottom: var(--space-32); }
        .onboarding-input {
          padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 16px;
          background: rgba(255,255,255,0.04); color: var(--color-text-primary); max-width: 160px; box-sizing: border-box;
        }
        [data-theme="light"] .onboarding-input {
          background: #fff; border-color: rgba(0,0,0,0.12);
        }
        .onboarding-optional { font-weight: 400; color: rgba(255,255,255,0.5); font-size: 13px; }
        .onboarding-field-hint { font-size: 13px; color: rgba(255,255,255,0.5); margin: -8px 0 20px; line-height: 1.4; }
        .onboarding-answer-card-compact {
          min-height: 52px;
          padding: 12px 22px;
          border-radius: var(--clarion-radius-pill, 9999px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }
        .onboarding-answer-card-compact:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .onboarding-answer-card-compact:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-answer-card-compact.selected {
          background: var(--clarion-card-selected-bg);
          border: 1px solid var(--clarion-card-selected-border);
          box-shadow: var(--clarion-card-selected-shadow);
        }
        .onboarding-answer-card-compact .onboarding-answer-card-title { margin-top: 0; font-size: 16px; font-weight: 600; }
        .onboarding-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: var(--space-32);
        }
        .onboarding-pill-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: var(--space-32);
        }
        .onboarding-answer-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          padding: 12px 22px;
          border-radius: var(--clarion-radius-pill, 9999px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fafafa;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .onboarding-answer-pill:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .onboarding-answer-pill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-answer-pill.selected {
          background: var(--clarion-card-selected-bg);
          border: 1px solid var(--clarion-card-selected-border);
          box-shadow: var(--clarion-card-selected-shadow);
          color: #fff;
        }
        .onboarding-answer-pill-icon {
          flex-shrink: 0;
          color: #1F6F5B;
        }
        .onboarding-answer-pill.selected .onboarding-answer-pill-icon {
          color: rgba(255, 255, 255, 0.95);
        }
        .onboarding-answer-pill-icon--muted { color: rgba(255, 255, 255, 0.5); }
        .onboarding-answer-pill.selected .onboarding-answer-pill-icon--muted { color: rgba(255, 255, 255, 0.85); }
        .onboarding-answer-pill-icon,
        .onboarding-answer-pill-title,
        .onboarding-answer-pill-text,
        .onboarding-answer-pill-desc { pointer-events: none; }
        .onboarding-answer-pill-title { display: block; font-size: 18px; line-height: 1.25; }
        .onboarding-answer-pill-text { display: flex; flex-direction: column; gap: 4px; }
        .onboarding-answer-pill-desc {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.3;
          opacity: 0.75;
          color: rgba(255, 255, 255, 0.9);
        }
        .onboarding-answer-pill.selected .onboarding-answer-pill-desc { opacity: 0.9; }
        .onboarding-input-age { height: 52px; }
        .onboarding-units-toggle-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .onboarding-units-label { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); }
        .onboarding-units-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: var(--color-text-muted); font-size: 14px; cursor: pointer; }
        .onboarding-units-toggle:hover { background: rgba(255,255,255,0.1); color: var(--color-text-secondary); }
        .onboarding-units-toggle .onboarding-units-active { color: var(--color-text-primary); font-weight: 600; }
        .onboarding-units-toggle--metric { border-color: var(--color-accent); }
        .onboarding-height-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .onboarding-input-ft { max-width: 72px; }
        .onboarding-input-in { max-width: 72px; }
        .onboarding-unit-suffix { font-size: 14px; color: var(--color-text-muted); }
        .onboarding-textarea-label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .onboarding-textarea-label textarea {
          padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; font-size: 16px; resize: vertical; background: rgba(255,255,255,0.04); color: var(--color-text-primary);
        }
        [data-theme="light"] .onboarding-textarea-label textarea {
          background: #fff; border-color: rgba(0,0,0,0.12);
        }
        .onboarding-slider-wrap { margin-bottom: 28px; }
        .onboarding-slider-value { font-size: 22px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 12px; text-align: center; letter-spacing: 0.02em; }
        .onboarding-slider {
          width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.15); border-radius: 2px;
        }
        .onboarding-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #1F6F5B; cursor: pointer; box-shadow: none; }
        .onboarding-panel-recommended-card {
          background: rgba(31, 111, 91, 0.12);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: var(--space-24);
          border: 1px solid rgba(31, 111, 91, 0.25);
        }
        .onboarding-panel-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: var(--space-16); }
        .onboarding-panel-chip {
          padding: 10px 16px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9);
        }
        .onboarding-section-header {
          font-size: 18px; font-weight: 600; opacity: 0.85;
          color: rgba(255, 255, 255, 0.9); margin: 0 0 var(--space-8);
        }
        .onboarding-section-header--divider {
          margin-top: var(--space-32);
          padding-top: var(--space-24);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .onboarding-customize-label { font-size: 16px; font-weight: 600; opacity: 0.85; color: rgba(255,255,255,0.9); margin: var(--space-16) 0 var(--space-8); }
        .onboarding-panel-toggles { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: var(--space-16); }
        .onboarding-panel-toggle {
          padding: 8px 14px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.2s ease;
        }
        .onboarding-panel-toggle:hover { background: rgba(255,255,255,0.06); }
        .onboarding-panel-toggle:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-panel-toggle.selected {
          background: rgba(31, 111, 91, 0.14);
          border: 1px solid rgba(31, 111, 91, 0.35);
          box-shadow: none;
          color: #fff;
        }
        .onboarding-customize-hint { font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 12px; }
        .onboarding-supplement-chips {
          display: flex; flex-wrap: wrap; gap: 12px; row-gap: 14px; margin-bottom: var(--space-24);
        }
        .onboarding-supplement-chip {
          padding: 8px 14px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255, 255, 255, 0.05);
          font-size: 14px; font-weight: 500; color: var(--color-text-primary); cursor: pointer;
          transition: all 0.2s ease;
        }
        .onboarding-supplement-chip:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .onboarding-supplement-chip:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(31, 111, 91, 0.35);
        }
        .onboarding-supplement-chip.selected {
          background: rgba(31, 111, 91, 0.18);
          border: 1px solid rgba(31, 111, 91, 0.35);
          box-shadow: none;
          color: var(--color-text-primary);
        }
        .onboarding-supplement-chip-custom { display: inline-flex; align-items: center; gap: 6px; padding-right: 6px; }
        .onboarding-supplement-chip-remove { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; border-radius: 50%; }
        .onboarding-supplement-chip-remove:hover { color: #fafafa; }
        .onboarding-supplement-custom { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
        .onboarding-supplement-custom-input {
          flex: 1; max-width: 100%;
          border-radius: 10px;
          padding: 14px 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          font-size: 15px;
          color: var(--color-text-primary);
        }
        .onboarding-supplement-custom-input::placeholder { color: var(--color-text-muted); }
        [data-theme="light"] .onboarding-supplement-custom-input {
          background: #fff; border-color: rgba(0,0,0,0.12);
        }
        .onboarding-supplement-custom-btn { margin-top: 0; }
        .onboarding-supplement-custom-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .onboarding-blood-test-options { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
        .onboarding-blood-test-card {
          background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;
        }
        .onboarding-blood-test-card-icon {
          display: block;
          margin-bottom: 8px;
          color: #1F6F5B;
        }
        .onboarding-blood-test-card-title { font-size: 17px; font-weight: 700; color: #fafafa; margin: 0 0 10px; }
        .onboarding-blood-test-card-desc { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.5; margin: 0 0 12px; }
        .onboarding-blood-test-panel-hint { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; }
        .onboarding-blood-test-providers { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; }
        .onboarding-blood-test-provider {
          padding: 14px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
        }
        .onboarding-blood-test-provider strong { display: block; margin-bottom: 6px; color: #fafafa; }
        .onboarding-blood-test-provider p { margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.45; }
        .onboarding-blood-test-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-accent); margin-right: 8px; }
        .onboarding-blood-test-meta { font-size: 13px !important; color: rgba(255,255,255,0.55) !important; }
        .onboarding-blood-test-affiliate-disclosure { font-size: 11px !important; color: rgba(255,255,255,0.45) !important; margin: 10px 0 0 !important; line-height: 1.4 !important; }
        .onboarding-evidence-disclaimer { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0 0 10px; font-style: italic; }
        .onboarding-evidence-list { margin: 12px 0 0; padding-left: 20px; list-style: none; }
        .onboarding-evidence-list li { margin-bottom: 8px; }
        .onboarding-evidence-link { color: var(--color-accent); text-decoration: none; font-weight: 500; }
        .onboarding-evidence-link:hover { text-decoration: underline; }
        .onboarding-evidence-source { font-size: 13px; color: rgba(255,255,255,0.55); }
        .onboarding-stack-status { font-size: 14px; color: var(--color-text-secondary); margin: 0 0 10px; padding: 10px 12px; background: var(--color-surface); border-radius: 8px; border-left: 3px solid var(--color-accent); }
        .onboarding-stack-status-already_taking { border-left-color: var(--color-success); }
        .onboarding-stack-status-upgrade_recommended { border-left-color: var(--color-accent); }
        .onboarding-stack-unnecessary { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 20px; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 10px; }
        .onboarding-affiliate-card-image-wrap { width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.06); margin-bottom: 12px; }
        .onboarding-affiliate-card-image { width: 100%; height: 100%; object-fit: contain; }
        .onboarding-summary-score-block { margin: 20px 0; }
        .onboarding-summary-score-ring {
          display: inline-flex; align-items: baseline; gap: 4px; padding: 16px 28px; background: var(--color-surface-elevated); border: 1px solid var(--color-border);
          border-radius: 16px; box-shadow: none;
        }
        .onboarding-summary-score-num { font-size: 36px; font-weight: 700; color: var(--color-accent); letter-spacing: -0.02em; }
        .onboarding-summary-score-max { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.5); }
        .onboarding-summary-savings-card {
          background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin: 16px 0; max-width: 320px;
        }
        .onboarding-summary-savings-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.55); margin: 0 0 8px; }
        .onboarding-summary-savings-monthly { font-size: 22px; font-weight: 700; color: #fafafa; margin: 0; }
        .onboarding-summary-savings-annual { font-size: 15px; color: rgba(255,255,255,0.65); margin: 4px 0 0; }
        .onboarding-next-btn-secondary { background: transparent; color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.15); }
        .onboarding-next-btn-secondary:hover { background: rgba(255,255,255,0.08); }
        .onboarding-next-clarion-link { display: block; margin-top: 8px; }
        .onboarding-lab-inputs { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
        .onboarding-lab-card {
          background: var(--color-surface-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--clarion-radius-md);
          padding: 20px 24px;
        }
        .onboarding-lab-card label { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-8); margin-bottom: var(--space-8); }
        .onboarding-lab-label { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
        .onboarding-lab-range { font-size: 13px; color: var(--color-text-muted); }
        .onboarding-lab-card input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--color-border-strong);
          border-radius: var(--clarion-radius-sm);
          font-size: 16px;
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .onboarding-lab-card input::placeholder {
          color: var(--color-text-muted);
        }
        .onboarding-analysis-loader { text-align: center; width: 100%; }
        .onboarding-analysis-progress-wrap {
          width: 200px; height: 6px; background: rgba(254, 242, 242, 0.25); border-radius: 3px; margin: 24px auto 0; overflow: hidden;
        }
        .onboarding-analysis-progress {
          height: 100%; width: 0%; background: #E5484D; border-radius: 3px; animation: analysis-progress-fill 3s linear forwards;
        }
        @keyframes analysis-progress-fill { to { width: 100%; } }
        .onboarding-analysis-dots { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
        .onboarding-analysis-dots span {
          width: 10px; height: 10px; border-radius: 50%; background: rgba(254, 242, 242, 0.9); animation: onboarding-pulse 1.2s ease-in-out infinite;
        }
        .onboarding-analysis-dots span:nth-child(2) { animation-delay: 0.2s; }
        .onboarding-analysis-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes onboarding-pulse {
          0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
        }
        .onboarding-analysis-message { font-size: 18px; font-weight: 600; margin: 0; color: #fef2f2; }
        .onboarding-results-section { position: relative; }
        .onboarding-results-back-wrap { margin: 0 0 var(--space-24); }
        .onboarding-results-back { font-size: 14px; color: var(--color-text-muted); text-decoration: none; }
        .onboarding-results-back:hover { color: var(--color-accent); text-decoration: underline; }
        .onboarding-results-blur { filter: blur(10px); pointer-events: none; user-select: none; }
        .onboarding-results-lock-overlay {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 10; padding: 24px;
        }
        .onboarding-results-lock-card {
          background: rgba(15, 10, 26, 0.95); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 32px; max-width: 360px; text-align: center;
          box-shadow: none;
        }
        .onboarding-results-lock-icon { color: rgba(255,255,255,0.5); margin-bottom: 16px; }
        .onboarding-results-lock-title { font-size: 20px; font-weight: 700; color: #fef2f2; margin: 0 0 12px; }
        .onboarding-results-lock-text { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.5; margin: 0 0 24px; }
        .onboarding-results-lock-cta { display: inline-block; text-decoration: none; }
        .onboarding-score-title { margin-top: var(--space-32); margin-bottom: var(--space-8); }
        .onboarding-score-subline { font-size: 15px; color: var(--color-text-secondary); margin: 0 0 var(--space-24); }
        .onboarding-score-priority-card {
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: var(--clarion-radius-md);
          padding: 20px 24px;
          margin-bottom: var(--space-24);
          max-width: 360px;
          margin-left: auto;
          margin-right: auto;
        }
        .onboarding-score-priority-intro {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.6);
          margin: 0 0 12px;
        }
        .onboarding-score-priority-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .onboarding-score-priority-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: rgba(255,255,255,0.95);
        }
        .onboarding-score-priority-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(31, 111, 91, 0.14);
          color: rgba(255, 200, 120, 0.95);
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .onboarding-score-priority-name { font-weight: 600; }
        .onboarding-score-gauge-wrap { position: relative; width: 200px; height: 200px; margin: 0 auto var(--space-16); }
        .onboarding-score-gauge-svg { position: absolute; inset: 0; width: 100%; height: 100%; color: rgba(255,255,255,0.12); }
        .onboarding-score-gauge-fill { transition: stroke-dasharray 0.08s ease-out; color: var(--color-accent); }
        .onboarding-score-circle { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; border: none; background: transparent; margin: 0; }
        .onboarding-score-value { font-size: 56px; font-weight: 700; color: #fef2f2; line-height: 1.1; }
        .onboarding-score-max { font-size: 20px; color: rgba(254, 242, 242, 0.85); margin-left: 2px; }
        .onboarding-score-label { font-size: 20px; font-weight: 600; color: #fef2f2; margin: 0 0 24px; }
        .onboarding-score-upside {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.8);
          margin: 20px 0 24px;
          padding: 14px 18px;
          background: rgba(74, 222, 128, 0.12);
          border-radius: 10px;
          border: 1px solid rgba(74, 222, 128, 0.25);
        }
        .onboarding-score-categories { display: flex; gap: 16px; justify-content: center; margin-bottom: 28px; flex-wrap: wrap; }
        .onboarding-score-cat {
          background: rgba(255, 255, 255, 0.04); padding: 14px 22px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); text-align: center;
        }
        .onboarding-score-cat span { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px; font-weight: 500; }
        .onboarding-score-cat strong { font-size: 20px; color: #fafafa; font-weight: 700; }
        .onboarding-insights-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .onboarding-insight-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px 24px; }
        .onboarding-insight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .onboarding-insight-header strong { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
        .onboarding-status-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
        .onboarding-status-badge.tone-green { background: rgba(74, 222, 128, 0.18); color: #4ade80; }
        .onboarding-status-badge.tone-amber { background: var(--color-accent-soft); color: var(--color-accent); }
        .onboarding-status-badge.tone-red { background: rgba(229, 72, 77, 0.2); color: #f87171; }
        .onboarding-status-badge.tone-neutral { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .onboarding-insight-value { font-size: 24px; font-weight: 700; color: #fafafa; margin: 0 0 8px; }
        .onboarding-insight-desc, .onboarding-insight-action { font-size: 14px; color: rgba(255,255,255,0.65); margin: 0 0 8px; line-height: 1.5; }
        .onboarding-insight-optimal { font-size: 13px; color: rgba(255,255,255,0.5); margin-left: 6px; }
        .onboarding-insight-why { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0 0 8px; line-height: 1.5; font-style: italic; }
        .onboarding-insight-retest { font-size: 13px; color: var(--color-accent); margin: 0 0 8px; }
        .onboarding-insight-guide { margin: 0 0 8px; }
        .onboarding-guide-link { font-size: 14px; font-weight: 600; color: var(--color-accent); text-decoration: none; }
        .onboarding-guide-link:hover { text-decoration: underline; }
        .onboarding-preference-note { color: rgba(255,255,255,0.7); }
        .onboarding-ghost-btn { background: none; border: none; color: var(--color-accent); font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-top: 8px; }
        .onboarding-science-drawer { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; }
        .onboarding-stack-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
        .onboarding-stack-card { background: rgba(26,26,31,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px 22px; box-shadow: none; }
        .onboarding-stack-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .onboarding-stack-card-top strong { font-size: 18px; font-weight: 700; color: #fafafa; }
        .onboarding-stack-dose { display: block; font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .onboarding-stack-price { font-size: 16px; font-weight: 700; color: var(--color-accent); }
        .onboarding-stack-disclaimer { font-size: 12px; color: var(--color-text-muted); font-style: italic; margin: 0 0 16px; }
        .onboarding-stack-why { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 12px; line-height: 1.5; }
        .onboarding-stack-form-note { font-size: 13px; color: var(--color-text-muted); margin: 0 0 12px; font-style: italic; }
        .onboarding-stack-detail { margin: 0 0 12px; font-size: 13px; color: var(--color-text-muted); }
        .onboarding-stack-detail .onboarding-stack-timing,
        .onboarding-stack-detail .onboarding-stack-avoid { margin: 4px 0 0; }
        .onboarding-stack-best, .onboarding-stack-pick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: #fafafa; margin-bottom: 8px; }
        .onboarding-stack-best-label, .onboarding-stack-pick-label { font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
        .onboarding-stack-pick-premium { margin-top: 6px; }
        .onboarding-stack-per-serve { font-size: 13px; color: rgba(255,255,255,0.6); }
        .onboarding-stack-recommended-pick { margin-bottom: 14px; }
        .onboarding-stack-recommended-pick .onboarding-stack-pick-label { display: block; margin-bottom: 8px; }
        .onboarding-stack-recommended-card {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px; background: rgba(255,255,255,0.06); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
        }
        .onboarding-stack-recommended-img {
          width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: var(--color-bg, #1a1a1f); flex-shrink: 0;
        }
        .onboarding-stack-recommended-img-placeholder { background: rgba(255,255,255,0.08); }
        .onboarding-stack-recommended-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .onboarding-stack-recommended-title { font-size: 15px; font-weight: 600; color: #fafafa; line-height: 1.3; }
        .onboarding-stack-recommended-btn { align-self: flex-start; }
        .onboarding-stack-other-options { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
        .onboarding-stack-other-options-label { font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 8px; }
        .onboarding-link-btn-small { font-size: 13px; }
        .onboarding-link-btn { color: var(--color-accent); font-weight: 600; text-decoration: none; }
        .onboarding-stack-compare { margin: 12px 0 0; padding-left: 20px; font-size: 14px; color: rgba(255,255,255,0.65); }
        .onboarding-stack-summary { background: rgba(26,26,31,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; margin-bottom: 24px; box-shadow: none; }
        .onboarding-stack-summary p { margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.7); }
        .onboarding-stack-summary p:last-child { margin-bottom: 0; }
        .onboarding-stack-summary strong { color: #fafafa; }
        .onboarding-stack-savings strong { color: #4ade80; }
        .onboarding-stack-annual strong { color: #4ade80; }
        .onboarding-protocol-diet-lifestyle { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
        .onboarding-protocol-block { background: rgba(26,26,31,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; box-shadow: none; }
        .onboarding-protocol-block-title { font-size: 16px; font-weight: 700; color: #fafafa; margin: 0 0 12px; }
        .onboarding-protocol-item { margin-bottom: 12px; }
        .onboarding-protocol-item:last-child { margin-bottom: 0; }
        .onboarding-protocol-item strong { font-size: 14px; color: rgba(255,255,255,0.9); }
        .onboarding-protocol-item p { font-size: 14px; color: rgba(255,255,255,0.7); margin: 6px 0 0; line-height: 1.5; }
        .onboarding-protocol-optional { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 12px; }
        .onboarding-what-to-expect {
          background: rgba(26,26,31,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .onboarding-what-to-expect-title { font-size: 16px; font-weight: 700; color: #fafafa; margin: 0 0 10px; }
        .onboarding-what-to-expect p { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.55; margin: 0; }
        .onboarding-why-subscribe {
          background: var(--color-accent-soft);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .onboarding-why-subscribe-title { font-size: 16px; font-weight: 700; color: #fafafa; margin: 0 0 12px; }
        .onboarding-why-subscribe ul { margin: 0 0 16px; padding-left: 20px; font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; }
        .onboarding-cta-subscribe { display: block; width: 100%; margin-top: 8px; }
        .onboarding-welcome-clarion {
          background: var(--color-accent-soft);
          border: 1px solid rgba(74, 222, 128, 0.35);
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 24px;
          text-align: center;
        }
        .onboarding-welcome-clarion-badge {
          width: 48px; height: 48px;
          margin: 0 auto 14px;
          border-radius: 50%;
          background: rgba(74, 222, 128, 0.3);
          color: #4ade80;
          font-size: 24px; font-weight: 700; line-height: 48px;
          box-shadow: none;
        }
        .onboarding-welcome-clarion-title { font-size: 20px; font-weight: 700; color: #fafafa; margin: 0 0 8px; }
        .onboarding-welcome-clarion-desc { font-size: 14px; color: rgba(255,255,255,0.8); margin: 0; line-height: 1.5; }
        .onboarding-next-badge {
          display: flex; align-items: center; justify-content: center;
          min-height: 52px; padding: 0 24px;
          background: rgba(74, 222, 128, 0.12);
          color: #4ade80;
          border: 1px solid rgba(74, 222, 128, 0.35);
          border-radius: 12px;
          font-size: 15px; font-weight: 600;
        }
        .onboarding-summary-stats { margin: 16px 0 24px; padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; }
        .onboarding-summary-savings { font-size: 15px; color: rgba(255,255,255,0.85); margin: 0 0 8px; }
        .onboarding-summary-retest { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0; }
        .onboarding-summary-dashboard-hint { font-size: 15px; color: var(--color-text-secondary); margin: 0 0 20px; max-width: 400px; margin-left: auto; margin-right: auto; }
        .onboarding-next-actions { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
        .onboarding-next-btn {
          display: flex; align-items: center; justify-content: center;
          min-height: 52px; padding: 0 24px;
          background: rgba(255,255,255,0.08);
          color: #fafafa;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          font-size: 16px; font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .onboarding-next-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
        .onboarding-next-btn-primary {
          background: var(--color-accent);
          border: none;
          color: #fff;
          box-shadow: none;
        }
        .onboarding-next-btn-primary:hover { box-shadow: none; filter: brightness(1.06); }
        .onboarding-affiliate-section { margin-top: 28px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); }
        .onboarding-affiliate-title { font-size: 18px; font-weight: 600; color: #fafafa; margin: 0 0 16px; }
        .onboarding-affiliate-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); margin-bottom: 14px; }
        .onboarding-affiliate-card {
          padding: 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; box-shadow: none;
        }
        .onboarding-affiliate-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 6px; }
        .onboarding-affiliate-badge.cheapest { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .onboarding-affiliate-badge.premium { background: var(--color-accent-soft); color: var(--color-accent); }
        .onboarding-affiliate-badge.overall_winner { background: var(--color-accent-soft); color: var(--color-accent); }
        .onboarding-affiliate-card-title { display: block; font-size: 16px; color: #fafafa; margin-bottom: 4px; }
        .onboarding-affiliate-card-subtitle { font-size: 13px; color: rgba(255,255,255,0.65); display: block; margin-bottom: 8px; }
        .onboarding-affiliate-why { font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.45; margin: 0 0 10px; }
        .onboarding-affiliate-cost { font-size: 13px; color: rgba(255,255,255,0.6); display: block; margin-bottom: 10px; }
        .onboarding-affiliate-btn {
          display: inline-block; padding: 10px 18px; border-radius: 10px; background: var(--color-accent);
          color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; margin-bottom: 8px;
        }
        .onboarding-affiliate-btn:hover { opacity: 0.95; }
        .onboarding-affiliate-note { font-size: 12px; color: rgba(255,255,255,0.5); margin: 8px 0 0; line-height: 1.4; }
        .onboarding-affiliate-disclosure { font-size: 12px; color: rgba(255,255,255,0.5); margin: 0; }
        .onboarding-next-footer { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0; text-align: center; max-width: 420px; }
        .onboarding-muted { font-size: 16px; color: rgba(255,255,255,0.6); margin: 0 0 24px; }
        .onboarding-savings-grid { display: grid; gap: 16px; margin-bottom: 28px; }
        .onboarding-savings-card { background: rgba(26,26,31,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px 22px; box-shadow: none; }
        .onboarding-savings-card span { display: block; font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
        .onboarding-savings-card strong { font-size: 22px; font-weight: 700; color: #fafafa; }
        .onboarding-savings-card.highlight strong { color: var(--color-accent); }
        .onboarding-savings-card.success strong { color: #4ade80; }
        .onboarding-savings-annual { font-size: 16px; color: #4ade80; margin-top: 6px; }
      `}</style>
    </main>
  )
}
