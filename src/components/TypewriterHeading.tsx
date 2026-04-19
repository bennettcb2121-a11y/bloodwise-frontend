"use client"

import React, { useEffect, useState } from "react"

const REVEAL_DELAY_MS = 14

type Props = {
  children: string
  as?: "h1" | "h2" | "h3" | "p"
  className?: string
  /** `pop` — staggered letter pop-in (good for short greetings). `reveal` — classic character reveal (onboarding). */
  variant?: "pop" | "reveal"
  /** Pop only: delay before the first character’s animation starts (ms). */
  popStartDelayMs?: number
  /** Pop only: ms between each character’s start (default 42). */
  popCharStaggerMs?: number
}

/** Heading with optional pop-in (per letter) or typewriter-style reveal. */
export function TypewriterHeading({
  children,
  as: Tag = "h1",
  className = "",
  variant = "reveal",
  popStartDelayMs = 0,
  popCharStaggerMs = 42,
}: Props) {
  const text = String(children)

  if (variant === "pop") {
    const chars = Array.from(text)
    const stagger = popCharStaggerMs
    return (
      <Tag className={`typewriter-heading ${className}`.trim()} aria-label={text}>
        {chars.map((char, i) => (
          <span
            key={`${i}-${char}`}
            className="typewriter-heading-char"
            style={{ animationDelay: `${popStartDelayMs + i * stagger}ms` }}
            aria-hidden
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </Tag>
    )
  }

  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    setVisibleLength(0)
    if (!text) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setVisibleLength(i)
      if (i >= text.length) clearInterval(id)
    }, REVEAL_DELAY_MS)
    return () => clearInterval(id)
  }, [text])

  const visible = text.slice(0, visibleLength)
  const hidden = text.slice(visibleLength)

  return (
    <Tag className={className}>
      {visible}
      {hidden ? <span style={{ opacity: 0 }} aria-hidden>{hidden}</span> : null}
    </Tag>
  )
}
