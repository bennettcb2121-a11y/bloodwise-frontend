import { getAmbientTimeMood, type DashboardSkyMood } from "@/src/lib/dashboardSkyMood"

/**
 * Time-of-day sky for dashboard routes when full protocol context isn’t available.
 * Same cycle as Home: night → sunrise → clear → sunset → calm.
 */
export function getAmbientRouteSky(hour: number): DashboardSkyMood {
  return getAmbientTimeMood(hour)
}
