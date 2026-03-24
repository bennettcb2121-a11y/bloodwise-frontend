"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  getSupplementInventory,
  upsertSupplementInventory,
  getRunOutDate,
  getDaysUntilRunOut,
} from "@/src/lib/bloodwiseDb"
import type { SavedSupplementStackItem, SupplementInventoryRow } from "@/src/lib/bloodwiseDb"
import { getAffiliateProductForStackItem, getAmazonSearchUrl } from "@/src/lib/stackAffiliate"
import { Package, AlertTriangle } from "lucide-react"

/** Parse dose string to suggest pills/capsules per day (e.g. "1 capsule daily" -> 1). */
function parseDosePerDay(dose: string): number {
  if (!dose?.trim()) return 1
  const lower = dose.toLowerCase()
  const oneMatch = lower.match(/(\d+)\s*(pill|cap|capsule|tablet|softgel|drop)/)
  if (oneMatch) return Math.max(1, parseInt(oneMatch[1], 10) || 1)
  const perDay = lower.match(/(\d+)\s*per\s*day|(\d+)\s*daily/)
  if (perDay) return Math.max(1, parseInt(perDay[1] || perDay[2], 10) || 1)
  const num = lower.match(/^(\d+)/)
  return num ? Math.max(1, parseInt(num[1], 10)) : 1
}

export function SupplementInventoryTracker({
  stack,
  userId,
  notifyDays = 7,
  onLowSupply,
}: {
  stack: SavedSupplementStackItem[]
  userId: string | null
  notifyDays?: number
  onLowSupply?: (items: { name: string; daysLeft: number; reorderUrl: string }[]) => void
}) {
  const [inventory, setInventory] = useState<SupplementInventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<{ pills: number; dosePerDay: number; openedAt: string }>({
    pills: 60,
    dosePerDay: 1,
    openedAt: new Date().toISOString().slice(0, 10),
  })

  const fetchInventory = useCallback(async () => {
    if (!userId) return
    try {
      const rows = await getSupplementInventory(userId)
      setInventory(rows)
    } catch {
      setInventory([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const getInventory = (supplementName: string): SupplementInventoryRow | undefined =>
    inventory.find((r) => r.supplement_name.trim().toLowerCase() === supplementName.trim().toLowerCase())

  const handleSave = async (supplementName: string) => {
    if (!userId) return
    await upsertSupplementInventory(userId, {
      supplement_name: supplementName,
      pills_per_bottle: form.pills,
      dose_per_day: form.dosePerDay,
      opened_at: form.openedAt,
    })
    setEditing(null)
    fetchInventory()
  }

  const validStack = stack.filter((s) => s?.supplementName?.trim())
  if (validStack.length === 0) return null

  const lowSupplyItems = useMemo(() => {
    const out: { name: string; daysLeft: number; reorderUrl: string }[] = []
    validStack.forEach((item) => {
      const inv = getInventory(item.supplementName)
      if (!inv) return
      const runOut = getRunOutDate(inv.opened_at, inv.pills_per_bottle, inv.dose_per_day)
      const daysLeft = getDaysUntilRunOut(runOut)
      if (daysLeft <= notifyDays && daysLeft > -30) {
        const affiliate = getAffiliateProductForStackItem(item)
        const url = affiliate?.affiliateUrl ?? getAmazonSearchUrl(item.supplementName)
        out.push({ name: item.supplementName, daysLeft, reorderUrl: url })
      }
    })
    return out
  }, [validStack, inventory, notifyDays])
  const lowSupplyNotifiedRef = useRef(false)
  useEffect(() => {
    if (!loading && lowSupplyItems.length > 0 && onLowSupply && !lowSupplyNotifiedRef.current) {
      lowSupplyNotifiedRef.current = true
      onLowSupply(lowSupplyItems)
    }
  }, [loading, lowSupplyItems, onLowSupply])

  return (
    <div className="supplement-inventory-tracker">
      <h4 className="supplement-inventory-title">
        <Package size={16} aria-hidden /> Track supply & reorder
      </h4>
      <p className="supplement-inventory-intro">
        Set pills per bottle and how many you take daily — we&apos;ll tell you when to reorder and link you to our recommended options.
      </p>
      <ul className="supplement-inventory-list" aria-label="Supplement supply">
        {validStack.map((item) => {
          const inv = getInventory(item.supplementName)
          const runOut = inv
            ? getRunOutDate(inv.opened_at, inv.pills_per_bottle, inv.dose_per_day)
            : null
          const daysLeft = runOut != null ? getDaysUntilRunOut(runOut) : null
          const isLow = daysLeft != null && daysLeft <= notifyDays && daysLeft > -30
          const affiliate = getAffiliateProductForStackItem(item)
          const reorderUrl = affiliate?.affiliateUrl ?? getAmazonSearchUrl(item.supplementName)
          const isEditing = editing === item.supplementName

          return (
            <li key={item.supplementName} className={`supplement-inventory-row ${isLow ? "supplement-inventory-row--low" : ""}`}>
              <div className="supplement-inventory-row-header">
                <span className="supplement-inventory-name">{item.supplementName}</span>
                {item.dose && <span className="supplement-inventory-dose">{item.dose}</span>}
              </div>
              {inv ? (
                <>
                  <div className="supplement-inventory-stats">
                    <span>{inv.pills_per_bottle} pills/bottle</span>
                    <span>·</span>
                    <span>{inv.dose_per_day}/day</span>
                    <span>·</span>
                    <span>Started {new Date(inv.opened_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {runOut && (
                    <div className="supplement-inventory-runout">
                      {daysLeft != null && daysLeft <= 0 ? (
                        <span className="supplement-inventory-runout--out">Out — reorder now</span>
                      ) : daysLeft != null && daysLeft <= notifyDays ? (
                        <span className="supplement-inventory-runout--low">
                          <AlertTriangle size={14} aria-hidden /> Runs out in {daysLeft} day{daysLeft !== 1 ? "s" : ""} (by {new Date(runOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                        </span>
                      ) : (
                        <span className="supplement-inventory-runout--ok">Runs out ~{new Date(runOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  )}
                  <div className="supplement-inventory-actions">
                    <a href={reorderUrl} target="_blank" rel="noopener noreferrer" className="supplement-inventory-reorder-btn">
                      {isLow || (daysLeft != null && daysLeft <= 0) ? "Reorder on Amazon — don’t run out" : "Reorder on Amazon"}
                    </a>
                    <button
                      type="button"
                      className="supplement-inventory-edit-btn"
                      onClick={() => {
                        setEditing(item.supplementName)
                        setForm({
                          pills: inv.pills_per_bottle,
                          dosePerDay: inv.dose_per_day,
                          openedAt: inv.opened_at,
                        })
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </>
                  ) : (
                    !isEditing && (
                      <button
                        type="button"
                        className="supplement-inventory-add-btn"
                        onClick={() => {
                          setEditing(item.supplementName)
                          setForm({
                            pills: 60,
                            dosePerDay: parseDosePerDay(item.dose ?? ""),
                            openedAt: new Date().toISOString().slice(0, 10),
                          })
                        }}
                      >
                        Track supply
                      </button>
                    )
                  )}
              {isEditing && editing === item.supplementName && (
                <div className="supplement-inventory-form">
                  <label>
                    <span>Pills in bottle</span>
                    <input
                      type="number"
                      min={1}
                      value={form.pills}
                      onChange={(e) => setForm((f) => ({ ...f, pills: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    />
                  </label>
                  <label>
                    <span>Take per day</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={form.dosePerDay}
                      onChange={(e) => setForm((f) => ({ ...f, dosePerDay: Math.max(0.5, parseFloat(e.target.value) || 1) }))}
                    />
                  </label>
                  <label>
                    <span>Started this bottle</span>
                    <input
                      type="date"
                      value={form.openedAt}
                      onChange={(e) => setForm((f) => ({ ...f, openedAt: e.target.value }))}
                    />
                  </label>
                  <div className="supplement-inventory-form-actions">
                    <button type="button" className="supplement-inventory-save-btn" onClick={() => handleSave(item.supplementName)}>
                      Save
                    </button>
                    <button type="button" className="supplement-inventory-cancel-btn" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
