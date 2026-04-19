import { describe, it, expect } from "vitest"
import { pathMatchesHref, homeLinkIsActive, primarySidebarLinkIsActive, groupHasActiveChild } from "./dashboardNav"
import { DASHBOARD_NAV_GROUPS } from "./dashboardNav"

describe("dashboardNav", () => {
  it("matches dashboard home exactly", () => {
    expect(pathMatchesHref("/dashboard", "/dashboard")).toBe(true)
    expect(pathMatchesHref("/dashboard/biomarkers", "/dashboard")).toBe(false)
  })

  it("matches guides and nested guide slugs", () => {
    expect(pathMatchesHref("/guides", "/guides")).toBe(true)
    expect(pathMatchesHref("/guides/foo", "/guides")).toBe(true)
  })

  it("matches hash protocol on dashboard", () => {
    expect(pathMatchesHref("/dashboard", "/dashboard#protocol")).toBe(true)
    expect(pathMatchesHref("/dashboard/plan", "/dashboard#protocol")).toBe(false)
  })

  it("matches hash daily-check-in on dashboard home", () => {
    expect(pathMatchesHref("/dashboard", "/dashboard#daily-check-in")).toBe(true)
  })

  it("homeLinkIsActive only on exact /dashboard", () => {
    expect(homeLinkIsActive("/dashboard")).toBe(true)
    expect(homeLinkIsActive("/dashboard/plan")).toBe(false)
  })

  it("primarySidebarLinkIsActive for Home, Stack, Report", () => {
    expect(primarySidebarLinkIsActive("/dashboard", "/dashboard")).toBe(true)
    expect(primarySidebarLinkIsActive("/dashboard/plan", "/dashboard")).toBe(false)
    expect(primarySidebarLinkIsActive("/dashboard/plan", "/dashboard/plan")).toBe(true)
    expect(primarySidebarLinkIsActive("/dashboard", "/dashboard/plan")).toBe(false)
    expect(primarySidebarLinkIsActive("/dashboard/analysis", "/dashboard/analysis")).toBe(true)
    expect(primarySidebarLinkIsActive("/dashboard", "/dashboard/analysis")).toBe(false)
  })

  it("More group contains Biomarkers", () => {
    const more = DASHBOARD_NAV_GROUPS.find((g) => g.id === "more")!
    expect(more.children.some((c) => c.href === "/dashboard/biomarkers" && c.label === "Biomarkers")).toBe(true)
    expect(groupHasActiveChild("/dashboard/biomarkers", more)).toBe(true)
    expect(groupHasActiveChild("/settings", more)).toBe(true)
  })
})
