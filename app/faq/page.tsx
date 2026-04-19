import Link from "next/link"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { FAQ_ITEMS } from "@/src/lib/faqContent"
import { getSupportEmail, getSupportMailtoHref } from "@/src/lib/supportContact"

export const metadata = {
  title: "FAQ & Help | Clarion Labs",
  description: "Common questions about Clarion Labs—account, billing, labs, dashboard, and support.",
}

export default function FaqPage() {
  const supportEmail = getSupportEmail()
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <main className="terms-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="terms-container">
        <ClarionLabsLogo variant="page" href="/" linkClassName="terms-logo" />
        <h1 className="terms-title">Frequently asked questions</h1>
        <p className="terms-body" style={{ marginBottom: 24 }}>
          Quick answers about accounts, labs, the dashboard, and how Clarion fits alongside your clinician.
        </p>

        {FAQ_ITEMS.map((item) => (
          <section key={item.id} className="terms-section" id={item.id} aria-labelledby={`faq-${item.id}-heading`}>
            <h2 id={`faq-${item.id}-heading`} className="terms-heading">
              {item.question}
            </h2>
            <p className="terms-body">{item.answer}</p>
          </section>
        ))}

        <section className="terms-section" aria-labelledby="faq-email-heading">
          <h2 id="faq-email-heading" className="terms-heading">
            Email support
          </h2>
          <p className="terms-body">
            For billing, access, or bugs we can’t resolve in the Help chat, reach us at{" "}
            <a href={getSupportMailtoHref()} className="faq-inline-link">
              {supportEmail}
            </a>
            .
          </p>
        </section>

        <p className="terms-footer-note">For education only. Not medical advice.</p>

        <p className="terms-back">
          <Link href="/">← Back to home</Link>
          {" · "}
          <Link href="/terms">Terms &amp; Disclaimer</Link>
          {" · "}
          <Link href="/legal/privacy">Privacy</Link>
        </p>
      </div>
    </main>
  )
}
