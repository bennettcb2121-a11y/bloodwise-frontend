"use client"

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import {
  SUPPLEMENT_PRESETS,
  getSupplementPreset,
  parseCurrentSupplementsEntries,
  searchSupplementPresets,
  serializeCurrentSupplementsEntries,
  type SupplementPreset,
} from "@/src/lib/supplementMetadata"
import { isHttpUrl, looksLikeNumericBarcode } from "@/src/lib/barcodeScan"

const SUGGEST_LIMIT = 8

const TOP_PRESET_IDS = ["vitamin_d", "magnesium", "omega3", "iron", "b12", "multivitamin"] as const

function genClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export type WhatITakeSearchBarHandle = {
  focusSearch: () => void
}

type SuggestionRow =
  | { kind: "url"; url: string }
  | { kind: "barcode"; code: string }
  | { kind: "preset"; preset: SupplementPreset }
  | { kind: "custom"; name: string }

type Props = {
  idPrefix?: string
  currentSupplements: string
  cabinetEmpty: boolean
  onSerializedChange: (serialized: string) => void
  onOpenLinkWizard: (url: string) => void
  onLookUpBarcode: (upc: string) => void
  className?: string
}

export const WhatITakeSearchBar = forwardRef<WhatITakeSearchBarHandle, Props>(function WhatITakeSearchBar(
  { idPrefix = "what-i-take-search", currentSupplements, cabinetEmpty, onSerializedChange, onOpenLinkWizard, onLookUpBarcode, className = "" },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useImperativeHandle(ref, () => ({
    focusSearch: () => inputRef.current?.focus(),
  }))

  const entries = useMemo(() => parseCurrentSupplementsEntries(currentSupplements), [currentSupplements])

  const presetSelected = useCallback((id: string) => entries.some((e) => e.id === id), [entries])

  const applySerialized = useCallback(
    (serialized: string) => {
      onSerializedChange(serialized)
    },
    [onSerializedChange]
  )

  const pickPreset = useCallback(
    (preset: SupplementPreset) => {
      const has = presetSelected(preset.id)
      let next = entries.filter((e) => e.id !== preset.id)
      if (!has) {
        next = [...next, { id: preset.id, name: preset.displayName, clientId: genClientId() }]
      }
      applySerialized(serializeCurrentSupplementsEntries(next))
      setQuery("")
      setOpen(false)
    },
    [applySerialized, entries, presetSelected]
  )

  const addCustomName = useCallback(
    (name: string) => {
      const t = name.trim()
      if (!t) return
      const next = [...entries, { name: t, clientId: genClientId() }]
      applySerialized(serializeCurrentSupplementsEntries(next))
      setQuery("")
      setOpen(false)
    },
    [applySerialized, entries]
  )

  const presetMatches = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return searchSupplementPresets(q, SUGGEST_LIMIT)
  }, [query])

  const suggestionRows = useMemo((): SuggestionRow[] => {
    const q = query.trim()
    if (!q) return []
    const rows: SuggestionRow[] = []
    if (isHttpUrl(q)) {
      rows.push({ kind: "url", url: q.trim() })
    }
    if (looksLikeNumericBarcode(q)) {
      rows.push({ kind: "barcode", code: q.replace(/\D/g, "") })
    }
    for (const p of presetMatches) {
      rows.push({ kind: "preset", preset: p })
    }
    const hasPresetExact = presetMatches.some(
      (p) => p.label.toLowerCase() === q.toLowerCase() || p.displayName.toLowerCase() === q.toLowerCase()
    )
    if (!hasPresetExact && q.length > 0) {
      rows.push({ kind: "custom", name: q })
    }
    return rows
  }, [query, presetMatches])

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  const scheduleClose = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 160)
  }

  const cancelClose = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current)
      blurTimer.current = null
    }
  }

  const onPickRow = (row: SuggestionRow) => {
    if (row.kind === "url") {
      onOpenLinkWizard(row.url)
      setQuery("")
      setOpen(false)
      return
    }
    if (row.kind === "barcode") {
      onLookUpBarcode(row.code)
      setQuery("")
      setOpen(false)
      return
    }
    if (row.kind === "preset") {
      pickPreset(row.preset)
      return
    }
    if (row.kind === "custom") {
      addCustomName(row.name)
    }
  }

  const listboxId = `${idPrefix}-suggestions`
  const topPresets = useMemo(
    () => TOP_PRESET_IDS.map((id) => getSupplementPreset(id)).filter((p): p is SupplementPreset => Boolean(p)),
    []
  )

  const chipPresets = chipsExpanded ? SUPPLEMENT_PRESETS.slice(0, 24) : topPresets

  return (
    <div className={`what-i-take-search-bar ${className}`.trim()}>
      <div className="what-i-take-search-bar-wrap">
        <label htmlFor={`${idPrefix}-input`} className="current-supplements-editor-sr-label">
          Search supplements or paste a link
        </label>
        <input
          ref={inputRef}
          id={`${idPrefix}-input`}
          type="search"
          autoComplete="off"
          className="settings-input current-supplements-editor-search"
          placeholder="Search a supplement, or paste a link…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightIdx(0)
            setOpen(true)
          }}
          onFocus={() => {
            cancelClose()
            setOpen(true)
          }}
          onBlur={scheduleClose}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestionRows.length > 0}
          aria-controls={listboxId}
          onKeyDown={(e) => {
            if (!suggestionRows.length) {
              if (e.key === "Enter" && query.trim() && isHttpUrl(query)) {
                e.preventDefault()
                onOpenLinkWizard(query.trim())
                setQuery("")
              }
              if (e.key === "Enter" && query.trim() && looksLikeNumericBarcode(query)) {
                e.preventDefault()
                onLookUpBarcode(query.replace(/\D/g, ""))
                setQuery("")
              }
              if (e.key === "Enter" && query.trim() && presetMatches.length === 1) {
                e.preventDefault()
                pickPreset(presetMatches[0])
              }
              if (e.key === "Enter" && query.trim() && presetMatches.length === 0 && !isHttpUrl(query) && !looksLikeNumericBarcode(query)) {
                e.preventDefault()
                addCustomName(query.trim())
              }
              return
            }
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setHighlightIdx((i) => Math.min(suggestionRows.length - 1, i + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setHighlightIdx((i) => Math.max(0, i - 1))
            } else if (e.key === "Enter") {
              e.preventDefault()
              const row = suggestionRows[Math.min(highlightIdx, suggestionRows.length - 1)]
              if (row) onPickRow(row)
            } else if (e.key === "Escape") {
              setOpen(false)
              setQuery("")
            }
          }}
        />
        {open && suggestionRows.length > 0 ? (
          <ul id={listboxId} className="current-supplements-editor-suggest what-i-take-search-bar-suggest" role="listbox" aria-label="Suggestions">
            {suggestionRows.map((row, i) => {
              const hi = i === highlightIdx
              const cls = `current-supplements-editor-suggest-btn${hi ? " current-supplements-editor-suggest-btn--hi" : ""} what-i-take-search-bar-suggest-row`
              if (row.kind === "url") {
                return (
                  <li key={`url-${row.url}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={hi}
                      className={cls}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        onPickRow(row)
                      }}
                    >
                      <span className="current-supplements-editor-suggest-label">Import product from link</span>
                      <span className="current-supplements-editor-suggest-meta">Paste link wizard</span>
                    </button>
                  </li>
                )
              }
              if (row.kind === "barcode") {
                return (
                  <li key={`upc-${row.code}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={hi}
                      className={cls}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        onPickRow(row)
                      }}
                    >
                      <span className="current-supplements-editor-suggest-label">Look up UPC {row.code}</span>
                      <span className="current-supplements-editor-suggest-meta">Barcode lookup</span>
                    </button>
                  </li>
                )
              }
              if (row.kind === "custom") {
                return (
                  <li key={`custom-${row.name}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={hi}
                      className={cls}
                      onMouseEnter={() => setHighlightIdx(i)}
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        onPickRow(row)
                      }}
                    >
                      <span className="current-supplements-editor-suggest-label">Add &ldquo;{row.name}&rdquo; as custom</span>
                      <span className="current-supplements-editor-suggest-meta">Free-text row</span>
                    </button>
                  </li>
                )
              }
              const p = row.preset
              return (
                <li key={p.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={hi}
                    className={cls}
                    onMouseEnter={() => setHighlightIdx(i)}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      onPickRow(row)
                    }}
                  >
                    <span className="current-supplements-editor-suggest-label">{p.label}</span>
                    <span className="current-supplements-editor-suggest-meta">{p.category.replace(/-/g, " ")}</span>
                    {presetSelected(p.id) ? (
                      <span className="current-supplements-editor-suggest-on">Added</span>
                    ) : (
                      <span className="current-supplements-editor-suggest-add">Add</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {cabinetEmpty && !query.trim() ? (
        <div className="what-i-take-search-bar-starter" role="group" aria-label="Common supplements">
          <div className="what-i-take-search-bar-starter-chips">
            {chipPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`current-supplements-chip ${presetSelected(p.id) ? "current-supplements-chip--on" : ""}`}
                aria-pressed={presetSelected(p.id)}
                onClick={() => pickPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!chipsExpanded ? (
            <button type="button" className="what-i-take-search-bar-see-more" onClick={() => setChipsExpanded(true)}>
              See more
            </button>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .what-i-take-search-bar-wrap {
          position: relative;
          margin-bottom: 12px;
        }
        .what-i-take-search-bar-suggest {
          z-index: 50;
        }
        .what-i-take-search-bar-suggest-row {
          width: 100%;
          text-align: left;
        }
        .what-i-take-search-bar-starter {
          margin-bottom: 12px;
        }
        .what-i-take-search-bar-starter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .what-i-take-search-bar-see-more {
          margin-top: 8px;
          padding: 0;
          border: none;
          background: none;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-accent);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  )
})
