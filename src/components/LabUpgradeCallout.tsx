import Link from "next/link"

type Props = {
  /** User purchased the one-time analysis but has not saved lab values yet. */
  awaitingUpload?: boolean
  /** First paragraph under the page header. */
  intro: string
}

/**
 * When the user has dashboard access (e.g. Clarion Lite) but not lab personalization,
 * show a single upgrade path. When they already paid for analysis, keep the softer “add labs” CTA.
 */
export function LabUpgradeCallout({ awaitingUpload, intro }: Props) {
  if (awaitingUpload) {
    return (
      <div className="dashboard-tab-card dashboard-biomarkers-empty">
        <p className="dashboard-biomarkers-empty-text">{intro}</p>
        <Link href="/?step=labs" className="dashboard-actions-cta">
          Add bloodwork
        </Link>
      </div>
    )
  }
  return (
    <div className="dashboard-tab-card dashboard-lab-upgrade-callout">
      <p className="dashboard-lab-upgrade-callout__eyebrow">Full Clarion</p>
      <p className="dashboard-biomarkers-empty-text">{intro}</p>
      <p className="dashboard-lab-upgrade-callout__muted" role="note">
        Clarion Lite is education only—not a substitute for labs or medical care. Full Clarion adds biomarker scoring,
        trends, and lab-matched context.
      </p>
      <div className="dashboard-lab-upgrade-callout__actions">
        <Link href="/paywall" className="dashboard-actions-cta">
          Add bloodwork &amp; full analysis
        </Link>
        <Link href="/dashboard" className="dashboard-tab-link dashboard-lab-upgrade-callout__secondary">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
