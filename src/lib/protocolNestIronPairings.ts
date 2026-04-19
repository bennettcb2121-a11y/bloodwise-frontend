import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { stackItemStorageKey } from "@/src/lib/stackAcquisition"
import { isIronStackRow, isVitaminCStackRow } from "@/src/lib/supplementProtocolDetail"

/**
 * When both iron and vitamin C are on the stack, show vitamin C nested under the first iron row
 * (same meal for non-heme iron absorption) instead of listing C again in “Anytime / with food.”
 */
export function prepareProtocolRowsWithVitaminCNestingUnderIron(rows: SavedSupplementStackItem[]): {
  displayRows: SavedSupplementStackItem[]
  nestedVitaminC: SavedSupplementStackItem[]
  firstIronStorageKey: string | null
} {
  const hasIron = rows.some((r) => isIronStackRow(r.marker, r.supplementName))
  const vitC = rows.filter((r) => isVitaminCStackRow(r.marker, r.supplementName))
  const nest = hasIron && vitC.length > 0
  const displayRows = nest ? rows.filter((r) => !isVitaminCStackRow(r.marker, r.supplementName)) : rows
  const firstIron = displayRows.find((r) => isIronStackRow(r.marker, r.supplementName))
  const firstIronStorageKey = firstIron ? stackItemStorageKey(firstIron) : null
  return {
    displayRows,
    nestedVitaminC: nest ? vitC : [],
    firstIronStorageKey,
  }
}
