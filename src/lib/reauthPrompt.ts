/** Set when the user explicitly logs out; after next sign-in we offer dashboard vs retake survey. */
export const REAUTH_PROMPT_KEY = "clarion_prompt_after_reauth"

/** Cookie set on logout so OAuth return can redirect to /?reauth=1 even when the `next` query param is dropped. */
export const POST_AUTH_REDIRECT_COOKIE = "clarion_post_auth_redirect"

const REAUTH_REDIRECT_PATH = "/?reauth=1"

/** Refreshes cookie before OAuth redirect (Supabase may drop the `next` query param on return). */
export function setPostAuthRedirectCookieFromPath(path: string): void {
  if (typeof window === "undefined" || !path.startsWith("/") || path.startsWith("//")) return
  try {
    const maxAge = 60 * 60 * 24
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${POST_AUTH_REDIRECT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  } catch {
    // ignore
  }
}

function setPostAuthRedirectCookie(): void {
  setPostAuthRedirectCookieFromPath(REAUTH_REDIRECT_PATH)
}

export function setReauthPromptAfterLogout(): void {
  try {
    if (typeof window === "undefined") return
    // localStorage: survives new tabs / windows on same origin (sessionStorage does not).
    localStorage.setItem(REAUTH_PROMPT_KEY, "1")
    sessionStorage.setItem(REAUTH_PROMPT_KEY, "1")
    setPostAuthRedirectCookie()
  } catch {
    // ignore
  }
}

export function shouldShowReauthPrompt(): boolean {
  try {
    if (typeof window === "undefined") return false
    if (localStorage.getItem(REAUTH_PROMPT_KEY) === "1") return true
    if (sessionStorage.getItem(REAUTH_PROMPT_KEY) === "1") return true
    return false
  } catch {
    return false
  }
}

/** OAuth `next` path when we should land on home and show the welcome-back choice. */
export function getReauthOAuthNext(): string | null {
  return shouldShowReauthPrompt() ? REAUTH_REDIRECT_PATH : null
}

export function clearReauthPrompt(): void {
  try {
    if (typeof window === "undefined") return
    localStorage.removeItem(REAUTH_PROMPT_KEY)
    sessionStorage.removeItem(REAUTH_PROMPT_KEY)
    document.cookie = `${POST_AUTH_REDIRECT_COOKIE}=; Path=/; Max-Age=0`
  } catch {
    // ignore
  }
}
