"use client"

import React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Target, Pill, Droplet, Activity, Wallet, TrendingUp, ChevronLeft } from "lucide-react"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { getMarkerReason, getInputPlaceholder, titleCase } from "@/src/lib/panelEngine"
import { getStatusTone, inferWhyItMatters, inferNextStep } from "@/src/lib/priorityEngine"
import { getDisplayRange } from "@/src/lib/analyzeBiomarkers"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import type { ProfileState } from "@/src/lib/panelEngine"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"

const TRANSITION = { duration: 0.25, ease: "easeOut" as const }
const TOTAL_STEPS = 12

const GOAL_OPTIONS = [
  { id: "Performance optimization", label: "Improve performance", description: "Optimize endurance, recovery, and oxygen transport" },
  { id: "Energy", label: "Increase energy", description: "Support daily energy and focus" },
  { id: "General wellness", label: "Optimize longevity", description: "Long-term health and wellness" },
  { id: "General health", label: "General health", description: "Overall health maintenance" },
]
const ACTIVITY_OPTIONS = [
  { id: "Endurance", label: "Elite athlete", description: "Competitive or high-volume training" },
  { id: "Hybrid", label: "Train regularly", description: "Several sessions per week" },
  { id: "General health", label: "Moderately active", description: "Light to moderate exercise" },
  { id: "Sedentary", label: "Mostly sedentary", description: "Little or no structured exercise" },
]

const ANALYSIS_MESSAGES = [
  "Analyzing your biomarkers",
  "Evaluating your results",
  "Detecting potential deficiencies",
  "Building your optimization plan",
]

const AUTO_ADVANCE_MS = 380

// Adaptive micro-reward copy (shown after user selects)
function getGoalResponse(goal: string): string {
  if (!goal) return ""
  const g = goal.toLowerCase()
  if (g.includes("performance")) return "Got it. We'll prioritize markers linked to performance and recovery."
  if (g.includes("energy")) return "Got it. We'll focus on markers that affect energy and focus."
  if (g.includes("longevity") || g.includes("wellness")) return "Got it. We'll prioritize markers for long-term wellness."
  return "Got it. We'll tailor your panel to your goals."
}
function getActivityResponse(): string {
  return "Your training profile changes what \"optimal\" means for each marker."
}
function getSupplementSpendResponse(): string {
  return "Perfect — we'll compare your current cost against a smarter stack."
}
function getPanelResponse(): string {
  return "This is your recommended panel. You can customize it, but we've already prioritized the highest-signal markers."
}

const ICON_SIZE = 36
const ICON_STROKE = 1.5

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
  } = props

  const [analysisMessageIndex, setAnalysisMessageIndex] = React.useState(0)
  const [displayedScore, setDisplayedScore] = React.useState(0)
  const hasSupplements = Boolean(optimizedStack.stack?.length)
  const autoAdvanceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoAdvance = React.useCallback(() => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      setCurrentStep((s: number) => Math.min(11, s + 1))
    }, AUTO_ADVANCE_MS)
  }, [setCurrentStep])

  React.useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current) }, [])

  React.useEffect(() => {
    if (currentStep !== 7 || !analyzing) return
    const interval = setInterval(() => {
      setAnalysisMessageIndex((i) => (i + 1) % ANALYSIS_MESSAGES.length)
    }, 800)
    return () => clearInterval(interval)
  }, [currentStep, analyzing])

  React.useEffect(() => {
    if (currentStep !== 7 || !analyzing) return
    const t = setTimeout(() => {
      setAnalyzing(false)
      setCurrentStep(8)
    }, 3000)
    return () => clearTimeout(t)
  }, [currentStep, analyzing, setCurrentStep, setAnalyzing])

  // Health score count-up when entering step 8
  React.useEffect(() => {
    if (currentStep !== 8) {
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

  const goNext = () => setCurrentStep((s: number) => Math.min(11, s + 1))
  const goBack = () => setCurrentStep((s: number) => Math.max(0, s - 1))

  const handleAnalyze = () => {
    setCurrentStep(7)
    setAnalyzing(true)
  }

  const handleUseRecommended = () => {
    useRecommendedPanel()
    setCurrentStep(6)
  }

  const sliderValue = Math.min(300, Math.max(0, Number(currentSupplementSpend) || 0))
  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <div className="onboarding-header-inner">
          {currentStep > 0 ? (
            <button type="button" className="onboarding-back" onClick={goBack} aria-label="Back">
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
          ) : <div className="onboarding-header-spacer" />}
          <span className="onboarding-logo">Clarion</span>
          <div className="onboarding-header-actions">
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
        {currentStep > 0 ? (
        <div className="onboarding-progress-wrap">
          <span className="onboarding-progress-label">Step {currentStep + 1} of {TOTAL_STEPS}</span>
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

      <div className={`onboarding-container ${currentStep === 0 ? "onboarding-container-centered" : ""}`}>
      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.section
            key="welcome"
            className="onboarding-screen onboarding-screen-center"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <h1 className="onboarding-headline">Welcome to Clarion</h1>
            <p className="onboarding-subtext">Personalized bloodwork analysis for performance, energy, and longevity.</p>
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>
              Start Analysis →
            </button>
          </motion.section>
        )}

        {currentStep === 1 && (
          <motion.section
            key="goal"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Target size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">What do you want to improve most?</h1>
            <p className="onboarding-subtext">We use your goal to prioritize the most relevant biomarkers first.</p>
            {profile.goal && <p className="onboarding-adaptive-response">{getGoalResponse(profile.goal)}</p>}
            <div className="onboarding-card-grid four">
              {GOAL_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.label}
                  type="button"
                  className={`onboarding-answer-card ${profile.goal === opt.id ? "selected" : ""}`}
                  onClick={() => setProfile((p) => ({ ...p, goal: opt.id }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="onboarding-answer-card-title">{opt.label}</span>
                  <span className="onboarding-answer-card-desc">{opt.description}</span>
                </motion.button>
              ))}
            </div>
            <button type="button" className="onboarding-primary-btn onboarding-next-fallback" onClick={() => setCurrentStep(2)} disabled={!profile.goal}>
              Continue
            </button>
          </motion.section>
        )}

        {currentStep === 2 && (
          <motion.section
            key="activity"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Activity size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">Let's build your biomarker profile</h1>
            <p className="onboarding-subtext">Your activity level changes which ranges we treat as optimal for you.</p>
            {profile.sport && <p className="onboarding-adaptive-response">{getActivityResponse()}</p>}
            <p className="onboarding-subtext onboarding-subtext-secondary">How active are you?</p>
            <div className="onboarding-card-grid four">
              {ACTIVITY_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.label}
                  type="button"
                  className={`onboarding-answer-card ${profile.sport === opt.id ? "selected" : ""}`}
                  onClick={() => setProfile((p) => ({ ...p, sport: opt.id }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="onboarding-answer-card-title">{opt.label}</span>
                  <span className="onboarding-answer-card-desc">{opt.description}</span>
                </motion.button>
              ))}
            </div>
            <div className="onboarding-quick-fields">
              <label>
                <span>Age <span className="onboarding-optional">(optional)</span></span>
                <input type="number" value={profile.age} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} placeholder="25" min={1} max={120} />
              </label>
              <label>
                <span>Sex <span className="onboarding-optional">(optional)</span></span>
                <select value={profile.sex} onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value }))}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
            </div>
            <p className="onboarding-field-hint">Age and sex help personalize your results. You can continue and add them later.</p>
            <button
              type="button"
              className="onboarding-primary-btn"
              onClick={() => setCurrentStep(3)}
              disabled={!profile.sport.trim() && !(profile.age.trim() && profile.sex.trim())}
            >
              Continue
            </button>
          </motion.section>
        )}

        {currentStep === 3 && (
          <motion.section
            key="habits"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Pill size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">Do you currently take supplements?</h1>
            <p className="onboarding-subtext">Supplement habits help us estimate waste and build a smarter stack.</p>
            <div className="onboarding-card-grid two">
              <motion.button
                type="button"
                className={`onboarding-answer-card ${currentSupplements !== "No" ? "selected" : ""}`}
                onClick={() => setCurrentSupplements(currentSupplements === "No" ? "" : currentSupplements)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="onboarding-answer-card-title">Yes</span>
              </motion.button>
              <motion.button
                type="button"
                className={`onboarding-answer-card ${currentSupplements === "No" ? "selected" : ""}`}
                onClick={() => { setCurrentSupplements("No"); scheduleAutoAdvance() }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="onboarding-answer-card-title">No</span>
              </motion.button>
            </div>
            {currentSupplements !== "No" && (
              <label className="onboarding-textarea-label">
                <span>List your current supplements</span>
                <textarea value={currentSupplements} onChange={(e) => setCurrentSupplements(e.target.value)} placeholder="e.g. Fish oil, Vitamin D, Magnesium…" rows={3} />
              </label>
            )}
            <button type="button" className="onboarding-primary-btn" onClick={() => setCurrentStep(4)}>
              Continue
            </button>
          </motion.section>
        )}

        {currentStep === 4 && (
          <motion.section
            key="spend"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">About how much do you spend on supplements per month?</h1>
            <p className="onboarding-subtext">We'll compare your current cost against an optimized stack.</p>
            {Number(currentSupplementSpend) > 0 && <p className="onboarding-adaptive-response">{getSupplementSpendResponse()}</p>}
            <div className="onboarding-slider-wrap">
              <div className="onboarding-slider-value">${sliderValue}{sliderValue >= 300 ? "+" : ""} / month</div>
              <input type="range" min={0} max={300} value={sliderValue} onChange={(e) => setCurrentSupplementSpend(e.target.value)} className="onboarding-slider" />
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>
              Continue
            </button>
          </motion.section>
        )}

        {currentStep === 5 && (
          <motion.section
            key="panel"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Droplet size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">These markers matter most for your goals</h1>
            <p className="onboarding-subtext">Based on your goal and training profile, we recommend focusing on these tests first.</p>
            {selectedPanel.length > 0 && <p className="onboarding-adaptive-response">{getPanelResponse()}</p>}
            <div className="onboarding-panel-chips">
              {recommendedMarkers.map((marker) => (
                <span key={marker} className="onboarding-panel-chip">{titleCase(marker)}</span>
              ))}
            </div>
            <div className="onboarding-button-row">
              <button type="button" className="onboarding-primary-btn" onClick={handleUseRecommended}>
                Use Recommended Panel
              </button>
              <button type="button" className="onboarding-secondary-btn" onClick={goNext}>
                Customize Panel
              </button>
            </div>
            <p className="onboarding-customize-label">Or select/deselect biomarkers:</p>
            <div className="onboarding-panel-toggles">
              {biomarkerKeys.map((marker) => (
                <button key={marker} type="button" className={`onboarding-panel-toggle ${activePanel.includes(marker) ? "selected" : ""}`} onClick={() => togglePanelMarker(marker)}>
                  {titleCase(marker)}
                </button>
              ))}
            </div>
            {activePanel.length > 0 && <div className="onboarding-customize-hint">Selected: {activePanel.map(titleCase).join(", ")}</div>}
          </motion.section>
        )}

        {currentStep === 6 && (
          <motion.section
            key="labs"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Droplet size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">Enter your lab results</h1>
            <p className="onboarding-subtext">Enter values for each biomarker so we can build your personalized protocol. Your optimal range appears after you enter a value.</p>
            <div className="onboarding-lab-inputs">
              {activePanel.map((key) => {
                const hasValue = inputs[key] !== undefined && inputs[key] !== "" && String(inputs[key]).trim() !== ""
                const displayRange = getDisplayRange(key, profile)
                return (
                  <div key={key} className="onboarding-lab-card">
                    <label>
                      <span className="onboarding-lab-label">{titleCase(key)}</span>
                      {hasValue && displayRange && (
                        <span className="onboarding-lab-range">Optimal for you: {displayRange.optimalMin}–{displayRange.optimalMax}</span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={String(inputs[key] ?? "")} onChange={(e) => handleInputChange(key, e.target.value)} placeholder={getInputPlaceholder(key)} />
                  </div>
                )
              })}
            </div>
            <button type="button" className="onboarding-secondary-btn" onClick={loadExampleData}>Load example panel</button>
            <button type="button" className="onboarding-primary-btn" onClick={handleAnalyze} disabled={!hasEnoughLabsFlag}>Analyze</button>
          </motion.section>
        )}

        {currentStep === 7 && analyzing && (
          <motion.section
            key="analysis"
            className="onboarding-screen onboarding-screen-center onboarding-screen-analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION}
          >
            <div className="onboarding-analysis-loader">
              <div className="onboarding-analysis-dots">
                <span /><span /><span />
              </div>
              <p className="onboarding-analysis-message">{ANALYSIS_MESSAGES[analysisMessageIndex]}</p>
              <div className="onboarding-analysis-progress-wrap">
                <div className="onboarding-analysis-progress" />
              </div>
            </div>
          </motion.section>
        )}

        {currentStep === 8 && (
          <motion.section
            key="score"
            className="onboarding-screen onboarding-screen-score"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <h1 className="onboarding-headline onboarding-score-title">Clarion Health Score</h1>
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
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue</button>
          </motion.section>
        )}

        {currentStep === 9 && (
          <motion.section
            key="insights"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <div className="onboarding-step-icon" aria-hidden><Droplet size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
            <h1 className="onboarding-headline">Biomarker insights</h1>
            <p className="onboarding-subtext">What your results mean, why they matter for you, and what to do next.</p>
            <div className="onboarding-insights-list">
              {analysisResults.map((item: any, idx: number) => {
                const marker = String(item.name || item.marker || "")
                const tone = getStatusTone(item.status)
                const optimalRange = item.optimalMin != null && item.optimalMax != null ? `${item.optimalMin}–${item.optimalMax}` : null
                const whyForYou = getMarkerReason(marker, profile)
                return (
                  <div key={marker + idx} className="onboarding-insight-card">
                    <div className="onboarding-insight-header">
                      <strong>{marker}</strong>
                      <span className={`onboarding-status-badge ${tone.className}`}>{tone.label}</span>
                    </div>
                    <p className="onboarding-insight-value">{item.value ?? "—"} {item.unit || ""}{optimalRange ? <span className="onboarding-insight-optimal"> · Optimal for you: {optimalRange}</span> : null}</p>
                    <p className="onboarding-insight-desc"><strong>What this means:</strong> {item.description || inferWhyItMatters(marker)}</p>
                    <p className="onboarding-insight-why">Why this matters for you: {whyForYou}</p>
                    <p className="onboarding-insight-action"><strong>Recommended action:</strong> {item.supplementNotes || inferNextStep(marker, item.status)}</p>
                    {item.retest && <p className="onboarding-insight-retest">Retest: {item.retest}</p>}
                    <button type="button" className="onboarding-ghost-btn" onClick={() => toggleScience(marker)}>
                      {openScienceMarkers[marker] ? "Hide science" : "Science"}
                    </button>
                    {openScienceMarkers[marker] && (item.researchSummary || item.whyItMatters) && (
                      <div className="onboarding-science-drawer">
                        {item.researchSummary && <p>{item.researchSummary}</p>}
                        {item.whyItMatters && <p>{item.whyItMatters}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue</button>
          </motion.section>
        )}

        {currentStep === 10 && (
          <motion.section
            key="stack"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <h1 className="onboarding-headline">Your 30-Day Clarion Protocol</h1>
            <p className="onboarding-subtext">A data-informed stack built from your biomarkers, goals, and current supplement habits.</p>
            {!hasSupplements ? (
              <p className="onboarding-muted">No supplement recommendations from your current results.</p>
            ) : (
              <>
                <div className="onboarding-stack-list">
                  {optimizedStack.stack.map((rec: any, idx: number) => {
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
                        <p className="onboarding-stack-why">Included because: {rec.whyThisIsRecommended ?? rec.whyRecommended ?? "Supports your biomarker goals."}</p>
                        {best && (
                          <div className="onboarding-stack-pick">
                            <span className="onboarding-stack-pick-label">Best value</span>
                            <span>{best.productName}</span>
                            {best.pricePerServing != null && <span className="onboarding-stack-per-serve">${Number(best.pricePerServing).toFixed(2)}/serving</span>}
                            {best.url && (
                              <a href={best.url} target="_blank" rel="noreferrer noopener" className="onboarding-link-btn">Buy on Amazon</a>
                            )}
                          </div>
                        )}
                        {premium && (
                          <div className="onboarding-stack-pick onboarding-stack-pick-premium">
                            <span className="onboarding-stack-pick-label">Premium pick</span>
                            <span>{premium.productName}</span>
                            {premium.url && (
                              <a href={premium.url} target="_blank" rel="noreferrer noopener" className="onboarding-link-btn">Buy on Amazon</a>
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
              </>
            )}
            <button type="button" className="onboarding-primary-btn" onClick={goNext}>Continue</button>
          </motion.section>
        )}

        {currentStep === 11 && (
          <motion.section
            key="next"
            className="onboarding-screen"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={TRANSITION}
          >
            <h1 className="onboarding-headline">What happens next</h1>
            <p className="onboarding-subtext">Buy your protocol, follow it consistently, retest in 8–12 weeks, then compare your new score against baseline.</p>
            <div className="onboarding-next-actions">
              <button type="button" className="onboarding-next-btn" onClick={() => setCurrentStep(10)}>
                Buy your stack
              </button>
              <Link href="/dashboard" className="onboarding-next-btn">Save my plan</Link>
              <Link href="/dashboard" className="onboarding-next-btn">Set retest reminder</Link>
              <SubscribeButton className="onboarding-next-btn onboarding-next-btn-primary">Unlock Clarion+</SubscribeButton>
            </div>
            <p className="onboarding-next-footer">Clarion+ turns one blood test into an ongoing optimization system — track history, score changes, retest reminders, and smarter recommendations.</p>
          </motion.section>
        )}
      </AnimatePresence>
      </div>

      <style jsx>{`
        .onboarding-shell {
          min-height: 100vh;
          background: linear-gradient(165deg, #1a0a2e 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f0a1a 100%);
          color: #fafafa;
          display: flex;
          flex-direction: column;
        }
        .onboarding-header {
          flex-shrink: 0;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(30, 27, 75, 0.6);
          backdrop-filter: blur(12px);
        }
        .onboarding-header-inner {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .onboarding-header-spacer { width: 40px; }
        .onboarding-back {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }
        .onboarding-back:hover { color: #fafafa; }
        .onboarding-logo {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.95);
        }
        .onboarding-header-actions { display: flex; align-items: center; gap: 10px; }
        .onboarding-header-btn {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 10px;
          transition: background 0.2s, color 0.2s;
        }
        .onboarding-header-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fafafa; }
        .onboarding-progress-wrap {
          max-width: 640px;
          margin: 0 auto;
          padding: 14px 20px 0;
        }
        .onboarding-progress-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.02em;
          display: block;
          margin-bottom: 10px;
        }
        .onboarding-progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .onboarding-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #E5484D, #f97316);
          border-radius: 4px;
          transition: width 0.35s ease-out;
        }
        .onboarding-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          max-width: 640px;
          margin: 0 auto;
          padding: 28px 20px 40px;
          width: 100%;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .onboarding-container-centered {
          justify-content: center;
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
        .onboarding-step-icon {
          margin-bottom: 18px;
          color: rgba(255, 255, 255, 0.9);
        }
        .onboarding-next-fallback { margin-top: 28px; }
        .onboarding-headline {
          font-size: clamp(30px, 5.5vw, 46px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: #fafafa;
          margin: 0 0 14px;
        }
        .onboarding-subtext {
          font-size: 18px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.55;
          margin: 0 0 32px;
          max-width: 420px;
        }
        .onboarding-subtext-secondary { font-size: 16px; margin-bottom: 16px; }
        .onboarding-adaptive-response {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 500;
          margin: -16px 0 20px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          border-left: 3px solid rgba(249, 115, 22, 0.6);
        }
        .onboarding-primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 56px;
          padding: 0 32px;
          background: linear-gradient(135deg, #f97316 0%, #E5484D 100%);
          color: #fff;
          border: none;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.02em;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 8px;
          text-decoration: none;
          text-align: center;
          box-shadow: 0 4px 20px rgba(229, 72, 77, 0.4);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .onboarding-primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(229, 72, 77, 0.45);
        }
        .onboarding-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .onboarding-secondary-btn {
          background: rgba(255, 255, 255, 0.06);
          color: #fafafa;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          margin-right: 12px;
          margin-top: 8px;
          transition: background 0.2s, border-color 0.2s;
        }
        .onboarding-secondary-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); }
        .onboarding-button-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        .onboarding-card-grid { display: grid; gap: 14px; margin-bottom: 24px; }
        .onboarding-card-grid.two { grid-template-columns: 1fr 1fr; }
        .onboarding-card-grid.four { grid-template-columns: 1fr 1fr; }
        @media (min-width: 640px) {
          .onboarding-card-grid.four { grid-template-columns: repeat(4, 1fr); }
        }
        .onboarding-answer-card {
          background: rgba(26, 26, 31, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 22px;
          min-height: 120px;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
        }
        .onboarding-answer-card:hover {
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          background: rgba(32, 32, 38, 0.9);
        }
        .onboarding-answer-card.selected {
          border-color: rgba(229, 72, 77, 0.6);
          background: rgba(229, 72, 77, 0.1);
          box-shadow: 0 0 0 1px rgba(229, 72, 77, 0.3), 0 4px 16px rgba(229, 72, 77, 0.15);
        }
        .onboarding-answer-card-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #fafafa;
          display: block;
        }
        .onboarding-answer-card-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
          display: block;
          line-height: 1.45;
        }
        .onboarding-quick-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .onboarding-optional { font-weight: 400; color: rgba(255,255,255,0.5); font-size: 13px; }
        .onboarding-field-hint { font-size: 13px; color: rgba(255,255,255,0.5); margin: -8px 0 20px; line-height: 1.4; }
        .onboarding-quick-fields label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }
        .onboarding-quick-fields input, .onboarding-quick-fields select {
          padding: 12px 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 16px; background: rgba(26,26,31,0.8); color: #fafafa;
        }
        .onboarding-textarea-label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); }
        .onboarding-textarea-label textarea {
          padding: 12px 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 16px; resize: vertical; background: rgba(26,26,31,0.8); color: #fafafa;
        }
        .onboarding-slider-wrap { margin-bottom: 28px; }
        .onboarding-slider-value { font-size: 22px; font-weight: 700; color: #f97316; margin-bottom: 12px; text-align: center; letter-spacing: 0.02em; }
        .onboarding-slider {
          width: 100%; height: 10px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.1); border-radius: 5px;
        }
        .onboarding-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #E5484D); cursor: pointer; box-shadow: 0 2px 8px rgba(229,72,77,0.4); }
        .onboarding-panel-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
        .onboarding-panel-chip {
          padding: 10px 16px; border-radius: 999px; background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.9);
        }
        .onboarding-customize-label { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); margin: 20px 0 10px; }
        .onboarding-panel-toggles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .onboarding-panel-toggle {
          padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(26,26,31,0.8); font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); cursor: pointer; transition: border-color 0.2s, background 0.2s;
        }
        .onboarding-panel-toggle:hover { border-color: rgba(255,255,255,0.18); background: rgba(32,32,38,0.9); }
        .onboarding-panel-toggle.selected { border-color: rgba(229,72,77,0.5); background: rgba(229,72,77,0.12); }
        .onboarding-customize-hint { font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 12px; }
        .onboarding-lab-inputs { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
        .onboarding-lab-card {
          background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .onboarding-lab-card label { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .onboarding-lab-label { font-size: 16px; font-weight: 600; color: #fafafa; }
        .onboarding-lab-range { font-size: 13px; color: rgba(255,255,255,0.55); }
        .onboarding-lab-card input { width: 100%; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; font-size: 16px; background: rgba(20,20,26,0.6); color: #fafafa; }
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
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        .onboarding-analysis-message { font-size: 18px; font-weight: 600; margin: 0; color: #fef2f2; }
        .onboarding-score-gauge-wrap { position: relative; width: 200px; height: 200px; margin: 0 auto 16px; }
        .onboarding-score-gauge-svg { position: absolute; inset: 0; width: 100%; height: 100%; color: rgba(255,255,255,0.12); }
        .onboarding-score-gauge-fill { transition: stroke-dasharray 0.08s ease-out; color: #f97316; }
        .onboarding-score-circle { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; border: none; background: transparent; margin: 0; }
        .onboarding-score-value { font-size: 48px; font-weight: 700; color: #fef2f2; line-height: 1.1; }
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
          background: rgba(26,26,31,0.9); padding: 14px 22px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .onboarding-score-cat span { display: block; font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px; font-weight: 500; }
        .onboarding-score-cat strong { font-size: 20px; color: #fafafa; font-weight: 700; }
        .onboarding-insights-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .onboarding-insight-card { background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
        .onboarding-insight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .onboarding-insight-header strong { font-size: 18px; font-weight: 700; color: #fafafa; }
        .onboarding-status-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
        .onboarding-status-badge.tone-green { background: rgba(74, 222, 128, 0.18); color: #4ade80; }
        .onboarding-status-badge.tone-amber { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
        .onboarding-status-badge.tone-red { background: rgba(229, 72, 77, 0.2); color: #f87171; }
        .onboarding-status-badge.tone-neutral { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
        .onboarding-insight-value { font-size: 24px; font-weight: 700; color: #fafafa; margin: 0 0 8px; }
        .onboarding-insight-desc, .onboarding-insight-action { font-size: 14px; color: rgba(255,255,255,0.65); margin: 0 0 8px; line-height: 1.5; }
        .onboarding-insight-optimal { font-size: 13px; color: rgba(255,255,255,0.5); margin-left: 6px; }
        .onboarding-insight-why { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0 0 8px; line-height: 1.5; font-style: italic; }
        .onboarding-insight-retest { font-size: 13px; color: rgba(249, 115, 22, 0.9); margin: 0 0 8px; }
        .onboarding-ghost-btn { background: none; border: none; color: #f97316; font-size: 14px; font-weight: 600; cursor: pointer; padding: 0; margin-top: 8px; }
        .onboarding-science-drawer { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; }
        .onboarding-stack-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px; }
        .onboarding-stack-card { background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px 22px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
        .onboarding-stack-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .onboarding-stack-card-top strong { font-size: 18px; font-weight: 700; color: #fafafa; }
        .onboarding-stack-dose { display: block; font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .onboarding-stack-price { font-size: 16px; font-weight: 700; color: #f97316; }
        .onboarding-stack-why { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 12px; line-height: 1.5; }
        .onboarding-stack-best, .onboarding-stack-pick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14px; color: #fafafa; margin-bottom: 8px; }
        .onboarding-stack-best-label, .onboarding-stack-pick-label { font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
        .onboarding-stack-pick-premium { margin-top: 6px; }
        .onboarding-stack-per-serve { font-size: 13px; color: rgba(255,255,255,0.6); }
        .onboarding-link-btn { color: #f97316; font-weight: 600; text-decoration: none; }
        .onboarding-stack-compare { margin: 12px 0 0; padding-left: 20px; font-size: 14px; color: rgba(255,255,255,0.65); }
        .onboarding-stack-summary { background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
        .onboarding-stack-summary p { margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.7); }
        .onboarding-stack-summary p:last-child { margin-bottom: 0; }
        .onboarding-stack-summary strong { color: #fafafa; }
        .onboarding-stack-savings strong { color: #4ade80; }
        .onboarding-stack-annual strong { color: #4ade80; }
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
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.25);
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .onboarding-why-subscribe-title { font-size: 16px; font-weight: 700; color: #fafafa; margin: 0 0 12px; }
        .onboarding-why-subscribe ul { margin: 0 0 16px; padding-left: 20px; font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; }
        .onboarding-cta-subscribe { display: block; width: 100%; margin-top: 8px; }
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
          background: linear-gradient(135deg, #f97316 0%, #E5484D 100%);
          border: none;
          color: #fff;
          box-shadow: 0 4px 20px rgba(229, 72, 77, 0.4);
        }
        .onboarding-next-btn-primary:hover { box-shadow: 0 6px 24px rgba(229, 72, 77, 0.5); }
        .onboarding-next-footer { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0; text-align: center; max-width: 420px; }
        .onboarding-muted { font-size: 16px; color: rgba(255,255,255,0.6); margin: 0 0 24px; }
        .onboarding-savings-grid { display: grid; gap: 16px; margin-bottom: 28px; }
        .onboarding-savings-card { background: rgba(26,26,31,0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px 22px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); }
        .onboarding-savings-card span { display: block; font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
        .onboarding-savings-card strong { font-size: 22px; font-weight: 700; color: #fafafa; }
        .onboarding-savings-card.highlight strong { color: #f97316; }
        .onboarding-savings-card.success strong { color: #4ade80; }
        .onboarding-savings-annual { font-size: 16px; color: #4ade80; margin-top: 6px; }
      `}</style>
    </main>
  )
}
