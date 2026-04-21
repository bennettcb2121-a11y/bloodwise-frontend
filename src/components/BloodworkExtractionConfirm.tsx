"use client"

import React, { useMemo, useState } from "react"
import { AlertTriangle, Check, Edit2 } from "lucide-react"
import type { UploadedExtraction } from "@/src/components/BloodworkUploadModal"
import { resolveExtractedLabName } from "@/src/lib/biomarkerAliases"
import { normalizeToCanonical } from "@/src/lib/unitConversion"
import { biomarkerDatabase } from "@/src/lib/biomarkerDatabase"

type Props = {
  sessionId: string
  extractions: UploadedExtraction[]
  onConfirmed?: () => void
}

type ConfirmRow = {
  /** Stable id across renders so the list order remains editable. */
  id: string
  rawName: string
  mappedKey: string | null
  rawValue: number | null
  value: number
  rawUnit: string
  unit: string
  rangeLow: number | null
  rangeHigh: number | null
  flag: string
  confidence: number
  included: boolean
  /** True when the AI was low-confidence OR the value was unit-unrecoverable. */
  needsReview: boolean
}

/** Curated critical-care thresholds — if any confirmed value crosses these, the UI surfaces a banner recommending urgent medical follow-up. */
const RED_ZONE: Array<{ key: string; predicate: (v: number) => boolean; reason: string }> = [
  { key: "Glucose", predicate: (v) => v >= 300, reason: "Glucose ≥ 300 mg/dL suggests severe hyperglycemia — contact your clinician today." },
  { key: "Glucose", predicate: (v) => v <= 54, reason: "Glucose ≤ 54 mg/dL is severe hypoglycemia — seek immediate medical attention." },
  { key: "HbA1c", predicate: (v) => v >= 10, reason: "HbA1c ≥ 10% is a warning sign for uncontrolled diabetes — contact your clinician this week." },
  { key: "Potassium", predicate: (v) => v >= 6.0 || v <= 3.0, reason: "Potassium outside 3.0–6.0 mmol/L can be dangerous — contact your clinician." },
  { key: "Sodium", predicate: (v) => v <= 125 || v >= 155, reason: "Sodium outside 125–155 mmol/L warrants urgent clinical review." },
  { key: "Hemoglobin", predicate: (v) => v <= 8, reason: "Hemoglobin ≤ 8 g/dL is severe anemia — contact your clinician." },
  { key: "Creatinine", predicate: (v) => v >= 2.0, reason: "Creatinine ≥ 2.0 mg/dL suggests significant kidney impairment — contact your clinician." },
  { key: "eGFR", predicate: (v) => v < 30, reason: "eGFR < 30 mL/min/1.73m² indicates advanced kidney disease — clinical follow-up needed." },
  { key: "ALT", predicate: (v) => v >= 200, reason: "ALT ≥ 200 U/L suggests significant liver injury — contact your clinician." },
  { key: "PSA", predicate: (v) => v >= 10, reason: "PSA ≥ 10 ng/mL warrants urology referral." },
]

function buildRows(extractions: UploadedExtraction[]): ConfirmRow[] {
  const out: ConfirmRow[] = []
  let i = 0
  for (const ex of extractions) {
    if (!ex.extraction) continue
    for (const r of ex.extraction.rows) {
      i += 1
      if (r.value == null || !Number.isFinite(r.value)) {
        out.push({
          id: `row-${i}`,
          rawName: r.testName,
          mappedKey: resolveExtractedLabName(r.testName),
          rawValue: null,
          value: NaN,
          rawUnit: r.unit,
          unit: r.unit,
          rangeLow: r.rangeLow,
          rangeHigh: r.rangeHigh,
          flag: r.flag,
          confidence: r.confidence,
          included: false,
          needsReview: true,
        })
        continue
      }
      const key = resolveExtractedLabName(r.testName)
      const normalized = key
        ? normalizeToCanonical(key, r.value, r.unit)
        : { value: r.value, unit: r.unit }
      const unitRecoverable = normalized !== null
      out.push({
        id: `row-${i}`,
        rawName: r.testName,
        mappedKey: key,
        rawValue: r.value,
        value: normalized?.value ?? r.value,
        rawUnit: r.unit,
        unit: normalized?.unit ?? r.unit,
        rangeLow: r.rangeLow,
        rangeHigh: r.rangeHigh,
        flag: r.flag,
        confidence: r.confidence,
        included: !!key,
        needsReview: !key || !unitRecoverable || r.confidence < 0.7,
      })
    }
  }
  return out
}

export function BloodworkExtractionConfirm({ sessionId, extractions, onConfirmed }: Props) {
  const initial = useMemo(() => buildRows(extractions), [extractions])
  const [rows, setRows] = useState<ConfirmRow[]>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>("")
  const [remappingId, setRemappingId] = useState<string | null>(null)

  const collectedAt = useMemo(() => {
    for (const ex of extractions) {
      if (ex.extraction?.collected_at) return ex.extraction.collected_at
    }
    return ""
  }, [extractions])

  const includedRows = rows.filter((r) => r.included && Number.isFinite(r.value))
  const unmapped = rows.filter((r) => !r.mappedKey)

  const redFlags = useMemo(() => {
    const hits: string[] = []
    for (const r of includedRows) {
      if (!r.mappedKey) continue
      for (const rule of RED_ZONE) {
        if (rule.key === r.mappedKey && rule.predicate(r.value)) {
          hits.push(rule.reason)
        }
      }
    }
    return Array.from(new Set(hits))
  }, [includedRows])

  const updateRow = (id: string, patch: Partial<ConfirmRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const confirm = async () => {
    if (submitting || includedRows.length === 0) return
    setSubmitting(true)
    setError("")
    try {
      const payload = {
        sessionId,
        collected_at: collectedAt || null,
        values: includedRows
          .filter((r) => r.mappedKey)
          .map((r) => ({
            biomarker_key: r.mappedKey as string,
            value: r.value,
            unit: r.unit,
            raw_name: r.rawName,
            raw_value: r.rawValue?.toString() ?? "",
            raw_unit: r.rawUnit,
            range_low: r.rangeLow,
            range_high: r.rangeHigh,
            flag: r.flag,
            confidence: r.confidence,
          })),
      }
      const res = await fetch("/api/labs/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save values. Please try again.")
        setSubmitting(false)
        return
      }
      onConfirmed?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Group confirmed rows by panel — simple bucketing using key name heuristics from biomarkerDatabase.
  const grouped = useMemo(() => {
    const groups: Record<string, ConfirmRow[]> = {}
    for (const r of rows) {
      const label = groupLabelFor(r.mappedKey)
      if (!groups[label]) groups[label] = []
      groups[label].push(r)
    }
    return groups
  }, [rows])

  return (
    <div className="clarion-lab-confirm-panel">
      <h2 className="clarion-lab-confirm-panel__title">
        Confirm extracted values
      </h2>
      <p className="clarion-labs-sub">
        Review each row. Uncheck anything we shouldn&apos;t save, and edit values if we misread them.
        Your uploaded PDF/image will be deleted immediately after you confirm.
      </p>

      {redFlags.length > 0 ? (
        <div className="clarion-lab-redzone">
          <AlertTriangle size={20} aria-hidden />
          <div>
            <strong>Possible critical value detected</strong>
            <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1rem" }}>
              {redFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="clarion-lab-confirm-panel__group">
          <div className="clarion-lab-confirm-panel__group-label">{group}</div>
          {items.map((r) => (
            <div
              key={r.id}
              className={`clarion-lab-confirm-row ${r.needsReview ? "clarion-lab-confirm-row--low-conf" : ""}`}
            >
              <label className="clarion-lab-confirm-row__name" title={r.rawName}>
                <input
                  type="checkbox"
                  checked={r.included}
                  onChange={(e) => updateRow(r.id, { included: e.target.checked })}
                  disabled={!r.mappedKey}
                  style={{ marginRight: "0.5rem" }}
                />
                {r.mappedKey ?? r.rawName}
                {r.mappedKey && r.mappedKey !== r.rawName ? (
                  <small style={{ color: "var(--color-text-muted)", marginLeft: "0.4rem", fontSize: "0.72rem" }}>
                    from &quot;{r.rawName}&quot;
                  </small>
                ) : null}
              </label>
              <input
                className="clarion-lab-confirm-row__input"
                type="number"
                step="any"
                value={Number.isFinite(r.value) ? r.value : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  updateRow(r.id, { value: Number.isFinite(v) ? v : NaN })
                }}
              />
              <span className="clarion-lab-confirm-row__unit">{r.unit}</span>
              {r.flag ? <span className="clarion-lab-confirm-row__flag">{r.flag}</span> : <span />}
            </div>
          ))}
        </div>
      ))}

      {unmapped.length > 0 ? (
        <div className="clarion-lab-unmapped">
          <h4>We couldn&apos;t match these markers</h4>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            You can still save them as manual entries later, or pick a biomarker we know.
          </p>
          <ul>
            {unmapped.map((r) => (
              <li key={r.id}>
                <strong>{r.rawName}</strong>
                {r.rawValue != null ? (
                  <>
                    {" · "}
                    {r.rawValue} {r.rawUnit}
                  </>
                ) : null}{" "}
                <button
                  type="button"
                  className="clarion-lab-dropzone__btn"
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                  onClick={() => setRemappingId(remappingId === r.id ? null : r.id)}
                >
                  <Edit2 size={14} aria-hidden /> {remappingId === r.id ? "Cancel" : "Map manually"}
                </button>
                {remappingId === r.id ? (
                  <RemapControl
                    onPick={(key) => {
                      const normalized = normalizeToCanonical(key, r.value || 0, r.rawUnit)
                      updateRow(r.id, {
                        mappedKey: key,
                        value: normalized?.value ?? r.value,
                        unit: normalized?.unit ?? r.unit,
                        included: true,
                        needsReview: false,
                      })
                      setRemappingId(null)
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="clarion-consent-gate__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="clarion-lab-actions">
        <button
          type="button"
          className="clarion-lab-actions__primary"
          disabled={submitting || includedRows.length === 0}
          onClick={() => void confirm()}
        >
          <Check size={16} aria-hidden style={{ marginRight: "0.3rem" }} />
          {submitting ? "Saving…" : `Confirm ${includedRows.length} value${includedRows.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  )
}

function groupLabelFor(key: string | null): string {
  if (!key) return "Unmatched"
  const k = key.toLowerCase()
  if (/^(ferritin|serum iron|tibc|transferrin|stfr)/.test(k)) return "Iron"
  if (/^(vitamin d|vitamin b12|active b12|folate|rbc folate|mma|homocysteine)/.test(k)) return "Vitamins"
  if (/^(magnesium|zinc|selenium|iodine)/.test(k)) return "Minerals"
  if (/(glucose|insulin|hba1c|c-peptide|uric acid)/.test(k)) return "Glycemic"
  if (/(hdl|ldl|triglycerides|cholesterol|apob|lipoprotein)/.test(k)) return "Lipids"
  if (/(crp|esr|fibrinogen)/.test(k)) return "Inflammation"
  if (/(tsh|t4|t3|tpo)/.test(k)) return "Thyroid"
  if (/(hemoglobin|hematocrit|rbc|wbc|platelet|mcv|mch|rdw)/.test(k)) return "CBC"
  if (/(sodium|potassium|chloride|co2|bun|creatinine|egfr|calcium|albumin|total protein|bilirubin|ast|alt|alkaline phosphatase|ggt)/.test(k)) return "Metabolic / Liver"
  if (/(testosterone|free testosterone|shbg|estradiol|progesterone|cortisol|lh|fsh|prolactin|dhea|psa|pth)/.test(k)) return "Hormones"
  return "Other"
}

type RemapProps = { onPick: (key: string) => void }
function RemapControl({ onPick }: RemapProps) {
  const [q, setQ] = useState("")
  const options = useMemo(() => {
    const all = Object.keys(biomarkerDatabase)
    if (!q.trim()) return all.slice(0, 12)
    const lower = q.trim().toLowerCase()
    return all.filter((k) => k.toLowerCase().includes(lower)).slice(0, 20)
  }, [q])
  return (
    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <input
        className="clarion-lab-confirm-row__input"
        style={{ width: "100%", textAlign: "left" }}
        placeholder="Search markers…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className="clarion-lab-dropzone__btn"
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}
            onClick={() => onPick(opt)}
          >
            {opt}
          </button>
        ))}
        {options.length === 0 ? (
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No matches</span>
        ) : null}
      </div>
    </div>
  )
}
