/** Monday–Sunday dates for the calendar week containing `todayStr` (YYYY-MM-DD). */
export function getWeekStripDates(todayStr: string): string[] {
  const d = new Date(`${todayStr}T12:00:00`)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    dates.push(x.toISOString().slice(0, 10))
  }
  return dates
}

/** Short labels for Mon–Sun strip (two letters where needed for clarity). */
export const WEEK_STRIP_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const

export type WeekStripDay = {
  dateStr: string
  label: (typeof WEEK_STRIP_LABELS)[number]
  completed: boolean
  isToday: boolean
}

export function buildWeekStrip(todayStr: string, completionByDate: Record<string, boolean>): WeekStripDay[] {
  const dates = getWeekStripDates(todayStr)
  return dates.map((dateStr, i) => ({
    dateStr,
    label: WEEK_STRIP_LABELS[i],
    completed: !!completionByDate[dateStr],
    isToday: dateStr === todayStr,
  }))
}
