import type { LucideIcon } from "lucide-react"
import { Home, BarChart3, ClipboardList, BookOpen, User } from "lucide-react"

export type NavChild = { href: string; label: string }

export type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: NavChild[]
}

/** Top link (Garmin-style home) */
export const DASHBOARD_HOME = {
  href: "/dashboard",
  label: "Home",
  icon: Home,
} as const

/** Collapsible sections with sub-routes */
export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    id: "data",
    label: "Data",
    icon: BarChart3,
    children: [
      { href: "/dashboard/biomarkers", label: "Biomarkers" },
      { href: "/dashboard/actions", label: "Actions" },
      { href: "/dashboard/trends", label: "Trends" },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    icon: ClipboardList,
    children: [
      { href: "/dashboard/tracking", label: "Tracking & habits" },
      { href: "/dashboard/plan", label: "Plan" },
      { href: "/dashboard#protocol", label: "Today's plan" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: BookOpen,
    children: [
      { href: "/guides", label: "Guides" },
      { href: "/dashboard/feed", label: "Feed" },
      { href: "/dashboard/challenges", label: "Challenges" },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    children: [
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

export function groupHasActiveChild(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => pathMatchesHref(pathname, c.href))
}
