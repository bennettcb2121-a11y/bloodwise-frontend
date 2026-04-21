import { invalidateBootstrapCache } from "@/src/lib/dashboardBootstrapCache"

/** Fired after profile is saved from a sheet so Home / Plan can refresh without a full reload. */
export const CLARION_PROFILE_UPDATED_EVENT = "clarion-profile-updated"

export function dispatchProfileUpdated(): void {
  if (typeof window === "undefined") return
  invalidateBootstrapCache()
  window.dispatchEvent(new Event(CLARION_PROFILE_UPDATED_EVENT))
}
