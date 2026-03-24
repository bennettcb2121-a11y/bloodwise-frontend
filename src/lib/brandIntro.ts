/** Dashboard brand loading phase — shorter than a full triathlon Lottie loop (~12s) so the shell appears sooner. */
export const BRAND_LOADING_DURATION_MS = 9_000

/** sessionStorage: intro finished in this document session — skip if the dashboard layout remounts without a full reload (e.g. Settings → Dashboard). Cleared on reload (see dashboard layout). */
export const BRAND_INTRO_SESSION_KEY = "clarion_dashboard_brand_intro_done"

/** Legacy key — no longer read for skip; may still be removed on dashboard mount for old profiles. */
export const BRAND_INTRO_LOCAL_KEY = "clarion_dashboard_brand_intro_complete_v1"

export function clearBrandIntroSessionFlag(): void {
  try {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(BRAND_INTRO_SESSION_KEY)
  } catch {
    // ignore
  }
}

/**
 * Skip brand splash + loading when this document session already finished the intro once.
 * - Does not use localStorage — reload always clears the skip (see layout `beforeunload` / `pagehide`).
 * - In-dashboard client navigation keeps the same layout mounted, so phase stays `ready` without storage.
 * - `?intro=1` forces replay (caller passes forceShow).
 */
export function shouldSkipBrandIntro(forceShow: boolean): boolean {
  if (forceShow) return false
  try {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(BRAND_INTRO_SESSION_KEY) === "1"
  } catch {
    return false
  }
}
