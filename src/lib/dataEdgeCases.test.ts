/**
 * Synthetic “test users” — no Supabase, no UI. Exercises pure paths with null/empty/minimal
 * data so missing guards show up as thrown errors or failed assertions.
 */
import { describe, expect, it } from "vitest"
import { hasClarionAnalysisAccess, hasLabPersonalizationAccess, subscriptionStatusGrantsAccess } from "@/src/lib/accessGate"
import { buildLiteSupplementSuggestions } from "@/src/lib/symptomLiteSupplements"
import { resolveTierFromStripeSubscription } from "@/src/lib/planTier"
import type Stripe from "stripe"
import { getDashboardSkyMood } from "@/src/lib/dashboardSkyMood"
import { analyzeBiomarkers } from "@/src/lib/analyzeBiomarkers"
import {
  getBiomarkerKeys,
  getAdaptiveRecommendedMarkers,
  getActivePanel,
  getEnteredBiomarkers,
  hasEnoughLabs,
  type ProfileState,
} from "@/src/lib/panelEngine"
import { parseCurrentSupplementsEntries, serializeCurrentSupplementsEntries } from "@/src/lib/supplementMetadata"
import { scoreToLabel } from "@/src/lib/scoreEngine"
import { getBloodwiseSummary } from "@/src/lib/bloodwiseSummaryEngine"

const emptyProfile: ProfileState = {
  age: "",
  sex: "",
  sport: "",
  goal: "",
}

function minimalSkyInput(overrides: Partial<Parameters<typeof getDashboardSkyMood>[0]> = {}) {
  return {
    hour: 12,
    hasStack: false,
    protocolTodayY: 0,
    protocolTodayX: 0,
    protocolTodayComplete: null as boolean | null,
    daysSinceLog: null as number | null,
    ...overrides,
  }
}

describe("access gate — null / empty data", () => {
  it("denies when everything is null", () => {
    expect(hasClarionAnalysisAccess(null, null, null)).toBe(false)
  })

  it("denies bloodwork with score only (no payment)", () => {
    // Regression: previously `bloodwork.score != null` was a grandfather clause
    // that let anyone entering manual labs skip the paywall. Revoked 2026-04-21.
    expect(hasClarionAnalysisAccess(null, null, { score: 72 })).toBe(false)
  })

  it("denies bloodwork with non-empty panel only (no payment)", () => {
    expect(hasClarionAnalysisAccess(null, null, { selected_panel: ["Ferritin"] })).toBe(false)
  })

  it("allows subscription trialing", () => {
    expect(hasClarionAnalysisAccess(null, { status: "trialing" }, null)).toBe(true)
  })

  it("allows subscription past_due (still entitled until canceled)", () => {
    expect(hasClarionAnalysisAccess(null, { status: "past_due" }, null)).toBe(true)
    expect(subscriptionStatusGrantsAccess("past_due")).toBe(true)
  })

  it("allows plan_tier full when subscriptions row has not synced yet", () => {
    expect(hasClarionAnalysisAccess({ plan_tier: "full" }, null, null)).toBe(true)
  })

  it("allows plan_tier lite when subscriptions row has not synced yet", () => {
    expect(hasClarionAnalysisAccess({ plan_tier: "lite" }, null, null)).toBe(true)
  })
})

describe("lab personalization access", () => {
  it("denies when no analysis", () => {
    expect(hasLabPersonalizationAccess(null, null)).toBe(false)
  })

  it("allows when one-time analysis purchased", () => {
    expect(hasLabPersonalizationAccess({ analysis_purchased_at: "2024-01-01T00:00:00Z" }, null)).toBe(true)
  })

  it("denies bloodwork with score but no payment (regression)", () => {
    // Manual lab entry alone must not unlock personalized analysis features;
    // used to be a grandfather clause that turned into a paywall bypass.
    expect(hasLabPersonalizationAccess(null, { score: 70 })).toBe(false)
  })

  it("allows plan_tier full without explicit analysis_purchased_at", () => {
    // Webhook race: subscriptions row may lag profile update. plan_tier='full'
    // indicates a completed paid analysis.
    expect(hasLabPersonalizationAccess({ plan_tier: "full" }, null)).toBe(true)
  })

  it("denies plan_tier lite (lite subscribers have no analysis unlock)", () => {
    expect(hasLabPersonalizationAccess({ plan_tier: "lite" }, null)).toBe(false)
  })
})

describe("plan tier from Stripe subscription", () => {
  it("uses metadata type lite over unknown price id", () => {
    const sub = {
      status: "active" as const,
      metadata: { type: "lite" },
      items: { data: [{ price: { id: "price_dynamic_inline" } }] },
    }
    expect(resolveTierFromStripeSubscription(sub as unknown as Stripe.Subscription)).toBe("lite")
  })

  it("uses metadata type clarion_plus as full", () => {
    const sub = {
      status: "active" as const,
      metadata: { type: "clarion_plus" },
      items: { data: [{ price: { id: "price_xyz" } }] },
    }
    expect(resolveTierFromStripeSubscription(sub as unknown as Stripe.Subscription)).toBe("full")
  })

  it("keeps tier when subscription is past_due", () => {
    const sub = {
      status: "past_due" as const,
      metadata: { type: "lite" },
      items: { data: [{ price: { id: "price_dynamic_inline" } }] },
    }
    expect(resolveTierFromStripeSubscription(sub as unknown as Stripe.Subscription)).toBe("lite")
  })
})

describe("Clarion Lite supplement suggestions", () => {
  it("returns symptom_profile items with disclaimer", () => {
    const r = buildLiteSupplementSuggestions({ symptoms: "fatigue", profile_type: null })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.basis === "symptom_profile")).toBe(true)
    expect(r[0].disclaimer.length).toBeGreaterThan(10)
  })

  it("provides a default stack when no symptoms", () => {
    const r = buildLiteSupplementSuggestions({ symptoms: null, profile_type: null })
    expect(r.length).toBeGreaterThan(0)
  })
})

describe("sky mood — edge inputs", () => {
  it("returns a valid mood for empty protocol state", () => {
    const m = getDashboardSkyMood(minimalSkyInput())
    expect(["night", "storm", "drizzle", "sunrise", "sunset", "clear", "perfect", "calm"]).toContain(m)
  })

  it("handles NaN-like ratios via zero denominators", () => {
    const m = getDashboardSkyMood(
      minimalSkyInput({
        hasStack: true,
        protocolTodayY: 0,
        protocolTodayX: 0,
        protocolTodayComplete: false,
        hour: 14,
      })
    )
    expect(typeof m).toBe("string")
  })

  it("allows optional panelScore null and undefined", () => {
    expect(() => getDashboardSkyMood(minimalSkyInput({ panelScore: null }))).not.toThrow()
    expect(() => getDashboardSkyMood(minimalSkyInput({ panelScore: undefined }))).not.toThrow()
    expect(() => getDashboardSkyMood(minimalSkyInput({ panelScore: 88 }))).not.toThrow()
  })
})

describe("panel engine — empty profile", () => {
  it("returns a non-empty recommended panel for blank profile", () => {
    const keys = getBiomarkerKeys()
    expect(keys.length).toBeGreaterThan(0)
    const rec = getAdaptiveRecommendedMarkers(emptyProfile, keys)
    expect(rec.length).toBeGreaterThan(0)
  })

  it("getActivePanel falls back when selected empty", () => {
    const keys = getBiomarkerKeys()
    const rec = getAdaptiveRecommendedMarkers(emptyProfile, keys)
    const active = getActivePanel([], rec)
    expect(active.length).toBeGreaterThan(0)
  })

  it("getEnteredBiomarkers ignores empty strings", () => {
    const active = ["Ferritin", "Vitamin D"]
    const entered = getEnteredBiomarkers(active, { Ferritin: "", "Vitamin D": "   " })
    expect(Object.keys(entered).length).toBe(0)
  })

  it("hasEnoughLabs when panel empty uses safe minimum", () => {
    expect(hasEnoughLabs(0, 0)).toBe(false)
    expect(hasEnoughLabs(3, 0)).toBe(true)
  })
})

describe("biomarkers", () => {
  it("analyzeBiomarkers empty object returns empty", () => {
    expect(analyzeBiomarkers({})).toEqual([])
  })
})

describe("supplements serialization", () => {
  it("round-trips empty", () => {
    const a = parseCurrentSupplementsEntries("")
    expect(a).toEqual([])
    expect(serializeCurrentSupplementsEntries(a)).toBe("")
  })
})

describe("score / summary — no crash on empty", () => {
  it("scoreToLabel", () => {
    expect(() => scoreToLabel(50)).not.toThrow()
  })

  it("getBloodwiseSummary minimal input", () => {
    expect(() =>
      getBloodwiseSummary({
        analysisResults: [],
        score: 0,
        statusCounts: { optimal: 0, borderline: 0, flagged: 0, unknown: 0 },
        topFocus: [],
        prioritySummary: {
          biggestDrag: "—",
          strongestMarker: "—",
          nextBestAction: "—",
          lipidPanelNote: null,
        },
        detectedPatterns: [],
      })
    ).not.toThrow()
  })
})
