import Link from "next/link"
import { notFound } from "next/navigation"
import { getGuideBySlug } from "@/src/lib/guides"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"
import { getBiomarkerContext } from "@/src/lib/biomarkerContext"
import { getEvidenceForBiomarker } from "@/src/lib/recommendationEvidence"
import { getActionPlanForBiomarker } from "@/src/lib/actionPlans"
import { getRelatedBiomarkers } from "@/src/lib/biomarkerRelationships"
import { getGuidesForBiomarker } from "@/src/lib/guides"
import { getLongTermInsight } from "@/src/lib/longTermInsights"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return { title: "Guide | Clarion Labs", description: "Educational guides for biomarkers and wellness." }
  return {
    title: `${guide.title} | Clarion Labs`,
    description: guide.description || `How to improve ${guide.biomarkerKey}. Education only — discuss with your clinician.`,
  }
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const biomarkerKey = guide.biomarkerKey
  const entry = biomarkerDatabase[biomarkerKey]
  const whatItDoes = entry?.whatItDoes?.length ? entry.whatItDoes : null
  const symptomsLow = entry?.symptomsLow?.length ? entry.symptomsLow : null
  const symptomsHigh = entry?.symptomsHigh?.length ? entry.symptomsHigh : null
  const possibleContributors = getBiomarkerContext(biomarkerKey, "low", null)
  const evidence = getEvidenceForBiomarker(biomarkerKey)
  const actionPlan = getActionPlanForBiomarker(biomarkerKey)
  const relatedBiomarkers = getRelatedBiomarkers(biomarkerKey)
  const longTermInsight = getLongTermInsight(biomarkerKey)

  return (
    <main className="guides-shell">
      <div className="guides-container">
        <header className="guides-header">
          <Link href="/guides" className="guides-back">← All guides</Link>
          <h1 className="guides-title">{guide.title}</h1>
          <p className="guides-subtitle">{guide.description}</p>
        </header>

        {(whatItDoes || symptomsLow || symptomsHigh || possibleContributors.length > 0 || evidence) && (
          <div className="guides-layers">
            {whatItDoes && (
              <section className="guides-layer">
                <h3 className="guides-layer-title">What {biomarkerKey} does</h3>
                <ul className="guides-layer-list">
                  {whatItDoes.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {symptomsLow && (
              <section className="guides-layer">
                <h3 className="guides-layer-title">Symptoms of low {biomarkerKey}</h3>
                <ul className="guides-layer-list">
                  {symptomsLow.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {symptomsHigh && (
              <section className="guides-layer">
                <h3 className="guides-layer-title">When {biomarkerKey} is high</h3>
                <ul className="guides-layer-list">
                  {symptomsHigh.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {possibleContributors.length > 0 && (
              <section className="guides-layer">
                <h3 className="guides-layer-title">Possible contributors</h3>
                <ul className="guides-layer-list">
                  {possibleContributors.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {evidence && (
              <p className="guides-evidence">
                <strong>Evidence:</strong> {evidence.label}
              </p>
            )}
            {relatedBiomarkers.length > 0 && (
              <div className="guides-related">
                <span className="guides-related-label">Connected to:</span>
                <div className="guides-related-pills">
                  {relatedBiomarkers.map((rel) => {
                    const guides = getGuidesForBiomarker(rel.markerKey)
                    const slug = guides[0]?.slug
                    return slug ? (
                      <Link key={rel.markerKey} href={`/guides/${slug}`} className="guides-related-pill">
                        {rel.label}
                      </Link>
                    ) : (
                      <span key={rel.markerKey} className="guides-related-pill guides-related-pill-static">
                        {rel.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {actionPlan && (
          <section className="guides-action-plan">
            <h2 className="guides-action-plan-title">Improve {actionPlan.biomarkerKey} plan</h2>
            <div className="guides-action-plan-section">
              <h3 className="guides-action-plan-heading">Daily</h3>
              <ul className="guides-action-plan-list">
                {actionPlan.dailyActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div className="guides-action-plan-section">
              <h3 className="guides-action-plan-heading">Weekly</h3>
              <ul className="guides-action-plan-list">
                {actionPlan.weeklyActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <p className="guides-action-plan-retest">
              <strong>Retest:</strong> {actionPlan.retestWindow}
            </p>
            {actionPlan.sourceGuideSlug && (
              <Link href={`/guides/${actionPlan.sourceGuideSlug}`} className="guides-action-plan-link">
                View full guide
              </Link>
            )}
          </section>
        )}

        <article
          className="guides-body"
          dangerouslySetInnerHTML={{ __html: guide.body.trim() }}
        />
        {longTermInsight && (
          <footer className="guides-footer">
            <p className="guides-footer-insight">Why this matters long-term: {longTermInsight}</p>
          </footer>
        )}
      </div>
    </main>
  )
}
