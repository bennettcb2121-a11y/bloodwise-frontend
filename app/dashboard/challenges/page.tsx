"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/src/contexts/AuthContext"
import { getProtocolLogHistory, getBloodworkHistory } from "@/src/lib/bloodwiseDb"
import type { BloodworkSaveRow } from "@/src/lib/bloodwiseDb"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import { CHALLENGES, getChallengeProgress, getChallengeExtra, type DayCompletedMap } from "@/src/lib/challenges"
import { Check } from "lucide-react"

function dayCompleted(checks: Record<string, boolean>): boolean {
  return Object.values(checks).some(Boolean)
}

export default function ChallengesPage() {
  const { user } = useAuth()
  const [byDate, setByDate] = useState<DayCompletedMap>({})
  const [bloodworkHistory, setBloodworkHistory] = useState<BloodworkSaveRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getProtocolLogHistory(user.id, 30).then((history) => {
        const map: DayCompletedMap = {}
        history.forEach(({ log_date, checks }) => {
          map[log_date] = dayCompleted(checks)
        })
        return map
      }).catch(() => ({} as DayCompletedMap)),
      getBloodworkHistory(user.id, 10).catch(() => [] as BloodworkSaveRow[]),
    ]).then(([map, history]) => {
      setByDate(map)
      setBloodworkHistory(history)
    }).finally(() => setLoading(false))
  }, [user?.id])

  const challengeExtra = useMemo(
    () => getChallengeExtra(bloodworkHistory, (inputs, profile) => analyzeBiomarkers(inputs, profile)),
    [bloodworkHistory]
  )

  const sortedChallenges = useMemo(() => {
    const rows = CHALLENGES.map((challenge) => {
      const prog = getChallengeProgress(challenge, byDate, challengeExtra)
      return { challenge, ...prog }
    })
    rows.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const ra = a.challenge.target > 0 ? a.current / a.challenge.target : 0
      const rb = b.challenge.target > 0 ? b.current / b.challenge.target : 0
      return rb - ra
    })
    return rows
  }, [byDate, challengeExtra])

  if (loading) {
    return (
      <main className="dashboard-tab-shell">
        <div className="dashboard-tab-loading">
          <div className="dashboard-tab-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading challenges…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="dashboard-tab-shell">
      <div className="dashboard-tab-container">
        <header className="dashboard-tab-header">
          <h1 className="dashboard-tab-title">Challenges</h1>
          <p className="dashboard-tab-subtitle">
            Light, motivating milestones — celebrate small wins on the way to better labs.
          </p>
        </header>

        <ul className="dashboard-tab-challenges-list" aria-label="Challenges">
          {sortedChallenges.map(({ challenge, current, completed }) => {
            const progressPct = challenge.target > 0 ? Math.min(100, (current / challenge.target) * 100) : 0
            const progressLabel =
              challenge.rule === "protocol_streak"
                ? `${current} / ${challenge.target} days`
                : challenge.rule === "protocol_week"
                  ? `${current} / ${challenge.target} days this week`
                  : `${current} / ${challenge.target}`
            return (
              <li key={challenge.id}>
                <div className={`dashboard-tab-card dashboard-tab-challenge-card ${completed ? "dashboard-tab-challenge-card--done" : ""}`}>
                  {completed && (
                    <span className="dashboard-tab-challenge-badge" aria-hidden>
                      <Check size={18} strokeWidth={2.5} /> Done
                    </span>
                  )}
                  <h2 className="dashboard-tab-challenge-name">{challenge.name}</h2>
                  <p className="dashboard-tab-challenge-desc">{challenge.description}</p>
                  <div className="dashboard-tab-challenge-progress">
                    <div className="dashboard-tab-challenge-progress-bar">
                      <div
                        className="dashboard-tab-challenge-progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="dashboard-tab-challenge-progress-text">{progressLabel}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="dashboard-tab-muted">
          <Link href="/dashboard">Back to Home</Link>
        </p>
      </div>
    </main>
  )
}
