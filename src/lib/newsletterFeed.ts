/**
 * Static newsletter / feed entries for the dashboard Feed tab.
 * Add new issues here when you publish; url can be external (Substack, etc.) or internal.
 */

export type NewsletterItem = {
  id: string
  title: string
  date: string
  description?: string
  url: string
}

export const NEWSLETTER_FEED: NewsletterItem[] = [
  {
    id: "1",
    title: "Welcome to Clarion",
    date: "2025-03-01",
    description: "What we're building: clearly explained bloodwork and a plan that fits your life.",
    url: "https://clarionlabs.tech",
  },
  // Add new issues below as you publish:
  // { id: "2", title: "Issue #2 – Sleep and biomarkers", date: "2025-03-15", description: "...", url: "https://..." },
]
