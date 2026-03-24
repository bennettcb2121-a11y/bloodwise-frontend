import { FAQ_ITEMS, getSupportEmail, type FaqItem } from "@/src/lib/faqContent"

const MIN_SCORE = 3

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
}

function scoreMessageAgainstItem(message: string, messageTokens: Set<string>, item: FaqItem): number {
  const lower = message.toLowerCase()
  let score = 0
  const qTokens = tokenize(item.question)
  for (const t of qTokens) {
    if (messageTokens.has(t)) score += 2
  }
  for (const kw of item.keywords) {
    const parts = kw.split(/\s+/).filter(Boolean)
    if (parts.length === 1) {
      if (messageTokens.has(parts[0].toLowerCase())) score += 3
    } else {
      const all = parts.every((p) => lower.includes(p.toLowerCase()))
      if (all) score += 4
    }
  }
  return score
}

/** @internal for tests */
export function matchMessageToFaq(message: string): { item: FaqItem; score: number } | null {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return null
  const messageTokens = new Set(tokenize(message))

  let best: { item: FaqItem; score: number } | null = null
  for (const item of FAQ_ITEMS) {
    const s = scoreMessageAgainstItem(message, messageTokens, item)
    if (!best || s > best.score) best = { item, score: s }
  }
  if (!best || best.score < MIN_SCORE) return null
  return best
}

/**
 * Returns a canned support reply when the user message matches FAQ keywords.
 * Otherwise returns null (caller may use LLM or static fallback).
 */
export function matchSupportFaq(message: string): {
  reply: string
  faqId: string
  faqAnchor: string
  source: "faq"
} | null {
  const hit = matchMessageToFaq(message)
  if (!hit) return null
  const { item } = hit
  const anchor = `/faq#${item.id}`
  const reply = `${item.answer}\n\nRead more: ${anchor}`
  return {
    reply,
    faqId: item.id,
    faqAnchor: anchor,
    source: "faq",
  }
}

export function staticSupportFallback(): string {
  const email = getSupportEmail()
  return `I couldn’t match that to our FAQ. Try rephrasing, browse clarionlabs.com/faq, or email ${email} for account and billing help. For health questions about your results, use “Ask Clarion” (health assistant) on the right—not for passwords or payments.`
}
