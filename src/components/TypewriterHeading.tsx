"use client"

import React, { useEffect, useState } from "react"

const REVEAL_DELAY_MS = 14

type Props = {
  children: string
  as?: "h1" | "h2" | "h3"
  className?: string
  /** `pop` — staggered letter pop-in (good for short greetings). `reveal` — classic character reveal (onboarding). */
  variant?: "pop" | "reveal"
}

/** Heading with optional pop-in (per letter) or typewriter-style reveal. */
export function TypewriterHeading({ children, as: Tag = "h1", className = "", variant = "reveal" }: Props) {
  const text = String(children)

  if (variant === "pop") {
    const chars = Array.from(text)
    return (
      <Tag className={`typewriter-heading ${className}`.trim()} aria-label={text}>
        {chars.map((char, i) => (
          <span
            key={`${i}-${char}`}
            className="typewriter-heading-char"
            style={{ animationDelay: `${i * 42}ms` }}
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
