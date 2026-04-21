"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import {
  DASHBOARD_PRIMARY_LINKS,
  DASHBOARD_NAV_GROUPS,
  groupHasActiveChild,
  primarySidebarLinkIsActive,
  pathMatchesHref,
} from "@/src/lib/dashboardNav"

type Props = {
  /** Close mobile drawer after navigation */
  onNavigate?: () => void
  /** Prefix for aria ids when two instances exist (unused — single nav) */
  idPrefix?: string
}

export function DashboardSidebarNav({ onNavigate, idPrefix = "dash-nav" }: Props) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const g of DASHBOARD_NAV_GROUPS) {
      if (groupHasActiveChild(pathname, g)) next[g.id] = true
    }
    queueMicrotask(() => setOpenSections((prev) => ({ ...prev, ...next })))
  }, [pathname])

  const toggle = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <nav className="dashboard-sidebar-nav" aria-label="Dashboard">
      <div className="dashboard-sidebar-primary" role="list">
        {DASHBOARD_PRIMARY_LINKS.map((entry) => {
          const active = primarySidebarLinkIsActive(pathname, entry.href)
          const Icon = entry.icon
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`dashboard-sidebar-link dashboard-sidebar-link--home ${active ? "dashboard-sidebar-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              role="listitem"
            >
              <Icon className="dashboard-sidebar-link-icon" size={20} strokeWidth={2} aria-hidden />
              <span>{entry.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="dashboard-sidebar-divider" aria-hidden />

      {DASHBOARD_NAV_GROUPS.map((group) => {
        const hasActive = groupHasActiveChild(pathname, group)
        const expanded = openSections[group.id] ?? hasActive
        const panelId = `${idPrefix}-sub-${group.id}`
        const btnId = `${idPrefix}-btn-${group.id}`

        return (
          <div key={group.id} className="dashboard-sidebar-group">
            <button
              type="button"
              id={btnId}
              className={`dashboard-sidebar-group-toggle ${hasActive ? "dashboard-sidebar-group-toggle--has-active" : ""}`}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggle(group.id)}
            >
              <group.icon className="dashboard-sidebar-link-icon" size={20} strokeWidth={2} aria-hidden />
              <span className="dashboard-sidebar-group-label">{group.label}</span>
              <ChevronDown
                className={`dashboard-sidebar-chevron ${expanded ? "dashboard-sidebar-chevron--open" : ""}`}
                size={18}
                strokeWidth={2}
                aria-hidden
              />
            </button>
            {expanded ? (
              <ul id={panelId} className="dashboard-sidebar-sub" role="list">
                {group.children.map((child) => {
                  const active = pathMatchesHref(pathname, child.href)
                  return (
                    <li key={`${group.id}-${child.href}`}>
                      <Link
                        href={child.href}
                        className={`dashboard-sidebar-sublink ${active ? "dashboard-sidebar-sublink--active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                      >
                        {child.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
