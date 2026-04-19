/**
 * Home (v2) Block 6 — the "gift" note.
 *
 * A small curated rotation of factual, specific notes that a quiet sports
 * science editor would write. Never cringe, never a CTA. When we can't
 * source a personalized marker or protocol note, we fall through to one of
 * these. Keyed by day-of-year so the same note shows all day, not per render.
 */

export type DailyHomeNote = {
  title: string
  body: string
}

export const GENERIC_DAILY_NOTES: DailyHomeNote[] = [
  {
    title: "Coffee + iron",
    body:
      "Iron absorption drops roughly 50% when taken with coffee. Shift your iron dose at least 60 minutes away from your first cup.",
  },
  {
    title: "Vitamin D timing",
    body:
      "Vitamin D is fat-soluble. A meal with any fat roughly doubles absorption compared to fasted dosing.",
  },
  {
    title: "Magnesium at night",
    body:
      "Magnesium glycinate 1–2 hours before bed is the most consistent protocol for sleep latency in endurance athletes.",
  },
  {
    title: "Zinc on an empty stomach",
    body:
      "Zinc is best absorbed on an empty stomach, but even a small meal prevents nausea without meaningfully hurting uptake.",
  },
  {
    title: "Calcium spacing",
    body:
      "Calcium above ~500 mg in a single dose blocks iron, zinc and magnesium uptake. Split across meals rather than one bolus.",
  },
  {
    title: "Creatine loading is optional",
    body:
      "5 g daily for 28 days saturates muscle creatine as fully as a 20 g loading protocol — with less GI distress.",
  },
  {
    title: "Omega-3 with dinner",
    body:
      "Fish oil is better tolerated with the largest meal of the day. Oxidation markers also drop when taken alongside mixed fats.",
  },
  {
    title: "B12 dose ceiling",
    body:
      "Active transport of B12 saturates around 1.5–2 mcg per dose. Large oral doses rely on passive diffusion — a fraction of a percent is absorbed.",
  },
  {
    title: "Ferritin vs serum iron",
    body:
      "Serum iron swings daily with meals; ferritin is the storage marker that tracks real iron status. Retest ferritin, not serum iron.",
  },
  {
    title: "Vitamin C + iron",
    body:
      "250–500 mg of vitamin C alongside non-heme iron increases absorption about 2–3× in most adults.",
  },
  {
    title: "Electrolytes during long sessions",
    body:
      "Sodium losses above 700 mg/hour are common in heat. Water alone can worsen performance and cramping past the 90-minute mark.",
  },
  {
    title: "Protein timing is forgiving",
    body:
      "Total daily protein (1.6–2.2 g/kg for trained adults) matters far more than the two-hour post-workout window.",
  },
  {
    title: "Vitamin K2 pairs with D",
    body:
      "K2 directs calcium to bone rather than soft tissue. Pairing modest K2 with higher-dose vitamin D is a reasonable long-term pattern.",
  },
  {
    title: "Resting heart rate trend",
    body:
      "A 5–10 bpm jump in morning resting heart rate over several days is one of the earliest signals of under-recovery.",
  },
]

/**
 * Pick a stable note for a given day-of-year. Wraps cleanly across years.
 */
export function pickDailyNote(dayOfYear: number): DailyHomeNote {
  const count = GENERIC_DAILY_NOTES.length
  if (count === 0) {
    return { title: "Note for today", body: "Steady work compounds." }
  }
  const safeDay = Number.isFinite(dayOfYear) ? Math.floor(dayOfYear) : 0
  const idx = ((safeDay % count) + count) % count
  return GENERIC_DAILY_NOTES[idx]
}

export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
