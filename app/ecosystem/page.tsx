"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { useTheme } from "@/src/contexts/ThemeContext"
import "./ecosystem.css"

type NodeDef = {
  id: string
  label: string
  href: string
  angle: number
  primary?: boolean
}

const PRIMARY_NODES: NodeDef[] = [
  { id: "protocol", label: "Log protocol", href: "/dashboard#protocol", angle: 0, primary: true },
  { id: "supplements", label: "Take supplements", href: "/dashboard/plan", angle: 180, primary: true },
]

const SECONDARY_NODES: NodeDef[] = [
  { id: "biomarkers", label: "Biomarkers", href: "/dashboard/biomarkers", angle: 0 },
  { id: "report", label: "Report", href: "/dashboard/analysis", angle: 90 },
  { id: "learn", label: "Learn", href: "/guides", angle: 180 },
  { id: "shop", label: "Shop", href: "/dashboard/shop", angle: 270 },
]

export default function EcosystemPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { resolvedTheme } = useTheme()
  const [listView, setListView] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/login?next=%2Fecosystem")
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="ecosystem-page ecosystem-page--loading" data-theme-light={resolvedTheme === "light" ? "true" : "false"}>
        <p className="ecosystem-hint" style={{ marginTop: "40vh" }}>
          Loading…
        </p>
      </div>
    )
  }

  const allNodes = [...PRIMARY_NODES, ...SECONDARY_NODES]

  return (
    <div className="ecosystem-page" data-theme-light={resolvedTheme === "light" ? "true" : "false"}>
      <div className="ecosystem-top-bar">
        <Link href="/dashboard" className="ecosystem-back">
          ← Dashboard
        </Link>
        <button type="button" className="ecosystem-toggle" onClick={() => setListView((v) => !v)} aria-pressed={listView}>
          {listView ? "Orbit view" : "List view"}
        </button>
      </div>

      {!listView ? (
        <>
          <div className="ecosystem-stage" aria-hidden={false}>
            <div className="ecosystem-center-glow" aria-hidden />
            <div className="ecosystem-center">
              <h1 className="ecosystem-center-title">Clarion</h1>
              <p className="ecosystem-center-sub">Your system — tap a node to open the real tool. No extra steps.</p>
            </div>

            <div className="ecosystem-ring ecosystem-ring--inner" aria-label="Primary actions">
              {PRIMARY_NODES.map((n) => (
                <div key={n.id} className="ecosystem-node" style={{ ["--angle" as string]: `${n.angle}deg` }}>
                  <div className="ecosystem-node-inner">
                    <Link href={n.href} className="ecosystem-node-link ecosystem-node-link--primary" prefetch={false}>
                      {n.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="ecosystem-ring ecosystem-ring--outer" aria-label="More">
              {SECONDARY_NODES.map((n) => (
                <div key={n.id} className="ecosystem-node" style={{ ["--angle" as string]: `${n.angle}deg` }}>
                  <div className="ecosystem-node-inner">
                    <Link href={n.href} className="ecosystem-node-link" prefetch={false}>
                      {n.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="ecosystem-hint">
            Slow drift keeps spatial context; links go straight to the page. Prefer a scannable list? Use List view.
          </p>
        </>
      ) : (
        <>
          <ul className="ecosystem-list" aria-label="All destinations">
            {allNodes.map((n) => (
              <li key={n.id} className={`ecosystem-list-item${n.primary ? " ecosystem-list-item--primary" : ""}`}>
                <Link href={n.href} prefetch={false}>
                  {n.primary ? <span className="ecosystem-list-kicker">Today</span> : null}
                  <span>{n.label}</span>
                  <span aria-hidden style={{ opacity: 0.45 }}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="ecosystem-hint">Same destinations as the map — faster to scan on small screens.</p>
        </>
      )}
    </div>
  )
}
