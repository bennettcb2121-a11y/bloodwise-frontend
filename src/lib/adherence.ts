/**
 * Protocol adherence: per-item weekly completion and overall consistency.
 * Uses protocol_log history for the last 7 days and stack item names.
 */

export type AdherenceItem = {
  itemName: string
  daysCompleted: number
  pct: number
}

export type AdherenceResult = {
  /** Per stack item: X% of days this week. */
  perItem: AdherenceItem[]
  /** Overall adherence: share of days where at least one item was logged (or all items when strict). */
  overallPct: number
  /** Same as overallPct, labeled for UI as "Protocol consistency". */
  consistencyPct: number
}

/**
 * Compute adherence from protocol log history (last 7 days) and list of stack item names.
 * perItem: for each item, how many days it was checked / 7.
 * overallPct: days where at least one item was checked / 7 (participation), then * 100.
 * consistencyPct: average of per-item percentages (how consistently each item was taken).
 */
export function getAdherence(
  history: Array<{ log_date: string; checks: Record<string, boolean> }>,
  stackItemNames: string[]
): AdherenceResult {
  const daysInWindow = 7
  const perItem: AdherenceItem[] = stackItemNames.map((name) => {
    let daysCompleted = 0
    for (const day of history) {
      if (day.checks[name]) daysCompleted++
    }
    const pct = daysInWindow > 0 ? Math.round((daysCompleted / daysInWindow) * 100) : 0
    return { itemName: name, daysCompleted, pct }
  })

  let daysWithAny = 0
  let daysAllCompleted = 0
  for (let i = 0; i < daysInWindow; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayLog = history.find((h) => h.log_date === dateStr)
    const checks = dayLog?.checks ?? {}
    const anyChecked = Object.values(checks).some(Boolean)
    if (anyChecked) daysWithAny++
    const allChecked =
      stackItemNames.length > 0 &&
      stackItemNames.every((name) => checks[name])
    if (allChecked) daysAllCompleted++
  }
  const overallPct =
    daysInWindow > 0 ? Math.round((daysWithAny / daysInWindow) * 100) : 0
  const consistencyPct =
    perItem.length > 0
      ? Math.round(
          perItem.reduce((sum, x) => sum + x.pct, 0) / perItem.length
        )
      : overallPct

  return {
    perItem,
    overallPct,
    consistencyPct,
  }
}
