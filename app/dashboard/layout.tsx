"use client"

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { Home, FlaskConical, ListChecks, Activity, BookOpen, Menu, Trophy, Bookmark, Settings as SettingsIcon } from "lucide-react"
import { AppSplashScreen } from "@/src/components/AppSplashScreen"
import { AppLoadingScreen } from "@/src/components/AppLoadingScreen"
import { ThemeToggle } from "@/src/components/ThemeToggle"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { DashboardSidebarNav } from "@/src/components/DashboardSidebarNav"
import { DashboardSkyAtmosphereProvider } from "@/src/contexts/DashboardSkyAtmosphereContext"
import { DashboardSkyShell } from "@/src/components/DashboardSkyShell"
import { getSubscription } from "@/src/lib/bloodwiseDb"
import type { SubscriptionRow } from "@/src/lib/bloodwiseDb"
import {
  BRAND_INTRO_LOCAL_KEY,
  BRAND_INTRO_SESSION_KEY,
  BRAND_LOADING_DURATION_MS,
  shouldSkipBrandIntro,
} from "@/src/lib/brandIntro"

import "./dashboard.css"
import "./dashboard-premium.css"
import "./dashboard-sky.css"

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
  const [phase, setPhase] = useState<AppPhase>("splash")
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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
    if (!user?.id) return
    getSubscription(user.id).then(setSubscription).catch(() => setSubscription(null))
  }, [user?.id])

  useEffect(() => {
    if (!headerMenuOpen) return
    const close = () => setHeaderMenuOpen(false)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [headerMenuOpen])

  /** Close mobile drawer on route change */
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  /** Escape closes mobile drawer; lock body scroll when open */
  useEffect(() => {
    if (!mobileSidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [mobileSidebarOpen])

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

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing"

  return (
    <div className="dashboard-app-shell dashboard-app-shell--clarion">
      <DashboardSkyAtmosphereProvider>
      <div className="dashboard-layout-row">
        <aside
          id="dashboard-sidebar-panel"
          className={`dashboard-sidebar ${mobileSidebarOpen ? "dashboard-sidebar--open" : ""}`}
          aria-label="Primary navigation"
        >
          <div className="dashboard-sidebar-inner">
            <Link href="/dashboard" className="dashboard-sidebar-brand" onClick={() => setMobileSidebarOpen(false)}>
              <ClarionLabsLogo variant="compact" />
            </Link>
            <DashboardSidebarNav onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </aside>

        {mobileSidebarOpen ? (
          <button
            type="button"
            className="dashboard-sidebar-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <div className="dashboard-main-column">
          <nav className="dashboard-top-bar" role="navigation" aria-label="Toolbar">
            <div className="dashboard-top-bar-start">
              <button
                type="button"
                className="dashboard-sidebar-hamburger"
                aria-expanded={mobileSidebarOpen}
                aria-controls="dashboard-sidebar-panel"
                aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={(e) => {
                  e.stopPropagation()
                  setMobileSidebarOpen((o) => !o)
                }}
              >
                <Menu size={22} strokeWidth={2} aria-hidden />
              </button>
              <Link href="/dashboard" className="dashboard-top-brand dashboard-top-brand--bar" aria-label="Clarion Labs — dashboard home">
                <ClarionLabsLogo variant="compact" />
              </Link>
            </div>
            <div className="dashboard-top-tabs-actions">
              <button type="button" className="dashboard-top-logout" onClick={() => void handleLogOut()}>
                Log out
              </button>
              <div className="dashboard-header-menu-wrap">
                <button
                  type="button"
                  className="dashboard-header-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setHeaderMenuOpen((o) => !o)
                  }}
                  aria-expanded={headerMenuOpen}
                  aria-haspopup="true"
                  aria-label="More actions"
                >
                  <Menu size={18} strokeWidth={2} aria-hidden />
                </button>
                {headerMenuOpen && (
                  <div className="dashboard-header-menu-dropdown" role="menu" onClick={(e) => e.stopPropagation()}>
                    <Link href="/settings" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                      <SettingsIcon size={16} aria-hidden /> Settings
                    </Link>
                    <Link href="/faq" className="dashboard-header-menu-item" role="menuitem" onClick={() => setHeaderMenuOpen(false)}>
                      FAQ &amp; help
                    </Link>
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
          <DashboardSkyShell>{children}</DashboardSkyShell>
        </div>
      </div>

      <nav className="dashboard-bottom-nav" role="navigation" aria-label="Quick links">
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
      </DashboardSkyAtmosphereProvider>
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
