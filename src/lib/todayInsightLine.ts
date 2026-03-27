/**
 * Single editorial line for dashboard home — prioritizes actionable copy.
 */
export function getTodayInsightLine(input: {
  doThisFirst: { line: string; title: string } | null
  heroFocusTitle: string
  featuredMicro: string | null
  featuredLabel: string | null
}): string {
  if (input.doThisFirst?.line?.trim()) {
    return input.doThisFirst.line.trim()
  }
  if (input.featuredMicro?.trim()) {
    return input.featuredMicro.trim()
  }
  if (input.featuredLabel?.trim()) {
    return input.featuredLabel.trim()
  }
  const t = input.heroFocusTitle?.trim()
  if (t) return t
  return "Here's your snapshot for today."
}
