"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Sparkles, Package } from "lucide-react"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { SUPPLEMENT_PRESETS } from "@/src/lib/supplementMetadata"
import { getAmazonSearchUrl, getRecommendedAmazonUrlForPreset } from "@/src/lib/stackAffiliate"

export default function DashboardShopPage() {
  const [amazonQuery, setAmazonQuery] = useState("")

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Shop</h1>
          <p className="dashboard-tab-subtitle">
            Lab-informed Actions, your plan, and Amazon links—curated product pages where we have a core pick, search everywhere else. Use <strong>SiteStripe</strong> on Amazon to copy a link.
          </p>
        </header>

        <div className="dashboard-shop-grid">
          <Link href="/dashboard/actions" className="dashboard-shop-tile dashboard-shop-tile--link">
            <Sparkles className="dashboard-shop-tile-icon" size={22} strokeWidth={2} aria-hidden />
            <span className="dashboard-shop-tile-title">Personalized picks</span>
            <span className="dashboard-shop-tile-desc">Supplements matched to your biomarkers and priorities.</span>
          </Link>
          <Link href="/dashboard/plan" className="dashboard-shop-tile dashboard-shop-tile--link">
            <Package className="dashboard-shop-tile-icon" size={22} strokeWidth={2} aria-hidden />
            <span className="dashboard-shop-tile-title">Plan &amp; reorder</span>
            <span className="dashboard-shop-tile-desc">Your protocol, inventory, and saved product links.</span>
          </Link>
        </div>

        <section className="current-supplements-editor-amazon current-supplements-editor-amazon--sitestripe dashboard-shop-amazon" aria-labelledby="shop-amazon-heading">
          <h2 id="shop-amazon-heading" className="dashboard-shop-section-heading">
            Amazon <span className="dashboard-shop-section-muted">(SiteStripe)</span>
          </h2>
          <p className="current-supplements-editor-amazon-sitestripe-hint">
            Chips with a core biomarker match open Clarion&apos;s recommended bottle; others run a tagged Amazon search. Use SiteStripe to copy a link into your stack or{" "}
            <Link href="/settings" className="dashboard-tab-link">
              profile supplements
            </Link>
            .
          </p>
          <div className="current-supplements-editor-amazon-quick" role="group" aria-label="Quick Amazon picks and searches">
            {SUPPLEMENT_PRESETS.map((p) => (
              <a
                key={p.id}
                href={getRecommendedAmazonUrlForPreset(p)}
                target="_blank"
                rel="noreferrer noopener"
                className="current-supplements-editor-amazon-quick-link"
                title="Opens Amazon (curated product or search)"
              >
                {p.label}
              </a>
            ))}
          </div>
          <div className="current-supplements-editor-amazon-search-row">
            <label htmlFor="dashboard-shop-amazon-q" className="current-supplements-editor-sr-label">
              Custom Amazon search
            </label>
            <input
              id="dashboard-shop-amazon-q"
              type="search"
              autoComplete="off"
              className="settings-input current-supplements-editor-amazon-search-input"
              placeholder="e.g. magnesium glycinate capsules"
              value={amazonQuery}
              onChange={(e) => setAmazonQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const q = amazonQuery.trim() || "Supplement"
                  window.open(getAmazonSearchUrl(q), "_blank", "noopener,noreferrer")
                }
              }}
            />
            <button
              type="button"
              className="current-supplements-editor-amazon-search-btn"
              onClick={() => {
                const q = amazonQuery.trim() || "Supplement"
                window.open(getAmazonSearchUrl(q), "_blank", "noopener,noreferrer")
              }}
            >
              Search Amazon
            </button>
          </div>
          <p className="current-supplements-editor-amazon-disclosure">{AFFILIATE_DISCLOSURE}</p>
        </section>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>
    </main>
  )
}
