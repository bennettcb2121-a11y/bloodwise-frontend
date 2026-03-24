"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/src/contexts/AuthContext"
import { loadSavedState, getBloodworkHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { ProtocolTracker } from "@/src/components/ProtocolTracker"

export default function TrackingPage() {
  const { user } = useAuth()
  const [bloodwork, setBloodwork] = useState<BloodworkSaveRow | null>(null)
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadSavedState(user.id)
      .then(({ bloodwork: b }) => {
        setBloodwork(b ?? null)
      })
      .catch(() => setBloodwork(null))
      .finally(() => setLoading(false))
    getBloodworkHistory(user.id, 10)
      .then(setBloodworkHistory)
      .catch(() => setBloodworkHistory([]))
  }, [user?.id])

  if (loading) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading tracking…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Tracking</h1>
          <p className="dashboard-tab-subtitle">Daily protocol and your progress over time.</p>
        </header>

        <section className="dashboard-tab-section" aria-labelledby="tracking-protocol-heading">
          <h2 id="tracking-protocol-heading" className="dashboard-tab-section-title">Today&apos;s plan</h2>
          <ProtocolTracker stackSnapshot={bloodwork?.stack_snapshot} userId={user?.id} />
        </section>

        {bloodworkHistory.length >= 2 && (
          <section className="dashboard-tab-section" aria-labelledby="tracking-journey-heading">
            <h2 id="tracking-journey-heading" className="dashboard-tab-section-title">Your journey</h2>
            <div className="dashboard-tab-card">
              <p className="dashboard-tab-journey-scores">
                {[...bloodworkHistory].reverse().map((row, i) => {
                  const d = row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"
                  const s = row.score != null ? row.score : "—"
                  return `${d}: ${s}`
                }).join(" · ")}
              </p>
              <Link href="/?step=labs" className="dashboard-tab-link">Add new results</Link>
            </div>
          </section>
        )}

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>
    </main>
  )
}
