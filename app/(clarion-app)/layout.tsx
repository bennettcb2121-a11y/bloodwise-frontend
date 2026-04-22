"use client"

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/src/contexts/AuthContext"
import { Menu, MoreHorizontal, Settings as SettingsIcon } from "lucide-react"
import { AppSplashScreen } from "@/src/components/AppSplashScreen"
import { AppLoadingScreen } from "@/src/components/AppLoadingScreen"
import { ThemeToggle } from "@/src/components/ThemeToggle"
import { SubscribeButton } from "@/src/components/SubscribeButton"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"
import { DashboardSidebarNav } from "@/src/components/DashboardSidebarNav"
import { DashboardSkyAtmosphereProvider } from "@/src/contexts/DashboardSkyAtmosphereContext"
import { DashboardSkyShell } from "@/src/components/DashboardSkyShell"
import { DashboardLogFab } from "@/src/components/DashboardLogFab"
import { DashboardActionsPreviewModal } from "@/src/components/DashboardActionsPreviewModal"
import { getSubscription, loadSavedState } from "@/src/lib/bloodwiseDb"
import type { SubscriptionRow } from "@/src/lib/bloodwiseDb"
import { hasClarionAnalysisAccess, isOnboardingLabUploadPath, subscriptionStatusGrantsAccess } from "@/src/lib/accessGate"
import {
  BRAND_INTRO_LOCAL_KEY,
  BRAND_INTRO_SESSION_KEY,
  BRAND_LOADING_DURATION_MS,
  shouldSkipBrandIntro,
} from "@/src/lib/brandIntro"

import "./dashboard/dashboard.css"
import "./dashboard/dashboard-premium.css"
import "./dashboard/dashboard-sky.css"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/plan", label: "Stack" },
  { href: "/dashboard/analysis", label: "Report" },
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

type ClarionShellAccess = "loading" | "granted" | "denied"

function DashboardLayoutInner({
  children,
  forceBrandIntro,
}: {
  children: React.ReactNode
  forceBrandIntro: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [phase, setPhase] = useState<AppPhase>("splash")
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  /** Single gate for all routes in this group: $49 / code unlock, except onboarding lab upload. */
  const [shellAccess, setShellAccess] = useState<ClarionShellAccess>("loading")
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  /** Minimal chrome for embedded routes (e.g. Actions preview iframe). */
  const [embedMode, setEmbedMode] = useState(false)

  const searchQueryKey = searchParams.toString()
  const paywallExempt = useMemo(
    () => isOnboardingLabUploadPath(pathname, new URLSearchParams(searchQueryKey)),
    [pathname, searchQueryKey]
  )
  const canUseShell = paywallExempt || shellAccess === "granted"

  useEffect(() => {
    if (typeof window === "undefined") return
    const embed = new URLSearchParams(window.location.search).get("embed") === "1"
    queueMicrotask(() => setEmbedMode(embed))
  }, [pathname])

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
        if (new URLSearchParams(window.location.search).get("embed") === "1") {
          queueMicrotask(() => {
            setEmbedMode(true)
            setPhase("ready")
          })
          return
        }
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
    queueMicrotask(() => {
      setEmbedMode(false)
      if (shouldSkipBrandIntro(forceBrandIntro)) {
        setPhase("ready")
      } else if (forceBrandIntro) {
        setPhase("splash")
      } else {
        // Do not reset splash→loading→ready if `user` identity changes mid-intro.
        setPhase((p) => (p === "loading" || p === "ready" ? p : "splash"))
      }
    })
  }, [authLoading, user, forceBrandIntro])

  // Only run phase timers when we're actually showing splash/loading (not the auth loading shell)
  useEffect(() => {
    if (authLoading || !user) return
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1") return
    if (phase !== "splash" && phase !== "loading") return
    if (phase === "splash") {
      const t = setTimeout(() => {
        // Mark intro seen for this browser session as soon as the splash finishes so returning from
        // routes outside this shell (e.g. /settings, /login) remounts straight to `ready` instead of replaying splash + loading.
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(BRAND_INTRO_SESSION_KEY, "1")
          }
        } catch {
          // ignore
        }
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
    if (authLoading) return
    if (!user?.id) {
      setShellAccess("loading")
      return
    }
    if (paywallExempt) {
      setShellAccess("granted")
      getSubscription(user.id).then(setSubscription).catch(() => setSubscription(null))
      return
    }
    setShellAccess("loading")
    Promise.all([loadSavedState(user.id), getSubscription(user.id)])
      .then(([{ profile, bloodwork }, sub]) => {
        setSubscription(sub)
        if (hasClarionAnalysisAccess(profile, sub, bloodwork)) {
          setShellAccess("granted")
        } else {
          setShellAccess("denied")
          router.replace("/paywall")
        }
      })
      .catch(() => {
        setSubscription(null)
        setShellAccess("denied")
        router.replace("/paywall")
      })
  }, [user?.id, authLoading, paywallExempt, searchQueryKey, router])

  useEffect(() => {
    if (!headerMenuOpen) return
    const close = () => setHeaderMenuOpen(false)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [headerMenuOpen])

  /** Close mobile drawer on route change */
  useEffect(() => {
    queueMicrotask(() => setMobileSidebarOpen(false))
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

  if (!paywallExempt && shellAccess === "denied") {
    return (
      <div className="dashboard-app-shell dashboard-app-loading" role="status" aria-live="polite">
        <div className="dashboard-app-loading-dots">
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
        </div>
        <p>Redirecting to unlock…</p>
      </div>
    )
  }

  if (!canUseShell) {
    return (
      <div className="dashboard-app-shell dashboard-app-loading" role="status" aria-live="polite" aria-label="Verifying access">
        <div className="dashboard-app-loading-dots">
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
          <span className="clarion-loading-dot" aria-hidden />
        </div>
        <p>Verifying your Clarion access…</p>
      </div>
    )
  }

  if (phase === "splash") {
    return <AppSplashScreen />
  }
  if (phase === "loading") {
    return <AppLoadingScreen />
  }

  const hasActiveSubscription = subscriptionStatusGrantsAccess(subscription?.status)

  return (
    <div
      className={`dashboard-app-shell dashboard-app-shell--clarion${embedMode ? " dashboard-app-shell--embed" : ""}`}
      data-clarion-shell="dashboard-guided-v2"
      data-clarion-build={process.env.NEXT_PUBLIC_CLARION_BUILD_ID}
    >
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
            <ul className="dashboard-top-nav-links" aria-label="Sections">
              {NAV_ITEMS.map(({ href, label }) => {
                const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
                return (
                  <li key={href} className="dashboard-top-nav-item">
                    <Link
                      href={href}
                      className={`dashboard-top-nav-link ${isActive ? "dashboard-top-nav-link--active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
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
                  aria-label="Settings & help"
                >
                  <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
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
              <Link href="/faq" className="dashboard-support-link" prefetch={false}>
                Need help?
              </Link>
            </div>
          </nav>
          <DashboardSkyShell>{children}</DashboardSkyShell>
        </div>
      </div>

      {!embedMode ? <DashboardLogFab /> : null}
      {phase === "ready" && !embedMode ? <DashboardActionsPreviewModal /> : null}
      </DashboardSkyAtmosphereProvider>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [forceBrandIntro, setForceBrandIntro] = useState(false)
  return (
    <Suspense
      fallback={
        <div className="dashboard-app-shell dashboard-app-loading" style={{ minHeight: "100vh" }}>
          <div className="dashboard-app-loading-dots">
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
            <span className="clarion-loading-dot" aria-hidden />
          </div>
          <p>Loading…</p>
        </div>
      }
    >
      <DashboardIntroQuerySync onForceBrandIntro={setForceBrandIntro} />
      <DashboardLayoutInner forceBrandIntro={forceBrandIntro}>{children}</DashboardLayoutInner>
    </Suspense>
  )
}
