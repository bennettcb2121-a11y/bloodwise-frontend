"use client"

import React, { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import {
  defaultBiomarkerReassurance,
  type BiomarkerOverviewPayload,
  type BiomarkerTeaserInsight,
} from "@/src/lib/biomarkerAiContext"
import {
  BIOMARKER_AI_LOADING_LINES,
  BIOMARKER_AI_LOADING_LINE_MS,
} from "@/src/lib/biomarkerInsightLoadingLines"

/** Title + subtext for clear hierarchy (no paragraph-style single block). */
export function insightHeadlineParts(needsReview: number): { title: string; subtext: string } {
  if (needsReview <= 0) {
    return { title: "You're on track", subtext: "Nothing stands out to review" }
  }
  const w = needsReview === 1 ? "area" : "areas"
  return { title: "You're on track", subtext: `${needsReview} ${w} to review` }
}

/** @deprecated Prefer insightHeadlineParts for structured UI */
export function insightStatusLine(needsReview: number): string {
  const { title, subtext } = insightHeadlineParts(needsReview)
  return `${title}. ${subtext}.`
}

/** Sky-aware accent from dashboard home (`--env-accent`); falls back to brand green. */
const ACCENT = "var(--env-accent, var(--color-accent))"

export function BiomarkerOverviewTeaser({
  status,
  payload,
  errorMessage,
  onRetry,
  onFullReview,
  needsAttentionCount,
  teaserInsights,
}: {
  status: "loading" | "error" | "ready"
  payload: BiomarkerOverviewPayload | null
  errorMessage: string | null
  onRetry: () => void
  onFullReview: () => void
  needsAttentionCount: number
  teaserInsights: BiomarkerTeaserInsight[]
}) {
  const [loadingLineIndex, setLoadingLineIndex] = useState(0)

  useEffect(() => {
    if (status !== "loading") return
    const id = window.setInterval(() => {
      setLoadingLineIndex((i) => (i + 1) % BIOMARKER_AI_LOADING_LINES.length)
    }, BIOMARKER_AI_LOADING_LINE_MS)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === "loading") queueMicrotask(() => setLoadingLineIndex(0))
  }, [status])

  /* Theme tokens only — no hardcoded cream (#faf9f6) or dark blocks that can lose the cascade. */
  const cardShell = `
    .bio-insights-card-shell {
      position: relative;
      border-radius: 18px;
      padding: 20px 20px 20px 22px;
      overflow: hidden;
      color: var(--color-text-primary);
      background: linear-gradient(
        165deg,
        color-mix(in srgb, ${ACCENT} 12%, var(--clarion-card-bg)) 0%,
        color-mix(in srgb, ${ACCENT} 5%, var(--color-bg)) 100%
      );
      border: 1px solid color-mix(in srgb, ${ACCENT} 18%, var(--color-border));
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--color-text-primary) 10%, transparent),
        inset 0 -1px 0 color-mix(in srgb, var(--color-text-primary) 5%, transparent),
        var(--shadow-sm);
    }
  `

  if (status === "loading") {
    return (
      <section className="bio-insights" aria-busy="true" aria-label="Generating insights">
        <div className="bio-insights-card-shell">
          <div className="bio-insights-accent-rule" aria-hidden />
          <div className="bio-insights-loading-block">
            <p
              key={loadingLineIndex}
              className="bio-insights-loading-line"
              aria-live="polite"
            >
              {BIOMARKER_AI_LOADING_LINES[loadingLineIndex]}
            </p>
            <div className="bio-insights-loading-dots" aria-hidden>
              {BIOMARKER_AI_LOADING_LINES.map((_, i) => (
                <span
                  key={i}
                  className={`bio-insights-loading-dot ${i === loadingLineIndex ? "bio-insights-loading-dot--active" : ""}`}
                />
              ))}
            </div>
            <div className="bio-insights-loading-bar-wrap" aria-hidden>
              <div className="bio-insights-loading-bar" />
            </div>
          </div>
        </div>
        <style jsx>{`
          ${cardShell}
          .bio-insights {
            margin-bottom: 16px;
          }
          .bio-insights-accent-rule {
            position: absolute;
            left: 0;
            top: 12px;
            bottom: 12px;
            width: 2px;
            border-radius: 2px;
            background: linear-gradient(
              180deg,
              color-mix(in srgb, ${ACCENT} 55%, transparent),
              color-mix(in srgb, ${ACCENT} 15%, transparent)
            );
          }
          .bio-insights-loading-block {
            position: relative;
            padding-left: 12px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }
          .bio-insights-loading-line {
            margin: 0;
            font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.45;
            color: var(--color-text-muted);
            animation: bio-ai-line-in 0.45s ease;
          }
          @keyframes bio-ai-line-in {
            from {
              opacity: 0.4;
              transform: translateY(3px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .bio-insights-loading-dots {
            display: flex;
            gap: 8px;
            justify-content: flex-start;
          }
          .bio-insights-loading-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--color-text-muted);
            opacity: 0.28;
            transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
          }
          .bio-insights-loading-dot--active {
            background: ${ACCENT};
            opacity: 1;
            transform: scale(1.2);
          }
          .bio-insights-loading-bar-wrap {
            width: 100%;
            height: 3px;
            background: var(--color-border);
            border-radius: 2px;
            overflow: hidden;
          }
          .bio-insights-loading-bar {
            height: 100%;
            width: 38%;
            border-radius: 2px;
            background: ${ACCENT};
            animation: bio-ai-bar 1.5s ease-in-out infinite;
          }
          @keyframes bio-ai-bar {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(180%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `}</style>
      </section>
    )
  }

  if (status === "error") {
    return (
      <section className="bio-insights" role="alert">
        <div className="bio-insights-card-shell">
          <div className="bio-insights-accent-rule" aria-hidden />
          <p className="bio-insights-error">{errorMessage ?? "Something went wrong."}</p>
          <button type="button" className="bio-insights-retry" onClick={onRetry}>
            <RefreshCw size={14} strokeWidth={2} aria-hidden />
            Try again
          </button>
        </div>
        <style jsx>{`
          ${cardShell}
          .bio-insights {
            margin-bottom: 16px;
          }
          .bio-insights-accent-rule {
            position: absolute;
            left: 0;
            top: 12px;
            bottom: 12px;
            width: 2px;
            border-radius: 2px;
            background: linear-gradient(
              180deg,
              color-mix(in srgb, ${ACCENT} 45%, transparent),
              color-mix(in srgb, ${ACCENT} 12%, transparent)
            );
          }
          .bio-insights-error {
            position: relative;
            margin: 0 0 12px;
            padding-left: 10px;
            font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
            font-size: 13px;
            font-weight: 400;
            color: var(--color-text-secondary);
            line-height: 1.45;
          }
          .bio-insights-retry {
            margin-left: 10px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-secondary);
            background: transparent;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            cursor: pointer;
          }
          .bio-insights-retry:hover {
            background: color-mix(in srgb, ${ACCENT} 8%, transparent);
            color: var(--color-text-primary);
          }
        `}</style>
      </section>
    )
  }

  if (!payload) return null

  const { title, subtext } = insightHeadlineParts(needsAttentionCount)
  const reassuranceParagraph =
    payload.reassurance?.trim() || defaultBiomarkerReassurance(needsAttentionCount)

  return (
    <section className="bio-insights" aria-label="Insights">
      <div className="bio-insights-card-shell">
        <div className="bio-insights-accent-rule" aria-hidden />
        <div className="bio-insights-body">
          <h3 className="bio-insights-title">{title}</h3>
          <p className="bio-insights-subtext">{subtext}</p>

          {teaserInsights.length > 0 && (
            <ul className="bio-insights-flagged" aria-label="Markers to review">
              {teaserInsights.map((row, i) => (
                <li key={`${row.markerLabel}-${i}`} className="bio-insights-flagged-item">
                  <div className="bio-insights-flagged-head">
                    <span className="bio-insights-flagged-marker">{row.markerLabel}</span>
                    <span className="bio-insights-flagged-value">{row.valueSummary}</span>
                  </div>
                  <p className="bio-insights-flagged-worry">{row.worryLine}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="bio-insights-reassurance">{reassuranceParagraph}</p>

          <div className="bio-insights-guided" aria-label="Full review contents">
            <p className="bio-insights-guided-label">In the full review</p>
            <ul className="bio-insights-guided-list">
              <li>More context on each marker and what often affects it.</li>
              <li>Notes you can bring to your clinician—if and when you want them.</li>
            </ul>
          </div>

          <p className="bio-insights-edu">Education only—not medical advice.</p>

          <button
            type="button"
            className="bio-insights-cta"
            onClick={onFullReview}
            disabled={!payload.fullOverview?.trim()}
          >
            <span className="bio-insights-cta-label">Open full review</span>
            <span className="bio-insights-cta-arrow" aria-hidden>
              →
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        ${cardShell}
        .bio-insights {
          margin-bottom: 16px;
        }
        .bio-insights-accent-rule {
          position: absolute;
          left: 0;
          top: 14px;
          bottom: 14px;
          width: 2px;
          border-radius: 2px;
          background: linear-gradient(
            180deg,
            color-mix(in srgb, ${ACCENT} 50%, transparent),
            color-mix(in srgb, ${ACCENT} 12%, transparent)
          );
        }
        .bio-insights-body {
          position: relative;
          padding-left: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: var(--color-text-primary);
        }
        .bio-insights-title {
          margin: 0;
          font-family: var(--font-heading), Georgia, "Times New Roman", serif;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.025em;
          line-height: 1.25;
          color: var(--color-text-primary);
        }
        .bio-insights-subtext {
          margin: 0;
          margin-top: -2px;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.35;
          letter-spacing: 0.01em;
          color: var(--color-text-muted);
        }
        .bio-insights-flagged {
          margin: 4px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bio-insights-flagged-item {
          margin: 0;
          padding: 0 0 12px;
          border-bottom: 1px solid color-mix(in srgb, ${ACCENT} 10%, var(--color-border));
        }
        .bio-insights-flagged-item:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }
        .bio-insights-flagged-head {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .bio-insights-flagged-marker {
          font-family: var(--font-heading), Georgia, "Times New Roman", serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }
        .bio-insights-flagged-value {
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          letter-spacing: 0.01em;
          color: var(--color-text-secondary);
        }
        .bio-insights-flagged-worry {
          margin: 8px 0 0;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.45;
          letter-spacing: 0.01em;
          color: var(--color-text-muted);
        }
        .bio-insights-reassurance {
          margin: 0;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.55;
          letter-spacing: 0.01em;
          color: var(--color-text-secondary);
        }
        .bio-insights-guided {
          margin: 0;
          padding-top: 12px;
          border-top: 1px solid color-mix(in srgb, ${ACCENT} 12%, var(--color-border));
        }
        .bio-insights-guided-label {
          margin: 0 0 8px;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
        }
        .bio-insights-guided-list {
          margin: 0;
          padding: 0 0 0 1.1rem;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.45;
          color: var(--color-text-secondary);
        }
        .bio-insights-guided-list li {
          margin-bottom: 6px;
        }
        .bio-insights-guided-list li:last-child {
          margin-bottom: 0;
        }
        .bio-insights-edu {
          margin: 2px 0 0;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.35;
          letter-spacing: 0.02em;
          color: var(--color-text-muted);
        }
        .bio-insights-cta {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          padding: 8px 14px 8px 16px;
          font-family: var(--font-jakarta), var(--font-body), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--color-accent);
          background: color-mix(in srgb, var(--color-accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-accent) 38%, var(--color-border));
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        .bio-insights-cta:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-accent) 20%, transparent);
          border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
        }
        .bio-insights-cta:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }
        .bio-insights-cta-arrow {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0;
          opacity: 0.9;
        }
      `}</style>
    </section>
  )
}
