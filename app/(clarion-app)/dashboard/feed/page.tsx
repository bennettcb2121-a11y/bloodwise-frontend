"use client"

import React from "react"
import Link from "next/link"
import { NEWSLETTER_FEED } from "@/src/lib/newsletterFeed"
import { LEARNING_FEED } from "@/src/lib/learningFeed"
import { Newspaper } from "lucide-react"

export default function FeedPage() {
  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Feed</h1>
          <p className="dashboard-tab-subtitle">Newsletter and learning from Clarion.</p>
        </header>

        {LEARNING_FEED.length > 0 && (
          <section className="dashboard-feed-section" aria-labelledby="learning-feed-heading">
            <h2 id="learning-feed-heading" className="dashboard-feed-section-title">From the research</h2>
            <ul className="dashboard-tab-feed-list" aria-label="Learning insights">
              {LEARNING_FEED.map((item) => (
                <li key={item.id}>
                  <article className="dashboard-tab-card dashboard-tab-feed-card">
                    {item.biomarkerTag && <span className="dashboard-feed-tag">{item.biomarkerTag}</span>}
                    <h2 className="dashboard-tab-feed-title">{item.title}</h2>
                    <p className="dashboard-tab-feed-desc">{item.body}</p>
                    <Link href={item.link} className="dashboard-tab-link dashboard-tab-feed-cta">
                      Read more
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {NEWSLETTER_FEED.length > 0 && (
          <section className="dashboard-feed-section" aria-labelledby="newsletter-feed-heading">
            <h2 id="newsletter-feed-heading" className="dashboard-feed-section-title">Newsletter</h2>
            <ul className="dashboard-tab-feed-list" aria-label="Newsletter issues">
              {NEWSLETTER_FEED.map((item) => (
                <li key={item.id}>
                  <article className="dashboard-tab-card dashboard-tab-feed-card">
                    <h2 className="dashboard-tab-feed-title">{item.title}</h2>
                    <p className="dashboard-tab-feed-date">{new Date(item.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    {item.description && <p className="dashboard-tab-feed-desc">{item.description}</p>}
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="dashboard-tab-link dashboard-tab-feed-cta">Read more</a>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {NEWSLETTER_FEED.length === 0 && LEARNING_FEED.length === 0 && (
          <div className="dashboard-tab-card dashboard-tab-empty">
            <Newspaper size={40} strokeWidth={1.5} className="dashboard-tab-empty-icon" aria-hidden />
            <p className="dashboard-tab-empty-text">No posts yet. Check back soon for tips and updates from Clarion.</p>
            <Link href="/dashboard" className="dashboard-tab-link">Back to Home</Link>
          </div>
        )}

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>
    </main>
  )
}
