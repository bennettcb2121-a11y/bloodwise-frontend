import type { DashboardSkyMood } from "@/src/lib/dashboardSkyMood"

/**
 * Time-of-day sky for dashboard routes when full protocol context isn’t available.
 * Keeps the same layered sky visuals as Home without duplicating stacks per page.
 */
export function getAmbientRouteSky(hour: number): DashboardSkyMood {
  const h = Math.floor(hour) % 24
  if (h >= 21 || h < 5) return "night"
  if (h >= 5 && h < 9) return "sunrise"
  if (h >= 9 && h < 17) return "clear"
  if (h >= 17 && h < 21) return "calm"
  return "clear"
}
