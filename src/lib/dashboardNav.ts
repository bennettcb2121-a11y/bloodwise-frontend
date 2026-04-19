import type { LucideIcon } from "lucide-react"
import { Home, FileText, ClipboardList, MoreHorizontal } from "lucide-react"

export type NavChild = { href: string; label: string }

export type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: NavChild[]
}

/** Top-of-sidebar links (peer to Home — e.g. shop, analysis report). */
export const DASHBOARD_PRIMARY_LINKS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/plan", label: "Stack", icon: ClipboardList },
  { href: "/dashboard/analysis", label: "Report", icon: FileText },
] as const

/** @deprecated Use DASHBOARD_PRIMARY_LINKS[0] */
export const DASHBOARD_HOME = DASHBOARD_PRIMARY_LINKS[0]

/** Collapsible sections with sub-routes */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    id: "more",
    label: "More",
    icon: MoreHorizontal,
    children: [
      { href: "/dashboard/biomarkers", label: "Biomarkers" },
      { href: "/dashboard/trends", label: "Trends" },
      { href: "/dashboard/tracking", label: "Tracking" },
      { href: "/dashboard/shop", label: "Shop" },
      { href: "/guides", label: "Guides" },
      { href: "/settings", label: "Profile" },
      { href: "/faq", label: "FAQ" },
    ],
  },
]

/**
 * Whether `pathname` should count as active for `href` (supports /guides/*, #protocol on dashboard home).
 */
export function pathMatchesHref(pathname: string, href: string): boolean {
  if (href.includes("#")) {
    const [pathPart] = href.split("#")
    const path = pathPart || "/dashboard"
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  if (href === "/faq") {
    return pathname === "/faq"
  }

  if (href === "/guides") {
    return pathname === "/guides" || pathname.startsWith("/guides/")
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function homeLinkIsActive(pathname: string): boolean {
  return pathname === "/dashboard"
}

/** Active state for primary sidebar links (Home, Stack, Report, …). */
export function primarySidebarLinkIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathMatchesHref(pathname, href)
}

export function groupHasActiveChild(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => pathMatchesHref(pathname, c.href))
}
