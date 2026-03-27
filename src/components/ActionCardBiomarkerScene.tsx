"use client"

import React, { useState } from "react"
import type { MarkerVisualKind } from "@/src/lib/priorityJourneyCopy"
import { getOutcomePhoto } from "@/src/lib/actionCardOutcomePhotos"

type Props = {
  kind: MarkerVisualKind
  className?: string
}

/**
 * Full-card underlay photography: soft zoom, edge feather, warm tint — scrim lives on the card.
 */
export function ActionCardBiomarkerScene({ kind, className }: Props) {
  const { src, position } = getOutcomePhoto(kind)
  const [ok, setOk] = useState(true)

  return (
    <div
      className={`action-card-outcome-visual action-card-outcome-visual--${kind} ${className ?? ""}`.trim()}
      aria-hidden
    >
      {ok ? (
        <div className="action-card-outcome-visual__frame">
          <img
            className="action-card-outcome-visual__img"
            src={src}
            alt=""
            decoding="async"
            loading="lazy"
            draggable={false}
            style={{ objectPosition: position }}
            onError={() => setOk(false)}
          />
        </div>
      ) : (
        <div className={`action-card-outcome-visual__fallback action-card-outcome-visual__fallback--${kind}`} />
      )}
      <div className="action-card-outcome-visual__edge" aria-hidden />
      <div className="action-card-outcome-visual__warmth" aria-hidden />
    </div>
  )
}
