"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Sparkles, Package, Search, Link as LinkIcon, FlaskConical } from "lucide-react"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import { SUPPLEMENT_PRESETS } from "@/src/lib/supplementMetadata"
import { getAmazonSearchUrl, getRecommendedAmazonUrlForPreset } from "@/src/lib/stackAffiliate"
import {
  SUPPLEMENT_SHOP_CATALOG,
  type LabAwarenessStatus,
  type SupplementShopEntry,
} from "@/src/lib/supplementShopCatalog"
import { computeLabAwarenessStatus } from "@/src/lib/supplementShopLabAwareness"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState } from "@/src/lib/bloodwiseDb"
import { SupplementPickerSheet } from "@/src/components/SupplementPickerSheet"
import { StackIntakeWizardModal } from "@/src/components/StackIntakeWizardModal"

export default function DashboardShopPage() {
  const { user } = useAuth()
  const [amazonQuery, setAmazonQuery] = useState("")
  const [bloodwork, setBloodwork] = useState<Record<string, string | number> | null>(null)
  const [profileForAnalysis, setProfileForAnalysis] = useState<Record<string, unknown>>({})
  const [currentSupplements, setCurrentSupplements] = useState<string>("")
  const [openEntry, setOpenEntry] = useState<SupplementShopEntry | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)

  // Hydrate lab context so we can do lab-aware "you're good / prioritize" banners.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    loadSavedState(user.id)
      .then(({ profile, bloodwork: bw }) => {
        if (cancelled) return
        setBloodwork(bw?.biomarker_inputs ?? {})
        setProfileForAnalysis(
          profile
            ? {
                age: profile.age,
                sex: profile.sex,
                sport: profile.sport,
                training_focus: profile.training_focus?.trim() || undefined,
              }
            : {}
        )
        setCurrentSupplements(profile?.current_supplements ?? "")
      })
      .catch(() => {
        if (cancelled) return
        setBloodwork({})
        setProfileForAnalysis({})
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Lab-aware status cache for every preset in the curated catalog.
  const statusByPreset = useMemo<Record<string, LabAwarenessStatus>>(() => {
    const out: Record<string, LabAwarenessStatus> = {}
    if (!bloodwork) return out
    Object.values(SUPPLEMENT_SHOP_CATALOG).forEach((entry) => {
      out[entry.presetId] = computeLabAwarenessStatus(entry, bloodwork, profileForAnalysis)
    })
    return out
  }, [bloodwork, profileForAnalysis])

  const handleOpenCatalogEntry = useCallback((presetId: string) => {
    const entry = SUPPLEMENT_SHOP_CATALOG[presetId]
    if (entry) setOpenEntry(entry)
  }, [])

  const curatedIds = useMemo(() => new Set(Object.keys(SUPPLEMENT_SHOP_CATALOG)), [])
  const curatedPresets = useMemo(
    () => SUPPLEMENT_PRESETS.filter((p) => curatedIds.has(p.id)),
    [curatedIds]
  )
  const uncuratedPresets = useMemo(
    () => SUPPLEMENT_PRESETS.filter((p) => !curatedIds.has(p.id)),
    [curatedIds]
  )

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Shop</h1>
          <p className="dashboard-tab-subtitle">
            Three vetted picks for every supplement — cheapest, highest potency, and Clarion&apos;s default.
            Click any supplement to see what your labs say before you buy.
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

        {bloodwork && Object.keys(bloodwork).length === 0 ? (
          <div className="shop-no-labs-banner" role="note">
            <FlaskConical size={18} strokeWidth={2} aria-hidden />
            <div>
              <p className="shop-no-labs-title">Upload labs to personalize this</p>
              <p className="shop-no-labs-body">
                We&apos;ll tell you if a supplement is a priority, a maintenance dose, or already covered — based on your actual numbers.
              </p>
            </div>
            <Link href="/labs/upload" className="shop-no-labs-cta">
              Upload labs
            </Link>
          </div>
        ) : null}

        <section className="shop-catalog" aria-labelledby="shop-catalog-heading">
          <h2 id="shop-catalog-heading" className="dashboard-shop-section-heading">
            Curated supplements
          </h2>
          <p className="shop-catalog-hint">
            Tap any supplement for Clarion&apos;s three picks. Links open Amazon with our affiliate tag —{" "}
            <a href="#shop-disclosure" className="dashboard-tab-link">
              see disclosure
            </a>
            .
          </p>

          <div className="shop-catalog-grid" role="group" aria-label="Curated supplements">
            {curatedPresets.map((p) => {
              const status = statusByPreset[p.id] ?? "unknown"
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`shop-tile shop-tile--status-${status}`}
                  onClick={() => handleOpenCatalogEntry(p.id)}
                  aria-label={`See ${p.label} picks`}
                >
                  <span className="shop-tile-label">{p.label}</span>
                  <span className={`shop-tile-pill shop-tile-pill--${status}`}>
                    {STATUS_PILL_LABEL[status]}
                  </span>
                </button>
              )
            })}
          </div>

          {uncuratedPresets.length > 0 ? (
            <>
              <h3 className="shop-catalog-sub-heading">More supplements</h3>
              <p className="shop-catalog-hint">
                We haven&apos;t curated tiered picks for these yet — tapping opens a brand-targeted Amazon search with our affiliate tag.
              </p>
              <div className="current-supplements-editor-amazon-quick" role="group" aria-label="Additional supplements">
                {uncuratedPresets.map((p) => (
                  <a
                    key={p.id}
                    href={getRecommendedAmazonUrlForPreset(p)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="current-supplements-editor-amazon-quick-link"
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </section>

        <section className="shop-tools" aria-labelledby="shop-tools-heading">
          <h2 id="shop-tools-heading" className="dashboard-shop-section-heading">
            Shopping tools
          </h2>
          <div className="shop-tools-grid">
            <div className="shop-tool">
              <div className="shop-tool-icon" aria-hidden>
                <Search size={18} strokeWidth={2} />
              </div>
              <div className="shop-tool-body">
                <p className="shop-tool-title">Custom Amazon search</p>
                <p className="shop-tool-desc">
                  Search any supplement on Amazon — we&apos;ll add our affiliate tag automatically so you can keep supporting Clarion.
                </p>
                <div className="shop-tool-row">
                  <input
                    id="dashboard-shop-amazon-q"
                    type="search"
                    autoComplete="off"
                    className="settings-input shop-tool-input"
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
                    className="shop-tool-btn"
                    onClick={() => {
                      const q = amazonQuery.trim() || "Supplement"
                      window.open(getAmazonSearchUrl(q), "_blank", "noopener,noreferrer")
                    }}
                  >
                    Search Amazon
                  </button>
                </div>
              </div>
            </div>

            <div className="shop-tool">
              <div className="shop-tool-icon" aria-hidden>
                <LinkIcon size={18} strokeWidth={2} />
              </div>
              <div className="shop-tool-body">
                <p className="shop-tool-title">Already have a product link?</p>
                <p className="shop-tool-desc">
                  Paste any supplement URL and we&apos;ll extract the name, check how it fits your lab picture, and log it to your stack.
                </p>
                <button
                  type="button"
                  className="shop-tool-btn shop-tool-btn--outline"
                  onClick={() => setPasteOpen(true)}
                >
                  Paste a product link
                </button>
              </div>
            </div>
          </div>
        </section>

        <p id="shop-disclosure" className="current-supplements-editor-amazon-disclosure">
          {AFFILIATE_DISCLOSURE}
        </p>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>

      <SupplementPickerSheet
        entry={openEntry}
        labStatus={openEntry ? (statusByPreset[openEntry.presetId] ?? "unknown") : "unknown"}
        onClose={() => setOpenEntry(null)}
      />

      <StackIntakeWizardModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        currentSupplements={currentSupplements}
        onComplete={(serialized) => {
          // We don't persist from the shop context — the wizard is purely for lab-fit
          // check + visibility. The user's stack is edited from Settings / Plan.
          setCurrentSupplements(serialized)
          setPasteOpen(false)
        }}
      />

      <style jsx>{`
        .shop-no-labs-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin: 12px 0 18px;
          background: color-mix(in srgb, #3b82f6 10%, transparent);
          border: 1px solid color-mix(in srgb, #3b82f6 22%, transparent);
          border-radius: 12px;
          color: var(--color-text-primary);
        }
        .shop-no-labs-banner :global(svg) {
          color: #3b82f6;
          flex-shrink: 0;
        }
        .shop-no-labs-banner > div {
          flex: 1;
          min-width: 0;
        }
        .shop-no-labs-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }
        .shop-no-labs-body {
          margin: 2px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--color-text-secondary);
        }
        .shop-no-labs-cta {
          flex-shrink: 0;
          padding: 8px 14px;
          border-radius: 10px;
          background: #3b82f6;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .shop-catalog {
          margin-top: 24px;
        }
        .shop-catalog-hint {
          margin: 4px 0 14px;
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
        .shop-catalog-sub-heading {
          margin: 28px 0 6px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
        }

        .shop-catalog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 560px) {
          .shop-catalog-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 900px) {
          .shop-catalog-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        .shop-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 14px;
          border-radius: 12px;
          background: var(--color-bg, #0b0b0c);
          border: 1px solid var(--clarion-card-border, rgba(255, 255, 255, 0.08));
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.18s ease, transform 0.18s ease;
        }
        .shop-tile:hover {
          border-color: color-mix(in srgb, var(--color-text-primary) 30%, transparent);
          transform: translateY(-1px);
        }
        .shop-tile--status-priority {
          border-color: color-mix(in srgb, #ea580c 40%, transparent);
        }
        .shop-tile--status-optimal {
          border-color: color-mix(in srgb, #16a34a 32%, transparent);
        }
        .shop-tile-label {
          flex: 1;
          min-width: 0;
        }
        .shop-tile-pill {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
          color: var(--color-text-muted);
        }
        .shop-tile-pill--optimal {
          background: color-mix(in srgb, #16a34a 20%, transparent);
          color: #16a34a;
        }
        .shop-tile-pill--priority {
          background: color-mix(in srgb, #ea580c 22%, transparent);
          color: #ea580c;
        }
        .shop-tile-pill--maintenance {
          background: color-mix(in srgb, #3b82f6 20%, transparent);
          color: #3b82f6;
        }
        .shop-tile-pill--unknown {
          background: color-mix(in srgb, var(--color-text-muted) 18%, transparent);
          color: var(--color-text-muted);
        }

        .shop-tools {
          margin-top: 32px;
        }
        .shop-tools-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 10px;
        }
        @media (min-width: 720px) {
          .shop-tools-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .shop-tool {
          display: flex;
          gap: 12px;
          padding: 14px 14px;
          border-radius: 12px;
          background: var(--color-bg, #0b0b0c);
          border: 1px solid var(--clarion-card-border, rgba(255, 255, 255, 0.08));
        }
        .shop-tool-icon {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--color-text-muted) 12%, transparent);
          color: var(--color-text-primary);
        }
        .shop-tool-body {
          flex: 1;
          min-width: 0;
        }
        .shop-tool-title {
          margin: 0 0 2px;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .shop-tool-desc {
          margin: 0 0 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--color-text-secondary);
        }
        .shop-tool-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .shop-tool-input {
          flex: 1;
          min-width: 0;
        }
        .shop-tool-btn {
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--color-accent, #16a34a);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          border: 0;
          cursor: pointer;
          transition: filter 0.18s ease;
        }
        .shop-tool-btn:hover {
          filter: brightness(1.08);
        }
        .shop-tool-btn--outline {
          background: transparent;
          color: var(--color-text-primary);
          border: 1px solid var(--clarion-card-border, rgba(255, 255, 255, 0.12));
        }
        .shop-tool-btn--outline:hover {
          background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
        }
      `}</style>
    </main>
  )
}

const STATUS_PILL_LABEL: Record<LabAwarenessStatus, string> = {
  optimal: "Dialed in",
  maintenance: "Maintenance",
  priority: "Priority",
  unknown: "No lab yet",
}
