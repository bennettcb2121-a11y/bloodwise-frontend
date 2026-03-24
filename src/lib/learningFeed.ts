/**
 * Biomarker learning feed: insight posts for the Feed tab and dashboard teaser.
 */

export type LearningFeedItem = {
  id: string
  title: string
  body: string
  link: string
  /** Internal guide slug or external URL. */
  linkType?: "guide" | "external"
  biomarkerTag?: string
}

export const LEARNING_FEED: LearningFeedItem[] = [
  {
    id: "ferritin-below-30",
    title: "Why ferritin below 30 can cause fatigue",
    body: "Ferritin reflects stored iron. When it sits below 30 ng/mL, many people notice low energy and reduced endurance before anemia shows up on a standard CBC.",
    link: "/guides/iron",
    linkType: "guide",
    biomarkerTag: "Ferritin",
  },
  {
    id: "magnesium-sleep",
    title: "Magnesium and sleep",
    body: "Magnesium supports the nervous system and muscle relaxation. Taking it in the evening may help with sleep quality for some people.",
    link: "/guides/magnesium-sleep",
    linkType: "guide",
    biomarkerTag: "Magnesium",
  },
  {
    id: "vitamin-d-immunity",
    title: "How vitamin D affects immunity",
    body: "Vitamin D is involved in immune function. Keeping levels in a healthy range may support your body's defenses, especially in winter.",
    link: "/guides/vitamin-d",
    linkType: "guide",
    biomarkerTag: "Vitamin D",
  },
  {
    id: "b12-absorption",
    title: "Understanding B12 absorption",
    body: "B12 from food or supplements can be affected by stomach acid, medications like PPIs, and diet. Sublingual or adequate doses often help when levels stay low.",
    link: "/guides/b12-absorption",
    linkType: "guide",
    biomarkerTag: "Vitamin B12",
  },
]

/** First item for "Latest from Clarion" dashboard teaser. */
export function getLatestLearningItem(): LearningFeedItem | null {
  return LEARNING_FEED[0] ?? null
}

/** Today's insight tied to top priority marker (learning item or null for tip fallback). */
export function getLearningItemForPriority(priorityMarkerName: string): LearningFeedItem | null {
  const normalized = priorityMarkerName.toLowerCase().replace(/\s+/g, "")
  const match = LEARNING_FEED.find((item) => {
    const tag = (item.biomarkerTag ?? "").toLowerCase().replace(/\s+/g, "")
    return tag && (normalized.includes(tag) || tag.includes(normalized) || normalized.includes("vitamind") && tag.includes("vitamin d"))
  })
  return match ?? null
}
