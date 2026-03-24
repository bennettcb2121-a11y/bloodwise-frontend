"use client"

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { Home, FlaskConical, ListChecks, Activity, BookOpen, Menu, Trophy, Settings as SettingsIcon, Bookmark, HelpCircle, LogOut } from "lucide-react"
import { CLARION_OPEN_ASSISTANT_EVENT } from "@/src/components/ClarionAssistant"
import { AppSplashScreen } from "@/src/components/AppSplashScreen"
import { AppLoadingScreen } from "@/src/components/AppLoadingScreen"
import { ThemeToggle } from "@/src/components/ThemeToggle"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { getSubscription } from "@/src/lib/bloodwiseDb"
import type { SubscriptionRow } from "@/src/lib/bloodwiseDb"
import {
  BRAND_INTRO_LOCAL_KEY,
  BRAND_INTRO_SESSION_KEY,
  BRAND_LOADING_DURATION_MS,
  shouldSkipBrandIntro,
} from "@/src/lib/brandIntro"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/biomarkers", label: "Biomarkers", icon: FlaskConical },
  { href: "/dashboard/actions", label: "Actions", icon: ListChecks },
  { href: "/guides", label: "Guides", icon: Bookmark },
  { href: "/dashboard/challenges", label: "Challenges", icon: Trophy },
  { href: "/dashboard/tracking", label: "Track", icon: Activity },
  { href: "/dashboard/feed", label: "Learn", icon: BookOpen },
] as const

const SPLASH_DURATION_MS = 650
/** First dashboard visit: triathlon Lottie — one full loop so swim, bike, and run are visible. */
const LOADING_FIRST_VISIT_MS = BRAND_LOADING_DURATION_MS
/** Legacy localStorage key from earlier builds — cleared so intro isn’t hidden forever. */
const BRAND_INTRO_LEGACY_LOCAL_KEY = "clarion_dashboard_brand_intro_done"

type AppPhase = "splash" | "loading" | "ready"

/** Isolated so the rest of the layout does not suspend when only `?intro=` is needed. */
function DashboardIntroQuerySync({ onForceBrandIntro }: { onForceBrandIntro: (v: boolean) => void }) {
  const searchParams = useSearchParams()
  const forceBrandIntro = searchParams.get("intro") === "1"
  useLayoutEffect(() => {
    onForceBrandIntro(forceBrandIntro)
  }, [forceBrandIntro, onForceBrandIntro])
  return null
}

function DashboardLayoutInner({
  children,
  forceBrandIntro,
}: {
  children: React.ReactNode
  forceBrandIntro: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [phase, setPhase] = useState<AppPhase>("splash")
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  /** After intro completed this document session, skip on layout remount — not on reload (session flag cleared in beforeunload + reload detection). */
  useLayoutEffect(() => {
    if (authLoading || !user) return
    try {
      if (typeof window !== "undefined") {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
        if (nav?.type === "reload") {
          sessionStorage.removeItem(BRAND_INTRO_SESSION_KEY)
        }
        localStorage.removeItem(BRAND_INTRO_LEGACY_LOCAL_KEY)
        localStorage.removeItem(BRAND_INTRO_LOCAL_KEY)
      }
    } catch {
      // ignore
    }
    if (shouldSkipBrandIntro(forceBrandIntro)) {
      setPhase("ready")
    } else if (forceBrandIntro) {
      setPhase("splash")
    } else {
      // Do not reset splash→loading→ready if `user` identity changes mid-intro.
      setPhase((p) => (p === "loading" || p === "ready" ? p : "splash"))
    }
  }, [authLoading, user, forceBrandIntro])

  // Only run phase timers when we're actually showing splash/loading (not the auth loading shell)
  useEffect(() => {
    if (authLoading || !user) return
    if (phase !== "splash" && phase !== "loading") return
    if (phase === "splash") {
      const t = setTimeout(() => {
        setPhase("loading")
      }, SPLASH_DURATION_MS)
      return () => clearTimeout(t)
    }
    if (phase === "loading") {
      const t = setTimeout(() => {
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(BRAND_INTRO_SESSION_KEY, "1")
          }
        } catch {
          // ignore
        }
        setPhase("ready")
      }, LOADING_FIRST_VISIT_MS)
      return () => clearTimeout(t)
    }
  }, [authLoading, user, phase])

  /** Full reload / new document load should show the intro again; in-dashboard client nav keeps this layout mounted. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const clearIntroSkipForNextDocumentLoad = () => {
      try {
        sessionStorage.removeItem(BRAND_INTRO_SESSION_KEY)
      } catch {
        // ignore
      }
    }
    window.addEventListener("beforeunload", clearIntroSkipForNextDocumentLoad)
    return () => window.removeEventListener("beforeunload", clearIntroSkipForNextDocumentLoad)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowQuickActions(typeof window !== "undefined" && window.scrollY > 150)
    if (typeof window !== "undefined") {
      onScroll()
      window.addEventListener("scroll", onScroll, { passive: true })
      return () => window.removeEventListener("scroll", onScroll)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    getSubscription(user.id).then(setSubscription).catch(() => setSubscription(null))
  }, [user?.id])

  useEffect(() => {
    if (!headerMenuOpen) return
    const close = () => setHeaderMenuOpen(false)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [headerMenuOpen])

  const handleLogOut = useCallback(async () => {
    setHeaderMenuOpen(false)
    await signOut()
    router.replace("/login")
  }, [signOut, router])

  if (authLoading || !user) {
    return (
      <div className="dashboard-app-shell dashboard-app-loading">
        <div className="dashboard-app-loading-dots">
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
        </div>
        <p>Loading…</p>
      </div>
    )
  }

  if (phase === "splash") {
    return <AppSplashScreen />
  }
  if (phase === "loading") {
    return <AppLoadingScreen />
  }

  const isDashboardHome = pathname === "/dashboard"

  const TOP_TABS = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/biomarkers", label: "Biomarkers" },
    { href: "/dashboard/actions", label: "Actions" },
    { href: "/dashboard/trends", label: "Trends" },
    { href: "/dashboard/plan", label: "Plan" },
    { href: "/guides", label: "Guides" },
    { href: "/dashboard/challenges", label: "Challenges" },
    { href: "/settings", label: "Profile" },
    { href: "/faq", label: "FAQ" },
  ] as const

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing"

  return (
    <div className="dashboard-app-shell">
      <nav className="dashboard-top-tabs" role="navigation" aria-label="Sections">
        <Link href="/dashboard" className="dashboard-top-brand" aria-label="Clarion Labs — dashboard home">
          <ClarionLabsLogo variant="compact" />
        </Link>
        <div className="dashboard-top-tabs-inner">
          {TOP_TABS.map(({ href, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : href === "/settings"
                  ? pathname.startsWith("/settings")
                  : href === "/faq"
                    ? pathname === "/faq"
                    : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`dashboard-top-tab ${isActive ? "dashboard-top-tab--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </Link>
            )
          })}
        </div>
        <div className="dashboard-top-tabs-actions">
          <button type="button" className="dashboard-top-logout" onClick={() => void handleLogOut()}>
            Log out
          </button>
          <div className="dashboard-header-menu-wrap">
            <button
              type="button"
              className="dashboard-header-menu-btn"
              onClick={(e) => { e.stopPropagation(); setHeaderMenuOpen((o) => !o) }}
              aria-expanded={headerMenuOpen}
              aria-haspopup="true"
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={2} aria-hidden />
            </button>
            {headerMenuOpen && (
              <div className="dashboard-header-menu-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                <Link href="/faq" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                  <HelpCircle size={16} aria-hidden /> FAQ
                </Link>
                <Link href="/guides" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                  <BookOpen size={16} aria-hidden /> Guides
                </Link>
                <Link href="/dashboard/challenges" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                  <Trophy size={16} aria-hidden /> Challenges
                </Link>
                <Link href="/settings" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                  <SettingsIcon size={16} aria-hidden /> Settings
                </Link>
                <button
                  type="button"
                  className="dashboard-header-menu-item dashboard-header-menu-item--danger"
                  role="menuitem"
                  onClick={() => void handleLogOut()}
                >
                  <LogOut size={16} aria-hidden /> Log out
                </button>
              </div>
            )}
          </div>
          <ThemeToggle />
          {hasActiveSubscription ? (
            <span className="dashboard-member-badge">Clarion+ member</span>
          ) : (
            <SubscribeButton className="dashboard-subscribe-btn dashboard-subscribe-btn--pill">Subscribe</SubscribeButton>
          )}
        </div>
      </nav>
      <div className="dashboard-app-content">{children}</div>
      {isDashboardHome && showQuickActions && (
        <div className="dashboard-quick-actions" role="group" aria-label="Quick actions">
          <Link href="/dashboard#protocol" className="dashboard-quick-action-btn">
            Today&apos;s plan
          </Link>
          <button
            type="button"
            className="dashboard-quick-action-btn"
            onClick={() => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(CLARION_OPEN_ASSISTANT_EVENT))}
          >
            Ask Clarion
          </button>
        </div>
      )}
      <nav className="dashboard-bottom-nav" role="navigation" aria-label="Main">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`dashboard-bottom-nav-item ${isActive ? "dashboard-bottom-nav-item--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={22} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [forceBrandIntro, setForceBrandIntro] = useState(false)
  return (
    <>
      <Suspense fallback={null}>
        <DashboardIntroQuerySync onForceBrandIntro={setForceBrandIntro} />
      </Suspense>
      <DashboardLayoutInner forceBrandIntro={forceBrandIntro}>{children}</DashboardLayoutInner>
    </>
  )
}
