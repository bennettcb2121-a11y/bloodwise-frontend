import Link from "next/link"
import { GUIDES } from "@/src/lib/guides"
import { PAID_PROTOCOLS } from "@/src/lib/paidProtocols"

export const metadata = {
  title: "Guides & Protocols | Clarion Labs",
  description: "How to improve key health markers — iron, vitamin D, gut health, and more. Education only; discuss with your clinician.",
}

export default function GuidesPage() {
  const sortedGuides = [...GUIDES].sort((a, b) => a.order - b.order)
  return (
    <main className="guides-shell">
      <div className="guides-container">
        <header className="guides-header">
          <Link href="/dashboard" className="guides-back">← Back to Dashboard</Link>
          <h1 className="guides-title">Guides & protocols</h1>
          <p className="guides-subtitle">Evidence-based steps to improve key health markers. Free guides and optional paid protocols.</p>
        </header>
        <h2 className="guides-section-title">Free guides</h2>
        <ul className="guides-list">
          {sortedGuides.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/guides/${guide.slug}`} className="guides-card">
                <h2 className="guides-card-title">{guide.title}</h2>
                <p className="guides-card-desc">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="guides-section-title">Paid protocols</h2>
        <ul className="guides-list">
          {PAID_PROTOCOLS.map((protocol) => (
            <li key={protocol.slug}>
              <Link href={`/protocols/${protocol.slug}`} className="guides-card guides-card-paid">
                <h2 className="guides-card-title">{protocol.title}</h2>
                <p className="guides-card-desc">{protocol.description}</p>
                <span className="guides-card-price">From ${(protocol.priceCents / 100).toFixed(2)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
