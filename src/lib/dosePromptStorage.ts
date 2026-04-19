const STORAGE_PREFIX = "clarion_dose_ack_v1_"

export function loadDoseAckMap(userId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function setDoseAcknowledged(userId: string, storageKey: string): void {
  if (typeof window === "undefined") return
  const m = loadDoseAckMap(userId)
  m[storageKey] = true
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(m))
  } catch {}
}
