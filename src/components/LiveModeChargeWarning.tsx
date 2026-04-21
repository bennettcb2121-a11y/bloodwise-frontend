"use client"

import React, { useCallback, useState } from "react"

/**
 * Launch-week safety interstitial.
 *
 * Clarion just flipped Stripe to live mode, so anyone who tried the app during the
 * test/beta period could easily click a checkout button out of habit and get charged
 * real money. This modal gates any Stripe redirect with a clear "LIVE — real charge"
 * acknowledgment + a link to redeem a free family/friends code.
 *
 * Behavior:
 *   - Renders when `open` is true.
 *   - Calling `onAcknowledge` records a dismissal in sessionStorage so the same tab
 *     won't re-prompt (the parent can still honor the dismissal or skip the modal).
 *   - The parent decides whether to suppress based on `wasAcknowledgedInSession()`.
 *
 * This is intentionally NOT persisted beyond the browser tab — every new session gets
 * the warning again while we're still in launch week.
 */

const SESSION_KEY = "clarion-live-mode-warning-ack"

export function wasAcknowledgedInSession(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1"
  } catch {
    return false
  }
}

export function markAcknowledgedInSession(): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1")
  } catch {
    // sessionStorage can throw in some private-browsing contexts — fine, user just
    // sees the warning again on the next click.
  }
}

type WarningProps = {
  onProceed: () => void
  onCancel: () => void
  amountLabel: string
  interval: string
}

/**
 * Outer wrapper: mounts/unmounts the inner dialog based on `open` so the checkbox state
 * (and any other local state) gets reset automatically without a sync-in-effect dance.
 */
export function LiveModeChargeWarning({
  open,
  ...rest
}: WarningProps & { open: boolean }) {
  if (!open) return null
  return <WarningDialog {...rest} />
}

function WarningDialog({ onProceed, onCancel, amountLabel, interval }: WarningProps) {
  const [checked, setChecked] = useState(false)

  const handleProceed = useCallback(() => {
    if (!checked) return
    markAcknowledgedInSession()
    onProceed()
  }, [checked, onProceed])

  return (
    <div
      className="live-warn-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-warn-title"
    >
      <div className="live-warn-card">
        <div className="live-warn-eyebrow">
          <span className="live-warn-pill">LIVE</span>
          <span className="live-warn-eyebrow-text">Real charge — no longer test mode</span>
        </div>
        <h2 id="live-warn-title" className="live-warn-title">
          Heads up: this will charge your card {amountLabel} {interval}.
        </h2>
        <p className="live-warn-body">
          Clarion was in test mode during the beta. We&apos;re now live, so continuing here will
          place a real <strong>{amountLabel}</strong> charge on the card you enter at Stripe. If
          you were sent a friends-and-family code, close this and paste it into the
          &quot;Redeem unlock code&quot; box on the paywall instead.
        </p>
        <label className="live-warn-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            I understand this is a real {amountLabel} charge and not a test.
          </span>
        </label>
        <div className="live-warn-actions">
          <button
            type="button"
            className="live-warn-btn live-warn-btn--ghost"
            onClick={onCancel}
          >
            Never mind
          </button>
          <button
            type="button"
            className="live-warn-btn live-warn-btn--primary"
            onClick={handleProceed}
            disabled={!checked}
          >
            Continue to Stripe
          </button>
        </div>
      </div>
      <style jsx>{`
        .live-warn-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .live-warn-card {
          max-width: 460px;
          width: 100%;
          padding: 24px 26px 22px;
          background: var(--clarion-card-bg, #fff);
          color: var(--color-text-primary, #1a1a1a);
          border: 1px solid var(--clarion-card-border, rgba(0, 0, 0, 0.1));
          border-radius: 16px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
        }
        .live-warn-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .live-warn-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 9999px;
          background: #b24646;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }
        .live-warn-eyebrow-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: #b24646;
          text-transform: uppercase;
        }
        .live-warn-title {
          margin: 0 0 12px;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.25;
          color: var(--color-text-primary, #1a1a1a);
        }
        .live-warn-body {
          margin: 0 0 18px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-secondary, #444);
        }
        .live-warn-check {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 0 18px;
          padding: 10px 12px;
          border-radius: 10px;
          background: color-mix(
            in srgb,
            var(--color-surface-elevated, #f4f4f4) 60%,
            transparent
          );
          border: 1px solid var(--clarion-card-border, rgba(0, 0, 0, 0.08));
          font-size: 13px;
          color: var(--color-text-primary, #1a1a1a);
          cursor: pointer;
          line-height: 1.4;
        }
        .live-warn-check input {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          accent-color: #b24646;
          cursor: pointer;
        }
        .live-warn-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .live-warn-btn {
          padding: 9px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .live-warn-btn--ghost {
          background: transparent;
          border-color: var(--clarion-card-border, rgba(0, 0, 0, 0.15));
          color: var(--color-text-secondary, #555);
        }
        .live-warn-btn--ghost:hover {
          background: var(--color-surface-elevated, #f5f5f5);
          color: var(--color-text-primary, #1a1a1a);
        }
        .live-warn-btn--primary {
          background: #b24646;
          border-color: #b24646;
          color: #fff;
        }
        .live-warn-btn--primary:hover:not(:disabled) {
          background: #963a3a;
          border-color: #963a3a;
        }
        .live-warn-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>
    </div>
  )
}
