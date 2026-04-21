"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { findAnalysisResultForDriverMarker, getOrderedScoreDrivers, getImprovementForecast } from "@/src/lib/scoreBreakdown"
import { buildPriorityContextFromProfile } from "@/src/lib/priorityRanking"
import { inferWhyItMatters } from "@/src/lib/priorityEngine"
import { getActionPlanForBiomarker } from "@/src/lib/actionPlans"
import {
  applyAmazonAssociatesTag,
  getAffiliateProductsForBiomarker,
} from "@/src/lib/affiliateProducts"
import type { AffiliateProduct } from "@/src/lib/affiliateProducts"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { getCoreProtocol } from "@/src/lib/coreBiomarkerProtocols"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import type { SupplementDetail } from "@/src/lib/supplementProtocolDetail"
import { getGuidesForBiomarker } from "@/src/lib/guides"
import { PAID_PROTOCOLS } from "@/src/lib/paidProtocols"
import { hasClarionAnalysisAccess, hasLabPersonalizationAccess } from "@/src/lib/accessGate"
import { LabUpgradeCallout } from "@/src/components/LabUpgradeCallout"
import {
  getJourneyStepCopy,
  getLifestyleTaglineForMarker,
  getMarkerVisualKind,
  getPositiveStatusTeaser,
  getProgressHeadlineForMarker,
  type MarkerVisualKind,
} from "@/src/lib/priorityJourneyCopy"
import { ActionCardBiomarkerScene } from "@/src/components/ActionCardBiomarkerScene"
import "./actions-atmosphere.css"

type PriorityMarkerCardProps = {
  priorityIndex: number
  driver: { markerName: string; label: string; status?: string }
  progressTitle: string
  lifestyleTagline: string
  visualKind: MarkerVisualKind
  journey: { step: string; theme: string }
  statusTeaser: string
  isHighUrgency: boolean
  primaryProduct: AffiliateProduct | undefined
  bestValue: AffiliateProduct | undefined
  bestQuality: AffiliateProduct | undefined
  supplementDetail: SupplementDetail | null
  actionPlan: ReturnType<typeof getActionPlanForBiomarker>
  forecast: ReturnType<typeof getImprovementForecast>
  foods: string[]
  lifestyle: string[]
  guide: ReturnType<typeof getGuidesForBiomarker>[0] | undefined
  paidProtocol: (typeof PAID_PROTOCOLS)[number] | undefined
}

function PriorityMarkerCard({
  priorityIndex,
  driver,
  progressTitle,
  lifestyleTagline,
  visualKind,
  journey,
  statusTeaser,
  isHighUrgency,
  primaryProduct,
  bestValue,
  bestQuality,
  supplementDetail,
  actionPlan,
  forecast,
  foods,
  lifestyle,
  guide,
  paidProtocol,
}: PriorityMarkerCardProps) {
  const [flipped, setFlipped] = useState(false)
  const tone = isHighUrgency ? "urgent" : "steady"

  return (
    <article
      className={`dashboard-priority-flip dashboard-priority-flip--${tone} ${flipped ? "dashboard-priority-flip--flipped" : ""}`}
      role="listitem"
      data-priority-step={priorityIndex - 1}
    >
      <div className="dashboard-priority-flip-inner">
        <div className="dashboard-priority-flip-face dashboard-priority-flip-face--front">
          <div className="dashboard-priority-card-image-zone" data-biomarker-scene={visualKind}>
            <div className="dashboard-priority-card-underlay">
              <ActionCardBiomarkerScene kind={visualKind} />
            </div>
            <div className="dashboard-priority-card-image-zone-scrim" aria-hidden />
          </div>
          <div className="dashboard-priority-card-glass-panel">
            <div className="dashboard-priority-flip-front-top">
              <span className="dashboard-priority-journey-label">
                <strong>{journey.step}</strong> — {journey.theme}
              </span>
            </div>
            <button
              type="button"
              className="dashboard-priority-flip-tapzone"
              aria-expanded={flipped}
              aria-label={`${progressTitle}. Show resources and protocol.`}
              onClick={() => setFlipped(true)}
            >
              <h3 className="dashboard-priority-flip-title">{progressTitle}</h3>
              <p className="dashboard-priority-flip-tagline">{lifestyleTagline}</p>
              <p className="dashboard-priority-flip-teaser">{statusTeaser}</p>
            </button>
            <div className="dashboard-priority-front-cta-row">
            {primaryProduct?.imageUrl ? (
              <img className="dashboard-priority-product-thumb" src={primaryProduct.imageUrl} alt="" width={40} height={40} />
            ) : (
              <div className="dashboard-priority-product-thumb dashboard-priority-product-thumb--empty" aria-hidden />
            )}
                       {primaryProduct ? (
              <a
                href={applyAmazonAssociatesTag(primaryProduct.affiliateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-priority-cta-buy"
              >
                Buy
              </a>
            ) : (
              <span className="dashboard-priority-cta-placeholder" aria-hidden>
                No shop link
              </span>
            )}
            {guide ? (
              <Link href={`/guides/${guide.slug}`} className="dashboard-priority-cta-learn">
                Learn why
              </Link>
            ) : (
              <Link href="/dashboard/biomarkers" className="dashboard-priority-cta-learn">
                Biomarkers
              </Link>
            )}
            <span className="dashboard-priority-cta-spacer" aria-hidden />
            </div>
            <span className="dashboard-priority-flip-tap">Tap card for resources</span>
          </div>
        </div>
        <div className="dashboard-priority-flip-face dashboard-priority-flip-face--back">
          <div className="dashboard-priority-back-header">
            <button type="button" className="dashboard-priority-back-btn" onClick={() => setFlipped(false)}>
              ← Back
            </button>
            {primaryProduct ? (
              <a
                href={applyAmazonAssociatesTag(primaryProduct.affiliateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-priority-purchase dashboard-priority-purchase--on-back"
              >
                Buy on Amazon
              </a>
            ) : null}
          </div>
          <div className="dashboard-priority-back-scroll">
            <p className="dashboard-priority-back-section-title">Why it matters</p>
            <p className="dashboard-priority-back-body">{inferWhyItMatters(driver.markerName)}</p>

            {actionPlan?.dailyActions?.[0] ? (
              <>
                <p className="dashboard-priority-back-section-title">Do this</p>
                <p className="dashboard-priority-back-body dashboard-priority-back-body--emph">{actionPlan.dailyActions[0]}</p>
              </>
            ) : null}

            {forecast ? (
              <>
                <p className="dashboard-priority-back-section-title">Score impact</p>
                <p className="dashboard-priority-back-body">
                  Roughly +{forecast.projectedScore - forecast.currentScore} points if this marker moves toward target
                  (estimate).
                </p>
              </>
            ) : null}

            {foods.length > 0 ? (
              <>
                <p className="dashboard-priority-back-section-title">Food</p>
                <ul className="dashboard-priority-back-list">
                  {foods.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {lifestyle.length > 0 ? (
              <>
                <p className="dashboard-priority-back-section-title">Lifestyle</p>
                <ul className="dashboard-priority-back-list">
                  {lifestyle.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {primaryProduct || bestValue || bestQuality ? (
              <>
                <p className="dashboard-priority-back-section-title">Products</p>
                <ActionSupplementStrip
                  embedded
                  driverLabel={driver.label}
                  primaryProduct={primaryProduct}
                  bestValue={bestValue}
                  bestQuality={bestQuality}
                  supplementDetail={supplementDetail}
                />
              </>
            ) : null}

            {!(primaryProduct || bestValue || bestQuality) &&
            (supplementDetail?.timing || supplementDetail?.safetyNotes || supplementDetail?.avoid) ? (
              <>
                <p className="dashboard-priority-back-section-title">Protocol notes</p>
                <ul className="dashboard-priority-back-list">
                  {supplementDetail.timing && <li>{supplementDetail.timing}</li>}
                  {supplementDetail.avoid && <li>Avoid: {supplementDetail.avoid}</li>}
                  {supplementDetail.safetyNotes && (
                    <li>Discuss with your clinician if needed. {supplementDetail.safetyNotes}</li>
                  )}
                </ul>
              </>
            ) : null}

            <div className="dashboard-priority-back-links">
              {paidProtocol && (
                <Link href={`/protocols/${paidProtocol.slug}`} className="dashboard-priority-back-link">
                  {paidProtocol.title}
                </Link>
              )}
              {guide && (
                <Link href={`/guides/${guide.slug}`} className="dashboard-priority-back-link">
                  {driver.markerName} guide
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ActionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => setLoading(false))
      return
    }
    queueMicrotask(() => setLoading(true))
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile: p, bloodwork: b }, sub]) => {
        setProfile(p ?? null)
        setBloodwork(b ?? null)
        setSubscription(sub ?? null)
      })
      .catch(() => {
        setProfile(null)
        setBloodwork(null)
        setSubscription(null)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  const hasAccess = hasClarionAnalysisAccess(profile, subscription, bloodwork)

  useEffect(() => {
    if (authLoading || !user) return
    if (profile === null && !loading) return
    if (!hasAccess && profile !== null) router.replace("/paywall")
  }, [authLoading, user, loading, profile, hasAccess, router])

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
    [profile]
  )
  const analysisResults = useMemo(
    () =>
      bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
        ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
        : [],
    [bloodwork, profileForAnalysis]
  )

  const priorityContext = useMemo(() => buildPriorityContextFromProfile(profile), [profile])

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10, priorityContext),
    [analysisResults, priorityContext]
  )

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-tab-shell dashboard-actions-env">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading…</p>
        </div>
      </main>
    )
  }

  if (!user) return null

  const noBloodwork = !bloodwork?.biomarker_inputs || Object.keys(bloodwork.biomarker_inputs).length === 0
  if (noBloodwork) {
    const awaitingUpload = hasLabPersonalizationAccess(profile, bloodwork)
    return (
      <main className="dashboard-tab-shell dashboard-actions-env">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Your plan</h1>
            <p className="dashboard-tab-subtitle">One priority at a time. Start with #1.</p>
          </header>
          <LabUpgradeCallout
            awaitingUpload={awaitingUpload}
            intro={
              awaitingUpload
                ? "Complete your first bloodwork panel to see your personalized action list and product recommendations."
                : "Lab-matched priorities and product recommendations unlock when you add bloodwork and the one-time analysis. Clarion Lite does not replace labs."
            }
          />
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
      </main>
    )
  }

  if (orderedDrivers.length === 0) {
    return (
      <main className="dashboard-tab-shell dashboard-actions-env">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Your plan</h1>
            <p className="dashboard-tab-subtitle">One priority at a time. Start with #1.</p>
          </header>
          <div className="dashboard-tab-card dashboard-actions-none">
            <p className="dashboard-actions-none-text">
              No urgent actions. Your biomarkers are in range. Keep up your current habits and retest on schedule.
            </p>
            <Link href="/dashboard" className="dashboard-tab-link">Back to Home</Link>
            <Link href="/dashboard#protocol" className="dashboard-tab-link">View protocol</Link>
          </div>
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
      </main>
    )
  }

  const optimizedPct = Math.round(Math.min(100, Math.max(0, bloodwork?.score ?? 0)))

  return (
    <main className="dashboard-tab-shell dashboard-actions-env">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title" id="actions-heading">
            Your plan
          </h1>
          <p className="dashboard-tab-subtitle">Your journey—one meaningful step at a time.</p>
        </header>

        <div className="dashboard-actions-opt-banner" role="status">
          <p className="dashboard-actions-opt-banner__text">
            You&apos;re <em>{optimizedPct}%</em> optimized today
          </p>
          <div className="dashboard-actions-day-track" aria-hidden title="Progress through your day" />
        </div>

        <section className="dashboard-actions-list" aria-labelledby="actions-heading">
          <p className="dashboard-action-flip-row-hint">
            Each step is framed as progress—not a problem. Flip the card for food, lifestyle, and products.{" "}
            <strong>Buy</strong> opens Amazon (affiliate).
          </p>
          <div className="dashboard-action-priority-row" role="list">
            {orderedDrivers.map((driver, idx) => {
              const driverRow = findAnalysisResultForDriverMarker(analysisResults, driver.markerName)
              const driverStatus = driverRow?.status ?? driver.status
              const forecast = getImprovementForecast(analysisResults, driver.markerName)
              const actionPlan = getActionPlanForBiomarker(driver.markerName, analysisResults, {
                status: driverStatus,
                value: driverRow?.value,
                profile: profileForAnalysis,
              })
              const products = getAffiliateProductsForBiomarker(
                driver.markerName,
                ["overall_winner", "cheapest", "premium"],
                { status: driverStatus }
              )
              const protocol = getCoreProtocol(driver.markerName)
              const supplementDetail = getSupplementDetail(driver.markerName)
              const foods = protocol?.foods?.slice(0, 5) ?? []
              const lifestyle = protocol?.lifestyle?.slice(0, 3) ?? []
              const paidProtocol = PAID_PROTOCOLS.find(
                (p) => p.biomarkerKey && driver.markerName.toLowerCase().includes(p.biomarkerKey.toLowerCase())
              )
              const guideKey = driver.markerName === "25-OH Vitamin D" ? "Vitamin D" : driver.markerName
              const guides = getGuidesForBiomarker(guideKey)
              const guide = guides[0]
              const statusLower = (driver.status ?? "").toLowerCase()
              const statusTeaser = getPositiveStatusTeaser(statusLower, driver.markerName)
              const isHighUrgency = statusLower === "deficient" || statusLower === "high"
              const primaryProduct = products[0]
              const bestValue = products.find((p) => p.optionType === "cheapest") ?? products[1]
              const bestQuality = products.find((p) => p.optionType === "premium") ?? products[2]
              const progressTitle = getProgressHeadlineForMarker(driver.markerName, driver.label, driverStatus)
              const lifestyleTagline = getLifestyleTaglineForMarker(driver.markerName, driverStatus)
              const visualKind = getMarkerVisualKind(driver.markerName)
              const journey = getJourneyStepCopy(idx + 1)

              return (
                <PriorityMarkerCard
                  key={`${driver.markerName}-${idx}`}
                  priorityIndex={idx + 1}
                  driver={driver}
                  progressTitle={progressTitle}
                  lifestyleTagline={lifestyleTagline}
                  visualKind={visualKind}
                  journey={journey}
                  statusTeaser={statusTeaser}
                  isHighUrgency={isHighUrgency}
                  primaryProduct={primaryProduct}
                  bestValue={bestValue}
                  bestQuality={bestQuality}
                  supplementDetail={supplementDetail}
                  actionPlan={actionPlan}
                  forecast={forecast}
                  foods={foods}
                  lifestyle={lifestyle}
                  guide={guide}
                  paidProtocol={paidProtocol}
                />
              )
            })}
          </div>
        </section>

        <p className="dashboard-actions-disclosure">{AFFILIATE_DISCLOSURE}</p>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>

      <style jsx global>{`
        .dashboard-actions-empty,
        .dashboard-actions-none {
          padding: 24px;
          text-align: center;
        }
        .dashboard-actions-empty-text,
        .dashboard-actions-none-text {
          margin: 0 0 16px;
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .dashboard-actions-cta {
          display: inline-block;
          padding: 12px 24px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          font-weight: 600;
          text-decoration: none;
          border-radius: 10px;
        }
        .dashboard-actions-cta:hover {
          opacity: 0.95;
        }
        .dashboard-actions-none .dashboard-tab-link {
          display: inline-block;
          margin: 0 8px 8px 0;
        }
        .dashboard-actions-list-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 16px;
        }
        .dashboard-actions-list {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .dashboard-action-flip-row-hint {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0 0 14px;
          line-height: 1.4;
        }
        .dashboard-action-priority-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          width: 100%;
          max-width: 42rem;
          margin-inline: auto;
          align-items: stretch;
        }
        @media (max-width: 599px) {
          .dashboard-action-priority-row {
            max-width: none;
          }
        }
        .dashboard-priority-flip {
          margin: 0;
          perspective: 1100px;
          min-height: 440px;
        }
        .dashboard-priority-flip-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: inherit;
          transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          transform: translateZ(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-priority-flip-inner {
            transition-duration: 0.01s;
          }
        }
        .dashboard-priority-flip--flipped .dashboard-priority-flip-inner {
          transform: rotateY(180deg);
        }
        .dashboard-priority-flip:not(.dashboard-priority-flip--flipped) .dashboard-priority-flip-face--back {
          pointer-events: none;
          visibility: hidden;
        }
        .dashboard-priority-flip.dashboard-priority-flip--flipped .dashboard-priority-flip-face--front {
          pointer-events: none;
          visibility: hidden;
        }
        .dashboard-priority-flip-face {
          position: absolute;
          inset: 0;
          border-radius: 26px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .dashboard-priority-flip-face--front {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 0;
          text-align: left;
          cursor: default;
          background: transparent;
        }
        .dashboard-priority-flip-face--front:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .dashboard-priority-flip--urgent .dashboard-priority-flip-face--front {
          border-color: rgba(251, 113, 133, 0.45);
          box-shadow: 0 0 0 1px rgba(251, 113, 133, 0.12), 0 12px 40px rgba(0, 0, 0, 0.4);
        }
        .dashboard-priority-flip--steady .dashboard-priority-flip-face--front {
          border-color: rgba(148, 163, 184, 0.35);
          box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.1), 0 12px 40px rgba(0, 0, 0, 0.35);
        }
        .dashboard-priority-flip-front-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 12px;
        }
        .dashboard-priority-flip-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--color-text-muted);
        }
        .dashboard-priority-purchase {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          text-decoration: none;
          line-height: 1;
        }
        .dashboard-priority-purchase:hover {
          opacity: 0.92;
        }
        .dashboard-priority-purchase--muted {
          background: var(--color-surface);
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
          cursor: default;
        }
        .dashboard-priority-purchase--on-back {
          display: inline-block;
          margin-left: auto;
        }
        .dashboard-priority-flip-hero {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }
        .dashboard-priority-avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--color-bg);
          border: 2px solid var(--color-border);
        }
        .dashboard-priority-avatar--ph {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          color: var(--color-text-secondary);
          background: linear-gradient(145deg, var(--color-surface), var(--color-bg));
        }
        .dashboard-priority-flip-title {
          margin: 0 0 8px;
          font-size: 1.05rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.25;
          color: var(--color-text-primary);
        }
        .dashboard-priority-flip-teaser {
          margin: 0 0 12px;
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.45;
        }
        .dashboard-priority-flip-tap {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: var(--color-text-muted);
        }
        .dashboard-priority-flip-face--back {
          transform: rotateY(180deg) translateZ(1px);
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          background: var(--color-bg);
          text-align: left;
        }
        .dashboard-priority-back-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .dashboard-priority-back-btn {
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        .dashboard-priority-back-btn:hover {
          background: var(--color-accent-soft);
        }
        .dashboard-priority-back-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 12px;
          -webkit-overflow-scrolling: touch;
        }
        .dashboard-priority-back-section-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
          margin: 14px 0 6px;
        }
        .dashboard-priority-back-section-title:first-child {
          margin-top: 0;
        }
        .dashboard-priority-back-body {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin: 0 0 8px;
        }
        .dashboard-priority-back-body--emph {
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .dashboard-priority-back-list {
          margin: 0 0 8px;
          padding-left: 1.15em;
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.45;
        }
        .dashboard-priority-back-list li {
          margin-bottom: 6px;
        }
        .dashboard-priority-back-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-priority-back-link {
          display: inline-block;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          text-decoration: none;
          border-radius: 8px;
        }
        .dashboard-priority-back-link:hover {
          background: var(--color-accent-soft);
        }
        .dashboard-action-supplement-embed {
          margin-top: 4px;
        }
        .dashboard-action-supplement-embed .dashboard-action-product-detail {
          background: var(--color-bg);
        }
        .dashboard-action-primary-supplement {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-action-trust-copy {
          font-size: 11px;
          color: var(--color-text-muted);
          margin: 0 0 8px;
          line-height: 1.35;
        }
        .dashboard-action-product-tiles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: stretch;
        }
        .dashboard-action-product-tile {
          width: 92px;
          flex-shrink: 0;
          padding: 8px 6px;
          margin: 0;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-surface);
          cursor: pointer;
          text-align: center;
          font: inherit;
          color: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .dashboard-action-product-tile:hover {
          border-color: var(--color-accent);
        }
        .dashboard-action-product-tile:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .dashboard-action-product-tile--open {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent-soft, rgba(74, 222, 128, 0.25));
        }
        .dashboard-action-product-tile--rec {
          background: var(--color-accent-soft, rgba(74, 222, 128, 0.06));
        }
        .dashboard-action-product-tile-img {
          width: 56px;
          height: 56px;
          margin: 0 auto 6px;
          object-fit: contain;
          background: var(--color-bg);
          border-radius: 8px;
          display: block;
        }
        .dashboard-action-product-tile-img-ph {
          width: 56px;
          height: 56px;
          margin: 0 auto 6px;
          background: var(--color-border);
          border-radius: 8px;
        }
        .dashboard-action-product-tile-badge {
          display: block;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .dashboard-action-product-tile-title {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.25;
          color: var(--color-text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dashboard-action-product-detail {
          margin-top: 10px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          text-align: left;
        }
        .dashboard-action-product-detail-hint {
          margin: 0;
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        .dashboard-action-product-detail-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .dashboard-action-product-detail-why {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 0 0 10px;
          line-height: 1.45;
        }
        .dashboard-action-product-detail-protocol-kicker {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 6px;
        }
        .dashboard-action-product-detail-protocol {
          margin: 0 0 10px;
          padding: 0;
          list-style: none;
        }
        .dashboard-action-product-detail-protocol li {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin-bottom: 6px;
          padding-left: 1em;
          position: relative;
        }
        .dashboard-action-product-detail-protocol li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: var(--color-text-muted);
        }
        .dashboard-action-product-detail-cta {
          display: inline-block;
          padding: 8px 14px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          font-weight: 600;
          font-size: 12px;
          text-decoration: none;
          border-radius: 8px;
        }
        .dashboard-action-product-detail-cta:hover {
          opacity: 0.95;
        }
        .dashboard-action-products-title,
        .dashboard-action-diet-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 6px;
        }
        .dashboard-actions-disclosure {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 24px 0 16px;
          line-height: 1.5;
        }
      `}</style>
    </main>
  )
}

function uniqAffiliateProducts(
  primary: AffiliateProduct | undefined,
  bestValue: AffiliateProduct | undefined,
  bestQuality: AffiliateProduct | undefined
): AffiliateProduct[] {
  const out: AffiliateProduct[] = []
  const seen = new Set<string>()
  for (const p of [primary, bestValue, bestQuality]) {
    if (p && !seen.has(p.id)) {
      seen.add(p.id)
      out.push(p)
    }
  }
  return out
}

function productOptionBadge(p: AffiliateProduct, primary: AffiliateProduct | undefined): string {
  if (primary && p.id === primary.id) return "Recommended"
  if (p.optionType === "cheapest") return "Value"
  if (p.optionType === "premium") return "Quality"
  if (p.optionType === "overall_winner") return "Top pick"
  return "Option"
}

function ActionSupplementStrip({
  embedded = false,
  driverLabel,
  primaryProduct,
  bestValue,
  bestQuality,
  supplementDetail,
}: {
  embedded?: boolean
  driverLabel: string
  primaryProduct: AffiliateProduct | undefined
  bestValue: AffiliateProduct | undefined
  bestQuality: AffiliateProduct | undefined
  supplementDetail: SupplementDetail | null
}) {
  const tiles = useMemo(
    () => uniqAffiliateProducts(primaryProduct, bestValue, bestQuality),
    [primaryProduct, bestValue, bestQuality]
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const didAutoOpen = useRef(false)
  useEffect(() => {
    if (tiles.length === 0 || didAutoOpen.current) return
    const id = tiles[0].id
    queueMicrotask(() => {
      setOpenId(id)
      didAutoOpen.current = true
    })
  }, [tiles])

  const selected = tiles.find((t) => t.id === openId) ?? null
  const hasProtocol =
    !!(supplementDetail?.timing || supplementDetail?.avoid || supplementDetail?.safetyNotes)

  if (tiles.length === 0) return null

  const body = (
    <>
      <div className="dashboard-action-product-tiles" role="group" aria-label="Supplement options">
        {tiles.map((p) => {
          const isOpen = openId === p.id
          const isRec = !!(primaryProduct && p.id === primaryProduct.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`dashboard-action-product-tile ${isOpen ? "dashboard-action-product-tile--open" : ""} ${isRec ? "dashboard-action-product-tile--rec" : ""}`}
              onClick={() => setOpenId((cur) => (cur === p.id ? null : p.id))}
              aria-expanded={isOpen}
            >
              <span className="dashboard-action-product-tile-badge">{productOptionBadge(p, primaryProduct)}</span>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="dashboard-action-product-tile-img" width={56} height={56} />
              ) : (
                <div className="dashboard-action-product-tile-img-ph" aria-hidden />
              )}
              <span className="dashboard-action-product-tile-title">{p.title}</span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="dashboard-action-product-detail" role="region" aria-label="Selected supplement">
          <h3 className="dashboard-action-product-detail-title">{selected.title}</h3>
          {selected.whyRecommended ? (
            <p className="dashboard-action-product-detail-why">{selected.whyRecommended}</p>
          ) : null}
          {hasProtocol ? (
            <>
              <p className="dashboard-action-product-detail-protocol-kicker">
                Protocol ({driverLabel})
              </p>
              <ul className="dashboard-action-product-detail-protocol">
                {supplementDetail?.timing ? <li>{supplementDetail.timing}</li> : null}
                {supplementDetail?.avoid ? <li>Avoid: {supplementDetail.avoid}</li> : null}
                {supplementDetail?.safetyNotes ? (
                  <li>Discuss with your clinician if needed. {supplementDetail.safetyNotes}</li>
                ) : null}
              </ul>
            </>
          ) : null}
          <a
            href={applyAmazonAssociatesTag(selected.affiliateUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-action-product-detail-cta"
          >
            View on Amazon
          </a>
        </div>
      ) : (
        <p className="dashboard-action-product-detail-hint">Select a product card for dosing notes and the shop link.</p>
      )}
    </>
  )

  if (embedded) {
    return <div className="dashboard-action-supplement-embed">{body}</div>
  }

  return (
    <div className="dashboard-action-primary-supplement">
      <h4 className="dashboard-action-products-title">Supplements</h4>
      <p className="dashboard-action-trust-copy">Tap a card for details, protocol notes, and Amazon (affiliate).</p>
      {body}
    </div>
  )
}
