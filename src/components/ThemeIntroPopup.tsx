"use client"

import React, { useEffect, useState, useRef } from "react"
import { useAuth } from "@/src/contexts/AuthContext"
import { X } from "lucide-react"

const STORAGE_KEY = "clarion_theme_intro_seen"
const DELAY_MS = 5000

export function ThemeIntroPopup() {
  const { user, loading } = useAuth()
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || loading) return
    if (user) {
      queueMicrotask(() => setShow(false))
      return
    }
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
      timeoutRef.current = setTimeout(() => setShow(true), DELAY_MS)
    } catch {
      queueMicrotask(() => setShow(false))
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [loading, user])

  useEffect(() => {
    if (user) queueMicrotask(() => setShow(false))
  }, [user])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="theme-intro-tooltip" role="dialog" aria-labelledby="theme-intro-title" aria-modal="false">
      <button type="button" className="theme-intro-close" onClick={dismiss} aria-label="Dismiss">
        <X size={16} strokeWidth={2.5} />
      </button>
      <p id="theme-intro-title" className="theme-intro-text">
        Light & dark mode — tap the <strong>sun/moon icon</strong> to switch.
      </p>
      <span className="theme-intro-arrow" aria-hidden />
      <style jsx>{`
        .theme-intro-tooltip {
          position: fixed;
          top: 20px;
          right: 56px;
          z-index: 9999;
          max-width: 200px;
          padding: 12px 32px 12px 14px;
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: 12px;
          box-shadow: var(--shadow-md);
          animation: theme-intro-fade 0.25s ease;
        }
        .theme-intro-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 6px;
        }
        .theme-intro-close:hover {
          color: var(--color-text-primary);
          background: var(--color-surface-elevated);
        }
        .theme-intro-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
          color: var(--color-text-secondary);
        }
        .theme-intro-text strong {
          color: var(--color-text-primary);
        }
        .theme-intro-arrow {
          position: absolute;
          right: -7px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 7px solid transparent;
          border-bottom: 7px solid transparent;
          border-left: 8px solid var(--clarion-card-bg);
          filter: drop-shadow(1px 0 0 var(--clarion-card-border));
          animation: theme-intro-bounce 0.8s ease-in-out infinite;
        }
        @keyframes theme-intro-fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes theme-intro-bounce {
          0%, 100% { transform: translateY(-50%) translateX(0); }
          50% { transform: translateY(-50%) translateX(4px); }
        }
      `}</style>
    </div>
  )
}
