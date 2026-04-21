"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, X, ListChecks, Droplets, ScanLine, Pill, FileText } from "lucide-react"
import { useAuth } from "@/src/contexts/AuthContext"
import { SupplementCheckerSheet } from "@/src/components/SupplementCheckerSheet"
import { WhatITakeSheet } from "@/src/components/WhatITakeSheet"

/**
 * One-tap entry to logging: protocol, daily habits, supplements, barcode checker.
 * Fixed bottom-right on mobile (above home indicator); bottom-left on desktop.
 */
export function DashboardLogFab() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [checkerOpen, setCheckerOpen] = useState(false)
  const [supplementsSheetOpen, setSupplementsSheetOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen && !checkerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen, checkerOpen])

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false))
  }, [pathname])

  if (!pathname?.startsWith("/dashboard") && !pathname?.startsWith("/labs")) return null

  return (
    <>
      <button
        type="button"
        className={`dashboard-log-fab ${menuOpen ? "dashboard-log-fab--open" : ""}`}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label={menuOpen ? "Close log menu" : "Open log menu"}
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? <X size={28} strokeWidth={2} aria-hidden /> : <Plus size={28} strokeWidth={2} aria-hidden />}
      </button>

      {menuOpen && (
        <>
          <button type="button" className="dashboard-log-fab-backdrop" aria-label="Close log menu" onClick={() => setMenuOpen(false)} />
          <div className="dashboard-log-fab-panel" role="dialog" aria-modal="true" aria-labelledby="dashboard-log-fab-title">
            <h2 id="dashboard-log-fab-title" className="dashboard-log-fab-title">
              Log &amp; track
            </h2>
            <p className="dashboard-log-fab-sub">Log from anywhere.</p>
            <ul className="dashboard-log-fab-list">
              <li>
                <Link
                  href="/dashboard#protocol"
                  className="dashboard-log-fab-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <ListChecks size={20} strokeWidth={2} aria-hidden />
                  <span>
                    <strong>Today&apos;s protocol</strong>
                    <small>Check off a dose</small>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard#daily-check-in"
                  className="dashboard-log-fab-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <Droplets size={20} strokeWidth={2} aria-hidden />
                  <span>
                    <strong>Daily inputs</strong>
                    <small>Water, sun, sleep, activity</small>
                  </span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="dashboard-log-fab-item dashboard-log-fab-item--button"
                  onClick={() => {
                    setMenuOpen(false)
                    setSupplementsSheetOpen(true)
                  }}
                >
                  <Pill size={20} strokeWidth={2} aria-hidden />
                  <span>
                    <strong>Add what I take</strong>
                    <small>Photo, barcode, paste a list, or type</small>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="dashboard-log-fab-item dashboard-log-fab-item--button"
                  onClick={() => {
                    setMenuOpen(false)
                    setCheckerOpen(true)
                  }}
                >
                  <ScanLine size={20} strokeWidth={2} aria-hidden />
                  <span>
                    <strong>Check a single bottle</strong>
                    <small>Scan to see if it fits your labs</small>
                  </span>
                </button>
              </li>
              <li>
                <Link
                  href="/labs/upload"
                  className="dashboard-log-fab-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <FileText size={20} strokeWidth={2} aria-hidden />
                  <span>
                    <strong>Upload labs</strong>
                    <small>PDF or photos — AI reads them</small>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}

      {checkerOpen && (
        <SupplementCheckerSheet
          userId={user?.id}
          onClose={() => setCheckerOpen(false)}
          onRequestSupplementsYouTake={() => setSupplementsSheetOpen(true)}
        />
      )}
      {supplementsSheetOpen && <WhatITakeSheet userId={user?.id} onClose={() => setSupplementsSheetOpen(false)} />}
    </>
  )
}
