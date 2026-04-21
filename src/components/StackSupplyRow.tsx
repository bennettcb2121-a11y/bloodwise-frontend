"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Package } from "lucide-react"
import {
  getDaysUntilRunOut,
  getRunOutDate,
  SupplementInventoryUnavailableError,
  type SavedSupplementStackItem,
  type SupplementInventoryRow,
} from "@/src/lib/bloodwiseDb"
import { getStackItemReorderContext } from "@/src/lib/stackItemReorder"
import { getSupplementDetail } from "@/src/lib/supplementProtocolDetail"
import type { AcquisitionMode } from "@/src/lib/stackAcquisition"
import { StackItemActionsMenu } from "@/src/components/StackItemActionsMenu"
import { getStackItemBadgeKind } from "@/src/lib/stackLabSafety"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { notifications } from "@mantine/notifications"

/** Parse free-text dose ("1 capsule daily", "2 per day") into a pills/day integer. */
function parseDosePerDay(dose: string | undefined): number {
  if (!dose?.trim()) return 1
  const lower = dose.toLowerCase()
  const perUnit = lower.match(/(\d+)\s*(pill|cap|capsule|tablet|softgel|drop)/)
  if (perUnit) return Math.max(1, parseInt(perUnit[1], 10) || 1)
  const perDay = lower.match(/(\d+)\s*per\s*day|(\d+)\s*daily/)
  if (perDay) return Math.max(1, parseInt(perDay[1] || perDay[2], 10) || 1)
  const leading = lower.match(/^(\d+)/)
  return leading ? Math.max(1, parseInt(leading[1], 10)) : 1
}

export type StackSupplyRowStatus =
  | { kind: "pending" }
  | { kind: "ordered" }
  | { kind: "shipped" }
  | { kind: "have"; supply: SupplyState | null }

export type SupplyState =
  | { kind: "out"; runOutDate: string }
  | { kind: "low"; daysLeft: number; runOutDate: string }
  | { kind: "ok"; daysLeft: number; runOutDate: string; percentLeft: number }

function computeSupplyState(
  inventory: SupplementInventoryRow | null,
  notifyDays: number
): SupplyState | null {
  if (!inventory) return null
  const pills = Number(inventory.pills_per_bottle)
  const dose = Number(inventory.dose_per_day)
  if (!Number.isFinite(pills) || pills <= 0) return null
  if (!Number.isFinite(dose) || dose <= 0) return null
  const runOutDate = getRunOutDate(inventory.opened_at, pills, dose)
  const daysLeft = getDaysUntilRunOut(runOutDate)
  if (daysLeft <= 0) return { kind: "out", runOutDate }
  if (daysLeft <= notifyDays) return { kind: "low", daysLeft, runOutDate }
  const totalDays = Math.max(1, Math.floor(pills / dose))
  const percentLeft = Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)))
  return { kind: "ok", daysLeft, runOutDate, percentLeft }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

type Props = {
  item: SavedSupplementStackItem
  storageKey: string
  mode: AcquisitionMode
  inventory: SupplementInventoryRow | null
  analysisResults: BiomarkerResult[]
  notifyDays: number
  /** Auto-open the inline supply form after a user marks an item as "have". */
  autoOpenSupplyForm: boolean
  onConsumedAutoOpen: () => void
  onSetMode: (mode: AcquisitionMode) => void
  onSaveInventory: (row: Omit<SupplementInventoryRow, "user_id" | "id" | "created_at" | "updated_at">) => Promise<void>
  onEdit: () => void
  onDelete: () => void
}

export function StackSupplyRow({
  item,
  storageKey,
  mode,
  inventory,
  analysisResults,
  notifyDays,
  autoOpenSupplyForm,
  onConsumedAutoOpen,
  onSetMode,
  onSaveInventory,
  onEdit,
  onDelete,
}: Props) {
  void storageKey
  const reorderCtx = useMemo(() => getStackItemReorderContext(item), [item])
  const detail = useMemo(() => getSupplementDetail(item.marker, item.supplementName), [item])
  const badgeKind = useMemo(() => getStackItemBadgeKind(item, analysisResults), [item, analysisResults])

  const supply = useMemo(
    () => (mode === "have" ? computeSupplyState(inventory, notifyDays) : null),
    [inventory, notifyDays, mode]
  )

  const [supplyFormOpen, setSupplyFormOpen] = useState(false)
  const [formPills, setFormPills] = useState<number>(() => inventory?.pills_per_bottle ?? 60)
  const [formDose, setFormDose] = useState<number>(() => inventory?.dose_per_day ?? parseDosePerDay(item.dose))
  const [formOpenedAt, setFormOpenedAt] = useState<string>(
    () => inventory?.opened_at ?? new Date().toISOString().slice(0, 10)
  )
  const [saving, setSaving] = useState(false)
  const consumedRef = useRef(false)

  useEffect(() => {
    if (!autoOpenSupplyForm || consumedRef.current) return
    consumedRef.current = true
    setFormPills(inventory?.pills_per_bottle ?? 60)
    setFormDose(inventory?.dose_per_day ?? parseDosePerDay(item.dose))
    setFormOpenedAt(inventory?.opened_at ?? new Date().toISOString().slice(0, 10))
    setSupplyFormOpen(true)
    onConsumedAutoOpen()
  }, [autoOpenSupplyForm, inventory, item.dose, onConsumedAutoOpen])

  const handleOpenForm = () => {
    setFormPills(inventory?.pills_per_bottle ?? 60)
    setFormDose(inventory?.dose_per_day ?? parseDosePerDay(item.dose))
    setFormOpenedAt(inventory?.opened_at ?? new Date().toISOString().slice(0, 10))
    setSupplyFormOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveInventory({
        supplement_name: item.supplementName,
        pills_per_bottle: formPills,
        dose_per_day: formDose,
        opened_at: formOpenedAt,
      })
      setSupplyFormOpen(false)
    } catch (e) {
      if (e instanceof SupplementInventoryUnavailableError) {
        notifications.show({
          title: "Database setup needed",
          message: e.message,
          color: "yellow",
          autoClose: 14000,
        })
      } else {
        notifications.show({
          title: "Couldn’t save",
          message: "Try again in a moment.",
          color: "red",
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const chip = (() => {
    if (mode === "none") {
      return { text: "Pending — confirm you own this", tone: "neutral" as const }
    }
    if (mode === "ordered") {
      return { text: "Ordered — mark when it arrives", tone: "info" as const }
    }
    if (mode === "shipped") {
      return { text: "In transit — mark when it arrives", tone: "info" as const }
    }
    if (!supply) {
      return { text: "On hand", tone: "success" as const }
    }
    if (supply.kind === "out") {
      return { text: `Out — reorder now`, tone: "danger" as const }
    }
    if (supply.kind === "low") {
      return { text: `Running low · ${supply.daysLeft}d left`, tone: "warn" as const }
    }
    return { text: `~${supply.daysLeft}d left`, tone: "success" as const }
  })()

  const rowToneClass = (() => {
    if (mode === "none") return " dashboard-stack-row--pending"
    if (mode === "ordered") return " dashboard-stack-row--ordered"
    if (mode === "shipped") return " dashboard-stack-row--shipped"
    if (supply?.kind === "out") return " dashboard-stack-row--supply-out"
    if (supply?.kind === "low") return " dashboard-stack-row--supply-low"
    return ""
  })()

  return (
    <li className={`dashboard-stack-row dashboard-stack-row--v2${rowToneClass}`}>
      {reorderCtx.imageUrl ? (
        <img
          src={reorderCtx.imageUrl}
          alt=""
          className="dashboard-stack-row-img"
          width={48}
          height={48}
        />
      ) : (
        <div className="dashboard-stack-row-img dashboard-stack-row-img-placeholder" aria-hidden />
      )}

      <div className="dashboard-stack-row-body">
        <div className="dashboard-stack-row-main">
          <span className="dashboard-stack-item-name">
            {item.supplementName}
            {badgeKind === "maintenance" ? (
              <span
                className="dashboard-stack-lab-optional"
                title="Maintenance context — labs in range; optional for your training profile"
              >
                !
              </span>
            ) : badgeKind === "optional_lab" ? (
              <span
                className="dashboard-stack-lab-optional"
                title="Labs look good — optional review"
              >
                !
              </span>
            ) : badgeKind === "user_product_review" ? (
              <span
                className="dashboard-stack-lab-optional"
                title="Clarion’s lab fit check suggested reviewing this product — you chose to keep logging what you use; discuss with your clinician."
              >
                !
              </span>
            ) : null}
          </span>
          {item.dose && <span className="dashboard-stack-item-dose">{item.dose}</span>}
          {item.monthlyCost > 0 && (
            <span className="dashboard-stack-item-cost">${item.monthlyCost.toFixed(0)}/mo</span>
          )}
          <span
            className={`dashboard-stack-chip dashboard-stack-chip--${chip.tone}`}
            aria-label={`Status: ${chip.text}`}
          >
            {chip.tone === "warn" || chip.tone === "danger" ? (
              <AlertTriangle size={12} aria-hidden />
            ) : null}
            <span>{chip.text}</span>
          </span>
        </div>

        {mode === "have" && supply ? (
          <div
            className={`dashboard-stack-progress dashboard-stack-progress--${supply.kind}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={supply.kind === "ok" ? supply.percentLeft : supply.kind === "low" ? 20 : 0}
            aria-label={`Supply progress for ${item.supplementName}`}
          >
            <div
              className="dashboard-stack-progress-fill"
              style={{
                width:
                  supply.kind === "ok"
                    ? `${supply.percentLeft}%`
                    : supply.kind === "low"
                      ? "20%"
                      : "4%",
              }}
            />
            <span className="dashboard-stack-progress-label">
              {supply.kind === "out"
                ? "Out of supply"
                : `Runs out ${formatShortDate(supply.runOutDate)} · ${inventory?.pills_per_bottle ?? 0} pills/bottle · ${inventory?.dose_per_day ?? 0}/day`}
            </span>
          </div>
        ) : null}

        {mode === "have" && !supply && !supplyFormOpen ? (
          <button
            type="button"
            className="dashboard-stack-supply-cta"
            onClick={handleOpenForm}
          >
            <Package size={14} aria-hidden /> Track supply — we’ll warn you when it runs low
          </button>
        ) : null}

        {detail && (detail.timing || detail.avoid) && (
          <div className="dashboard-stack-detail">
            {detail.timing && <span className="dashboard-stack-timing">{detail.timing}</span>}
            {detail.avoid && <span className="dashboard-stack-avoid">Avoid: {detail.avoid}</span>}
          </div>
        )}

        <div className="dashboard-stack-row-actions">
          {mode === "none" ? (
            <>
              <button
                type="button"
                className="dashboard-stack-acq-btn dashboard-stack-acq-btn--primary"
                onClick={() => onSetMode("have")}
              >
                I have it
              </button>
              <button
                type="button"
                className="dashboard-stack-acq-btn"
                onClick={() => onSetMode("ordered")}
              >
                I ordered it
              </button>
              <button
                type="button"
                className="dashboard-stack-acq-btn"
                onClick={() => onSetMode("shipped")}
              >
                On the way
              </button>
              <a
                href={reorderCtx.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-stack-reorder-btn dashboard-stack-reorder-btn--compact"
              >
                {reorderCtx.primaryLabel}
              </a>
            </>
          ) : mode === "ordered" || mode === "shipped" ? (
            <>
              {mode === "ordered" ? (
                <button
                  type="button"
                  className="dashboard-stack-acq-btn"
                  onClick={() => onSetMode("shipped")}
                >
                  Mark shipped
                </button>
              ) : null}
              <button
                type="button"
                className="dashboard-stack-acq-btn dashboard-stack-acq-btn--primary"
                onClick={() => onSetMode("have")}
              >
                Arrived — have it
              </button>
              <a
                href={reorderCtx.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-stack-reorder-btn dashboard-stack-reorder-btn--compact"
              >
                {reorderCtx.primaryLabel}
              </a>
            </>
          ) : (
            <>
              <a
                href={reorderCtx.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`dashboard-stack-reorder-btn${
                  supply?.kind === "out" || supply?.kind === "low"
                    ? " dashboard-stack-reorder-btn--urgent"
                    : ""
                }`}
              >
                {supply?.kind === "out" || supply?.kind === "low"
                  ? reorderCtx.isUserLink
                    ? "Reorder — don’t run out"
                    : "Reorder — don’t run out"
                  : reorderCtx.primaryLabel}
              </a>
              {reorderCtx.secondaryUrl ? (
                <a
                  href={reorderCtx.secondaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-stack-reorder-btn dashboard-stack-reorder-btn--secondary dashboard-stack-reorder-btn--compact"
                >
                  {reorderCtx.secondaryLabel}
                </a>
              ) : null}
              {inventory ? (
                <button
                  type="button"
                  className="dashboard-stack-acq-btn"
                  onClick={handleOpenForm}
                >
                  Edit supply
                </button>
              ) : null}
            </>
          )}
        </div>

        {supplyFormOpen ? (
          <div className="dashboard-stack-supply-form" role="group" aria-label={`Supply for ${item.supplementName}`}>
            <label>
              <span>Pills in bottle</span>
              <input
                type="number"
                min={1}
                value={formPills}
                onChange={(e) => setFormPills(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </label>
            <label>
              <span>Take per day</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={formDose}
                onChange={(e) => setFormDose(Math.max(0.5, parseFloat(e.target.value) || 1))}
              />
            </label>
            <label>
              <span>Started this bottle</span>
              <input
                type="date"
                value={formOpenedAt}
                onChange={(e) => setFormOpenedAt(e.target.value)}
              />
            </label>
            <div className="dashboard-stack-supply-form-actions">
              <button
                type="button"
                className="dashboard-stack-supply-save-btn"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="dashboard-stack-supply-cancel-btn"
                onClick={() => setSupplyFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <StackItemActionsMenu
        ariaLabel={`Actions for ${item.supplementName}`}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  )
}
