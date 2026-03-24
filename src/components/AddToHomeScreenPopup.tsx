"use client"

import React, { useEffect, useState } from "react"
import { Smartphone } from "lucide-react"

const STORAGE_KEY = "clarion_add_to_homescreen_dismissed"

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function AddToHomeScreenPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (isIOS() && !localStorage.getItem(STORAGE_KEY)) {
        setShow(true)
      }
    } catch {
      setShow(false)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="clarion-popup-overlay" role="dialog" aria-labelledby="a2hs-title" aria-modal="true">
      <div className="clarion-popup-card clarion-a2hs-popup">
        <div className="clarion-a2hs-icon" aria-hidden>
          <Smartphone size={36} strokeWidth={2} />
        </div>
        <h2 id="a2hs-title" className="clarion-popup-title">Add Clarion to your Home Screen</h2>
        <p className="clarion-popup-text">
          Use Clarion like an app: open from your home screen and get a full-screen experience.
        </p>
        <ol className="clarion-a2hs-steps">
          <li>In Safari, tap the <strong>Share</strong> button (square with an arrow) at the bottom.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top right.</li>
        </ol>
        <button type="button" className="clarion-popup-btn" onClick={dismiss}>
          Got it
        </button>
      </div>
      <style jsx>{`
        .clarion-popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          animation: clarion-fade-in 0.2s ease;
        }
        .clarion-popup-card {
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: var(--clarion-card-radius, 14px);
          padding: 28px 24px;
          max-width: 380px;
          width: 100%;
          box-shadow: var(--shadow-md);
        }
        .clarion-a2hs-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--color-accent);
        }
        .clarion-popup-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 10px;
          text-align: center;
        }
        .clarion-popup-text {
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0 0 20px;
          text-align: center;
        }
        .clarion-a2hs-steps {
          margin: 0 0 24px;
          padding-left: 20px;
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }
        .clarion-a2hs-steps li {
          margin-bottom: 10px;
        }
        .clarion-a2hs-steps li:last-child {
          margin-bottom: 0;
        }
        .clarion-popup-btn {
          display: block;
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 500;
          color: var(--color-accent-contrast);
          background: var(--color-accent);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .clarion-popup-btn:hover {
          background: var(--color-accent-hover);
        }
        @keyframes clarion-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
