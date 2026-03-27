import type { MarkerVisualKind } from "@/src/lib/priorityJourneyCopy"

/**
 * Calm, single-subject–leaning Unsplash picks + off-center focal points so text sits in quieter areas.
 * Heavy blur + golden scrims in CSS unify lighting across cards.
 */
export type OutcomePhotoSpec = {
  src: string
  /** Focal point — bias away from center so the layout feels intentional */
  position: string
}

const u = (id: string, params: Record<string, string> = {}) => {
  const q = new URLSearchParams({ auto: "format", fit: "crop", w: "1400", q: "80", ...params })
  return `https://images.unsplash.com/${id}?${q.toString()}`
}

export const OUTCOME_PHOTO_BY_KIND: Record<MarkerVisualKind, OutcomePhotoSpec> = {
  /** Warm sun haze through trees — relief, outdoors, no “stressed portrait” */
  vitamin_d: {
    src: u("photo-1500530855697-b586d89ba3ee"),
    position: "62% 28%",
  },
  /** Single-ingredient greens — not a full spread */
  iron_o2: {
    src: u("photo-1546833999-b9f581a1996d"),
    position: "32% 42%",
  },
  /** Simple stretch silhouette — energy without clutter */
  b12: {
    src: u("photo-1544367567-0f2fcb009e0b"),
    position: "78% 22%",
  },
  /** Soft calm interior / rest */
  magnesium: {
    src: u("photo-1511295742362-92c96b1cf484"),
    position: "48% 32%",
  },
  /** One clear leafy subject */
  folate: {
    src: u("photo-1610832958506-aa56368176cf"),
    position: "40% 38%",
  },
  /** Open water — low detail, soft */
  inflammation: {
    src: u("photo-1507525428034-b723cf961d3e"),
    position: "55% 38%",
  },
  /** Nourishing plate — softened heavily in CSS */
  metabolic: {
    src: u("photo-1490645935967-10de6ba17061"),
    position: "28% 36%",
  },
  /** Golden-hour walk — rhythm, same warm world as Vitamin D */
  thyroid: {
    src: u("photo-1495616811223-4d98c749e173"),
    position: "72% 30%",
  },
  /** Single oil / fat cue — minimal detail */
  lipids: {
    src: u("photo-1474979266404-7eaacbcd87c5"),
    position: "38% 44%",
  },
  /** Fresh bowl — same warm kitchen light */
  liver: {
    src: u("photo-1512621776951-a57141f2eefd"),
    position: "65% 35%",
  },
  /** Water surface — hydration, calm */
  kidney: {
    src: u("photo-1551882547-ff40c63fe5fa"),
    position: "45% 40%",
  },
  /** Open trail / warm air — vitality without busy gym clutter */
  hormone: {
    src: u("photo-1506905925346-21bda4d32df4"),
    position: "58% 32%",
  },
  default: {
    src: u("photo-1470252649378-9c29740c9fa8"),
    position: "48% 36%",
  },
}

export function getOutcomePhoto(kind: MarkerVisualKind): OutcomePhotoSpec {
  return OUTCOME_PHOTO_BY_KIND[kind] ?? OUTCOME_PHOTO_BY_KIND.default
}
