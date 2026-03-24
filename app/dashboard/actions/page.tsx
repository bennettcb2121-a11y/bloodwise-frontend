"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getSubscription } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow, ProfileRow, SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { getOrderedScoreDrivers, penaltyForStatus, getImprovementForecast } from "@/src/lib/scoreBreakdown"
import { getStatusTone, inferWhyItMatters } from "@/src/lib/priorityEngine"
import { getActionPlanForBiomarker } from "@/src/lib/actionPlans"
import { getAffiliateProductsForBiomarker } from "@/src/lib/affiliateProducts"
import type { AffiliateProduct } from "@/src/lib/affiliateProducts"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { getCoreProtocol } from "@/src/lib/coreBiomarkerProtocols"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import { getGuidesForBiomarker } from "@/src/lib/guides"
import { PAID_PROTOCOLS } from "@/src/lib/paidProtocols"
import { hasClarionAnalysisAccess } from "@/src/lib/accessGate"

export default function ActionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
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

  const profileForAnalysis = profile ? { age: profile.age, sex: profile.sex, sport: profile.sport } : {}
  const analysisResults = useMemo(
    () =>
      bloodwork?.biomarker_inputs && Object.keys(bloodwork.biomarker_inputs).length > 0
        ? analyzeBiomarkers(bloodwork.biomarker_inputs, profileForAnalysis)
        : [],
    [bloodwork?.biomarker_inputs, profileForAnalysis]
  )

  const orderedDrivers = useMemo(
    () => getOrderedScoreDrivers(analysisResults, 10),
    [analysisResults]
  )

  if (authLoading || (user && loading)) {
    return (
      <main className="dashboard-tab-shell">
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
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-container">
          <header className="dashboard-tab-header">
            <h1 className="dashboard-tab-title">Your plan</h1>
            <p className="dashboard-tab-subtitle">One priority at a time. Start with #1.</p>
          </header>
          <div className="dashboard-tab-card dashboard-actions-empty">
            <p className="dashboard-actions-empty-text">
              Complete your first bloodwork panel to see your personalized action list and product recommendations.
            </p>
            <Link href="/?step=labs" className="dashboard-actions-cta">
              Start your analysis
            </Link>
          </div>
          <p className="dashboard-tab-muted">
            <Link href="/dashboard">Back to Home</Link>
          </p>
        </div>
      </main>
    )
  }

  if (orderedDrivers.length === 0) {
    return (
      <main className="dashboard-tab-shell">
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

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Your plan</h1>
          <p className="dashboard-tab-subtitle">One priority at a time. Start with #1.</p>
        </header>

        <section className="dashboard-actions-list" aria-labelledby="actions-heading">
          {orderedDrivers.map((driver, idx) => {
            const tone = getStatusTone(driver.status)
            const impact = penaltyForStatus(driver.status)
            const forecast = getImprovementForecast(analysisResults, driver.markerName)
            const actionPlan = getActionPlanForBiomarker(driver.markerName, analysisResults)
            const products = getAffiliateProductsForBiomarker(driver.markerName, [
              "overall_winner",
              "cheapest",
              "premium",
            ])
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
            const oneLineGoingOn =
              statusLower === "deficient"
                ? `Low ${driver.label} is affecting your energy and recovery.`
                : statusLower === "high"
                  ? `Elevated ${driver.label} may need attention.`
                  : `${driver.label} could be optimized.`
            const isHighUrgency = statusLower === "deficient" || statusLower === "high"
            const primaryProduct = products[0]
            const bestValue = products.find((p) => p.optionType === "cheapest") ?? products[1]
            const bestQuality = products.find((p) => p.optionType === "premium") ?? products[2]

            return (
              <article
                key={`${driver.markerName}-${idx}`}
                className={`dashboard-action-card dashboard-action-card--plan ${isHighUrgency ? "dashboard-action-card--high" : "dashboard-action-card--moderate"}`}
              >
                <h2 className="dashboard-action-headline">
                  Priority #{idx + 1}: {driver.label} — {oneLineGoingOn}
                </h2>
                <p className="dashboard-action-why">Why it matters: {inferWhyItMatters(driver.markerName)}</p>

                {actionPlan?.dailyActions?.[0] && (
                  <div className="dashboard-action-do-this">
                    <span className="dashboard-action-do-this-label">Do this</span>
                    <p className="dashboard-action-do-this-text">{actionPlan.dailyActions[0]}</p>
                  </div>
                )}

                {forecast && (
                  <p className="dashboard-action-impact-line">
                    Improving this could raise your score by ~{forecast.projectedScore - forecast.currentScore} points.
                  </p>
                )}

                {primaryProduct && (
                  <div className="dashboard-action-primary-supplement">
                    <h4 className="dashboard-action-products-title">Best supplement for you</h4>
                    <p className="dashboard-action-trust-copy">Why we recommend this: based on your results and evidence-based support for {driver.label}.</p>
                    <ProductCard key={primaryProduct.id} product={primaryProduct} recommended />
                  </div>
                )}

                {products.length > 1 && (bestValue || bestQuality) && (
                  <div className="dashboard-action-other-supplements">
                    <span className="dashboard-action-other-options-label">Also consider</span>
                    <div className="dashboard-action-products-grid dashboard-action-products-grid--small">
                      {bestValue && bestValue.id !== primaryProduct?.id && (
                        <div className="dashboard-action-secondary-wrap">
                          <span className="dashboard-action-secondary-label">Best value</span>
                          <ProductCard key={bestValue.id} product={bestValue} />
                        </div>
                      )}
                      {bestQuality && bestQuality.id !== primaryProduct?.id && bestQuality.id !== bestValue?.id && (
                        <div className="dashboard-action-secondary-wrap">
                          <span className="dashboard-action-secondary-label">Best quality</span>
                          <ProductCard key={bestQuality.id} product={bestQuality} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(foods.length > 0 || lifestyle.length > 0) && (
                  <div className="dashboard-action-diet">
                    {foods.length > 0 && (
                      <div>
                        <h4 className="dashboard-action-diet-title">Food strategy</h4>
                        <ul className="dashboard-action-diet-list">
                          {foods.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lifestyle.length > 0 && (
                      <div>
                        <h4 className="dashboard-action-diet-title">Lifestyle strategy</h4>
                        <ul className="dashboard-action-diet-list">
                          {lifestyle.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {(supplementDetail?.timing || supplementDetail?.safetyNotes) && (
                  <div className="dashboard-action-protocol-notes">
                    <h4 className="dashboard-action-diet-title">Protocol notes</h4>
                    <ul className="dashboard-action-diet-list">
                      {supplementDetail.timing && <li>{supplementDetail.timing}</li>}
                      {supplementDetail.safetyNotes && <li>Discuss with your clinician if needed. {supplementDetail.safetyNotes}</li>}
                    </ul>
                  </div>
                )}

                <div className="dashboard-action-ctas">
                  {paidProtocol && (
                    <Link href={`/protocols/${paidProtocol.slug}`} className="dashboard-action-cta-secondary">
                      View {paidProtocol.title}
                    </Link>
                  )}
                  {guide && (
                    <Link href={`/guides/${guide.slug}`} className="dashboard-action-cta-secondary">
                      Read {driver.markerName} guide
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </section>

        <p className="dashboard-actions-disclosure">{AFFILIATE_DISCLOSURE}</p>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>

      <style jsx>{`
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
        .dashboard-action-card {
          padding: 20px;
          margin-bottom: 20px;
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: 14px;
          border-left: 4px solid var(--color-border);
        }
        .dashboard-action-card--high {
          border-left-color: var(--color-error, #c53030);
        }
        .dashboard-action-card--moderate {
          border-left-color: var(--color-warning);
        }
        .dashboard-action-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .dashboard-action-priority {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .dashboard-action-urgency {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .dashboard-action-urgency--tone-red {
          background: var(--color-error-soft, rgba(197, 48, 48, 0.12));
          color: var(--color-error, #c53030);
        }
        .dashboard-action-urgency--tone-amber {
          background: var(--color-warning-soft, rgba(245, 158, 11, 0.15));
          color: var(--color-warning);
        }
        .dashboard-action-headline {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 12px;
          line-height: 1.35;
        }
        .dashboard-action-why {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .dashboard-action-do-this {
          margin-bottom: 14px;
          padding: 12px 14px;
          background: var(--color-accent-soft, rgba(74, 222, 128, 0.08));
          border-radius: 10px;
          border-left: 3px solid var(--color-accent);
        }
        .dashboard-action-do-this-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-accent);
          display: block;
          margin-bottom: 4px;
        }
        .dashboard-action-do-this-text {
          font-size: 14px;
          color: var(--color-text-primary);
          margin: 0;
          line-height: 1.45;
        }
        .dashboard-action-impact-line {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0 0 16px;
          line-height: 1.5;
        }
        .dashboard-action-primary-supplement {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-action-trust-copy {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0 0 10px;
          line-height: 1.4;
        }
        .dashboard-action-other-supplements {
          margin-top: 14px;
        }
        .dashboard-action-secondary-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dashboard-action-secondary-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .dashboard-action-protocol-notes {
          margin-top: 14px;
        }
        .dashboard-action-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 8px;
        }
        .dashboard-action-explanation,
        .dashboard-action-impact,
        .dashboard-action-immediate,
        .dashboard-action-forecast {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 8px;
        }
        .dashboard-action-products {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border);
        }
        .dashboard-action-products-title,
        .dashboard-action-diet-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 10px;
        }
        .dashboard-action-recommended-wrap {
          margin-bottom: 14px;
        }
        .dashboard-action-recommended-wrap .dashboard-action-product-card {
          max-width: 280px;
          padding: 14px;
          border: 1px solid var(--color-accent);
          background: var(--color-accent-soft, rgba(74, 222, 128, 0.08));
        }
        .dashboard-action-other-options-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 8px;
        }
        .dashboard-action-products-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        }
        .dashboard-action-products-grid--small {
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        }
        .dashboard-action-product-card {
          padding: 12px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 10px;
        }
        .dashboard-action-product-img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: contain;
          background: var(--color-bg);
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .dashboard-action-product-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .dashboard-action-product-why {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0 0 8px;
          line-height: 1.4;
        }
        .dashboard-action-product-link {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
        }
        .dashboard-action-product-link:hover {
          text-decoration: underline;
        }
        .dashboard-action-diet {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dashboard-action-diet-list {
          margin: 0;
          padding-left: 1.2em;
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .dashboard-action-ctas {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dashboard-action-cta-primary {
          display: inline-block;
          padding: 10px 18px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          border-radius: 10px;
        }
        .dashboard-action-cta-primary:hover {
          opacity: 0.95;
        }
        .dashboard-action-cta-secondary {
          display: inline-block;
          padding: 10px 18px;
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          border-radius: 10px;
        }
        .dashboard-action-cta-secondary:hover {
          background: var(--color-accent-soft);
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

function ProductCard({ product, recommended = false }: { product: AffiliateProduct; recommended?: boolean }) {
  const label =
    recommended
      ? "Recommended"
      : product.optionType === "overall_winner"
        ? "Best value"
        : product.optionType === "cheapest"
          ? "Cheapest"
          : "Best quality"
  return (
    <div className={`dashboard-action-product-card ${recommended ? "dashboard-action-product-card--recommended" : ""}`}>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          className="dashboard-action-product-img"
          width={recommended ? 120 : 160}
          height={recommended ? 120 : 160}
        />
      ) : (
        <div className="dashboard-action-product-img" style={{ background: "var(--color-border)" }} aria-hidden />
      )}
      <span className="dashboard-action-product-why" style={{ display: "block", fontSize: 11, marginBottom: 4 }}>
        {label}
      </span>
      <h4 className="dashboard-action-product-title">{product.title}</h4>
      {product.whyRecommended && (
        <p className="dashboard-action-product-why">{product.whyRecommended}</p>
      )}
      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="dashboard-action-product-link"
      >
        View on Amazon
      </a>
    </div>
  )
}
