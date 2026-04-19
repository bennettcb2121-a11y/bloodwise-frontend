"use client"

import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"

type Props = {
  size: number
  strokeWidth: number
  progress: number
  activeColor: string
  glowColor: string
  dimColor?: string
  className?: string
}

/**
 * Circular progress ring (0–1). Animates with a spring when `progress` changes.
 */
export function ProtocolProgressRing({
  size,
  strokeWidth,
  progress,
  activeColor,
  glowColor,
  dimColor = "rgba(255,255,255,0.12)",
  className = "",
}: Props) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const spring = useSpring(0, { stiffness: 220, damping: 28, mass: 0.6 })
  const offset = useTransform(spring, (v) => c * (1 - v))

  useEffect(() => {
    spring.set(Math.min(1, Math.max(0, progress)))
  }, [progress, spring])

  const done = progress >= 1
  const glowPx = size <= 46 ? 5 : 10

  return (
    <svg
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={done ? { filter: `drop-shadow(0 0 ${glowPx}px ${glowColor})` } : undefined}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={dimColor}
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={activeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        style={{ strokeDashoffset: offset }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
