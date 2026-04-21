"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AFFILIATE_DISCLOSURE } from "@/src/lib/affiliateProducts"
import {
  SUPPLEMENT_PRESETS,
  getSupplementPreset,
  parseCurrentSupplementsEntries,
  searchSupplementPresets,
  serializeCurrentSupplementsEntries,
  type CurrentSupplementEntry,
  type SupplementPreset,
} from "@/src/lib/supplementMetadata"
import { getAmazonSearchUrl, getRecommendedAmazonUrlForPreset } from "@/src/lib/stackAffiliate"
import { StackItemActionsMenu } from "@/src/components/StackItemActionsMenu"
import { StackItemEditModal } from "@/src/components/StackItemEditModal"

type Props = {
  value: string
  onChange: (serialized: string) => void
  idPrefix?: string
  /** Optional class for outer wrapper */
  className?: string
  /** Hide the catalog intro when the parent surface already explains context (e.g. capture modal). */
  hideIntro?: boolean
  /** Empty-state line for capture modal — search shortcuts + chips. */
  showCaptureEmptyHint?: boolean
  /** List + paste + custom only (search/chips/Amazon live in the capture modal). */
  variant?: "full" | "cabinet"
}

function genClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

async function resolveProductFromUrl(url: string, hintName: string): Promise<{ displayName: string; marker?: string | null } | null> {
  const res = await fetch("/api/resolve-product-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim(), hintName: hintName.trim() }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { displayName?: string; marker?: string | null }
  if (typeof data.displayName !== "string" || !data.displayName.trim()) return null
  return { displayName: data.displayName.trim(), marker: data.marker ?? null }
}

/**
 * Chips for common supplements + custom rows with optional product URL.
 * Persists to `profile.current_supplements` as JSON for stack comparison + Amazon links.
 * When a product URL is provided, we resolve a clearer product title via AI.
 */
const SUGGEST_LIMIT = 8

/** Presets surfaced as one-click Amazon searches (tagged). SiteStripe picks up on the product page. */
const AMAZON_QUICK_PRESETS = SUPPLEMENT_PRESETS

export function CurrentSupplementsEditor({
  value,
  onChange,
  idPrefix = "current-supplements",
  className = "",
  hideIntro = false,
  showCaptureEmptyHint = false,
  variant = "full",
}: Props) {
  const isCabinet = variant === "cabinet"
  const [entries, setEntries] = useState<CurrentSupplementEntry[]>(() => parseCurrentSupplementsEntries(value))
  const [presetSearch, setPresetSearch] = useState("")
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [customName, setCustomName] = useState("")
  const [customDose, setCustomDose] = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [addBusy, setAddBusy] = useState(false)
  const [resolveIdx, setResolveIdx] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [amazonQuery, setAmazonQuery] = useState("")

  const filteredPresets = useMemo(() => searchSupplementPresets(presetSearch, 40), [presetSearch])
  const suggestions = useMemo(() => {
    const q = presetSearch.trim()
    if (!q) return []
    return searchSupplementPresets(q, SUGGEST_LIMIT)
  }, [presetSearch])

  useEffect(() => {
    setHighlightIdx(0)
  }, [presetSearch])

  useEffect(() => {
    setEntries(parseCurrentSupplementsEntries(value))
  }, [value])

  const pushSerialized = useCallback(
    (next: CurrentSupplementEntry[]) => {
      setEntries(next)
      onChange(serializeCurrentSupplementsEntries(next))
    },
    [onChange]
  )

  const presetSelected = (id: string) => entries.some((e) => e.id === id)

  const togglePreset = (id: string) => {
    const byId = getSupplementPreset(id)
    if (!byId) return
    if (presetSelected(id)) {
      pushSerialized(entries.filter((e) => e.id !== id))
    } else {
      pushSerialized([...entries.filter((e) => e.id !== id), { id: byId.id, name: byId.displayName, clientId: genClientId() }])
    }
  }

  const pickSuggestion = (preset: SupplementPreset) => {
    if (presetSelected(preset.id)) {
      pushSerialized(entries.filter((e) => e.id !== preset.id))
    } else {
      pushSerialized([
        ...entries.filter((e) => e.id !== preset.id),
        { id: preset.id, name: preset.displayName, clientId: genClientId() },
      ])
    }
    setPresetSearch("")
    setSuggestOpen(false)
  }

  const openSuggest = () => {
    if (blurCloseTimer.current) {
      clearTimeout(blurCloseTimer.current)
      blurCloseTimer.current = null
    }
    setSuggestOpen(true)
  }

  const scheduleCloseSuggest = () => {
    blurCloseTimer.current = setTimeout(() => setSuggestOpen(false), 160)
  }

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current)
    }
  }, [])

  const addCustom = async () => {
    const name = customName.trim()
    if (!name) return
    const url = customUrl.trim()
    const dose = customDose.trim()
    const clientId = genClientId()
    setAddBusy(true)
    try {
      let displayName = name
      if (url && /^https?:\/\//i.test(url)) {
        const resolved = await resolveProductFromUrl(url, name)
        if (resolved) displayName = resolved.displayName
      }
      pushSerialized([
        ...entries,
        {
          name: displayName,
          productUrl: url || undefined,
          dose: dose || undefined,
          clientId,
        },
      ])
      setCustomName("")
      setCustomDose("")
      setCustomUrl("")
    } finally {
      setAddBusy(false)
    }
  }

  /**
   * "Paste your list" — quick capture for desktop. Each non-empty line becomes one entry.
   * Accepted shapes (matched leniently, all pieces optional except name):
   *   - "4000 IU vitamin D3 gummies — morning"
   *   - "Magnesium glycinate, 4 caps at night"
   *   - "Ferrous sulfate liquid iron (1 tbsp)"
   * We split on dashes/colons/parentheses to lift a dose/timing phrase into the dose field
   * so it shows up in Today and on the supply rows without the user having to edit each one.
   */
  const addPasteList = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return
    const additions: CurrentSupplementEntry[] = lines.map((raw) => {
      // Pull "(stuff)" at the end as dose, or split on ' — ' / ' - ' / ':' / ','.
      let name = raw
      let dose: string | undefined
      const paren = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      if (paren) {
        name = paren[1].trim()
        dose = paren[2].trim()
      } else {
        const m = raw.match(/^(.*?)(?:\s+[—–-]\s+|\s*:\s+|,\s+)(.+)$/)
        if (m) {
          name = m[1].trim()
          dose = m[2].trim()
        }
      }
      return { name: name || raw, dose: dose || undefined, clientId: genClientId() }
    })
    pushSerialized([...entries, ...additions])
    setPasteText("")
    setPasteOpen(false)
  }

  const removeAt = (idx: number) => {
    pushSerialized(entries.filter((_, i) => i !== idx))
  }

  const updateUrl = (idx: number, productUrl: string) => {
    const next = entries.map((e, i) => (i === idx ? { ...e, productUrl: productUrl.trim() || undefined } : e))
    pushSerialized(next)
  }

  const resolveRowUrl = async (idx: number) => {
    const e = entries[idx]
    const url = e?.productUrl?.trim()
    if (!url || !/^https?:\/\//i.test(url)) return
    setResolveIdx(idx)
    try {
      const resolved = await resolveProductFromUrl(url, e.name)
      if (!resolved) return
      const next = entries.map((row, i) => (i === idx ? { ...row, name: resolved.displayName } : row))
      pushSerialized(next)
    } finally {
      setResolveIdx(null)
    }
  }

  const openEdit = (idx: number) => {
    setEditIdx(idx)
    setEditOpen(true)
  }

  const saveEdit = (payload: { supplementName: string; dose: string; productUrl: string }) => {
    if (editIdx == null) return
    const next = entries.map((e, i) =>
      i === editIdx
        ? {
            ...e,
            name: payload.supplementName,
            ...(payload.dose.trim() ? { dose: payload.dose.trim() } : { dose: undefined }),
            productUrl: payload.productUrl.trim() || undefined,
          }
        : e
    )
    pushSerialized(next)
    setEditOpen(false)
    setEditIdx(null)
  }

  const editingEntry = editIdx != null ? entries[editIdx] : null

  const listboxId = `${idPrefix}-preset-suggestions`
  const noPresetMatches = presetSearch.trim().length > 0 && filteredPresets.length === 0

  return (
    <div className={`current-supplements-editor ${className}`.trim()}>
      {!isCabinet && !hideIntro ? (
        <p className="current-supplements-editor-hint">
          Search our catalog to add, paste a product link on a row to tidy the name, or use custom add below — SiteStripe on Amazon works for bottles we don&apos;t curate yet.
        </p>
      ) : null}
      {!isCabinet ? (
      <div className="current-supplements-editor-search-wrap">
        <label htmlFor={`${idPrefix}-search`} className="current-supplements-editor-sr-label">
          Search supplements
        </label>
        <input
          id={`${idPrefix}-search`}
          type="search"
          autoComplete="off"
          className="settings-input current-supplements-editor-search"
          placeholder="Search a supplement, or paste a link…"
          value={presetSearch}
          onChange={(e) => {
            setPresetSearch(e.target.value)
            openSuggest()
          }}
          onFocus={openSuggest}
          onBlur={scheduleCloseSuggest}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestOpen && suggestions.length > 0}
          aria-controls={listboxId}
          onKeyDown={(e) => {
            if (!suggestions.length) {
              if (e.key === "Enter" && presetSearch.trim()) {
                if (filteredPresets.length === 1) {
                  e.preventDefault()
                  pickSuggestion(filteredPresets[0])
                } else if (noPresetMatches) {
                  e.preventDefault()
                  setCustomName(presetSearch.trim())
                  setPresetSearch("")
                }
              }
              return
            }
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setHighlightIdx((i) => Math.min(suggestions.length - 1, i + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setHighlightIdx((i) => Math.max(0, i - 1))
            } else if (e.key === "Enter") {
              e.preventDefault()
              const p = suggestions[Math.min(highlightIdx, suggestions.length - 1)]
              if (p) pickSuggestion(p)
            } else if (e.key === "Escape") {
              setSuggestOpen(false)
              setPresetSearch("")
            }
          }}
        />
        {suggestOpen && suggestions.length > 0 ? (
          <ul id={listboxId} className="current-supplements-editor-suggest" role="listbox" aria-label="Matching supplements">
            {suggestions.map((p, i) => (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlightIdx}
                  className={`current-supplements-editor-suggest-btn${i === highlightIdx ? " current-supplements-editor-suggest-btn--hi" : ""}`}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onMouseDown={(ev) => {
                    ev.preventDefault()
                    pickSuggestion(p)
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
            ))}
          </ul>
        ) : null}
      </div>
      ) : null}
      {!isCabinet && showCaptureEmptyHint && entries.length === 0 && !presetSearch.trim() ? (
        <p className="current-supplements-editor-capture-empty">
          Not sure where to start? Snap a bottle, scan a barcode, or tap one of your common ones below.
        </p>
      ) : null}
      {!isCabinet && noPresetMatches ? (
        <p className="current-supplements-editor-nomatch">
          No match in our catalog for &ldquo;{presetSearch.trim()}&rdquo; — add it as a custom name below, or clear search to see all presets.
        </p>
      ) : null}
      {!isCabinet ? (
      <div className="current-supplements-editor-chips" role="group" aria-label="Supplement presets">
        {filteredPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`current-supplements-chip ${presetSelected(p.id) ? "current-supplements-chip--on" : ""}`}
            aria-pressed={presetSelected(p.id)}
            onClick={() => togglePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      ) : null}
      {!isCabinet ? (
      <div className="current-supplements-editor-amazon current-supplements-editor-amazon--sitestripe">
        <div className="current-supplements-editor-amazon-head">
          <span className="current-supplements-editor-amazon-title">Amazon (SiteStripe)</span>
        </div>
        <p className="current-supplements-editor-amazon-sitestripe-hint">
          Curated chips go straight to a recommended bottle; the rest open search. Your Associates tag is included. Use <strong>SiteStripe</strong> on Amazon to copy a link, then paste it into <strong>Product link</strong> below.
        </p>
        <div className="current-supplements-editor-amazon-quick" role="group" aria-label="Quick Amazon picks and searches">
          {AMAZON_QUICK_PRESETS.map((p) => (
            <a
              key={p.id}
              href={getRecommendedAmazonUrlForPreset(p)}
              target="_blank"
              rel="noreferrer noopener"
              className="current-supplements-editor-amazon-quick-link"
              title="Opens Amazon (curated product or search)"
            >
              {p.label}
            </a>
          ))}
        </div>
        <div className="current-supplements-editor-amazon-search-row">
          <label htmlFor={`${idPrefix}-amazon-q`} className="current-supplements-editor-sr-label">
            Custom Amazon search
          </label>
          <input
            id={`${idPrefix}-amazon-q`}
            type="search"
            autoComplete="off"
            className="settings-input current-supplements-editor-amazon-search-input"
            placeholder="e.g. magnesium glycinate capsules"
            value={amazonQuery}
            onChange={(e) => setAmazonQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const q = amazonQuery.trim() || "Supplement"
                window.open(getAmazonSearchUrl(q), "_blank", "noopener,noreferrer")
              }
            }}
          />
          <button
            type="button"
            className="current-supplements-editor-amazon-search-btn"
            onClick={() => {
              const q = amazonQuery.trim() || "Supplement"
              window.open(getAmazonSearchUrl(q), "_blank", "noopener,noreferrer")
            }}
          >
            Search Amazon
          </button>
        </div>
        <p className="current-supplements-editor-amazon-disclosure">{AFFILIATE_DISCLOSURE}</p>
      </div>
      ) : null}
      <div className="current-supplements-editor-custom">
        <label htmlFor={`${idPrefix}-name`} className="current-supplements-editor-sr-label">
          Add supplement name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          className="settings-input current-supplements-editor-input"
          placeholder="Name (e.g. Vitamin D3 gummies)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void addCustom()
            }
          }}
        />
        <label htmlFor={`${idPrefix}-dose`} className="current-supplements-editor-sr-label">
          Dose / timing (optional)
        </label>
        <input
          id={`${idPrefix}-dose`}
          type="text"
          className="settings-input current-supplements-editor-input"
          placeholder="Dose / timing (e.g. 4000 IU, morning)"
          value={customDose}
          onChange={(e) => setCustomDose(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void addCustom()
            }
          }}
        />
        <label htmlFor={`${idPrefix}-url`} className="current-supplements-editor-sr-label">
          Product link (optional)
        </label>
        <input
          id={`${idPrefix}-url`}
          type="url"
          className="settings-input current-supplements-editor-input"
          placeholder="Product link — https://… (optional)"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
        />
        <button type="button" className="current-supplements-editor-add-btn" onClick={() => void addCustom()} disabled={addBusy || !customName.trim()}>
          {addBusy ? "Adding…" : "Add"}
        </button>
      </div>
      <div className="current-supplements-editor-paste">
        {!pasteOpen ? (
          <button
            type="button"
            className="current-supplements-editor-paste-toggle"
            onClick={() => setPasteOpen(true)}
          >
            Have a list? Paste it once — we&apos;ll split it into rows.
          </button>
        ) : (
          <div className="current-supplements-editor-paste-box">
            <label htmlFor={`${idPrefix}-paste`} className="current-supplements-editor-sr-label">
              Paste your list
            </label>
            <textarea
              id={`${idPrefix}-paste`}
              className="settings-input current-supplements-editor-paste-area"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"One per line — we read the bit after —, (), : or , as dose / timing.\n4000 IU vitamin D3 gummies — morning\nMagnesium glycinate, 4 caps at night\n500 mg vitamin C — with iron\nFerrous sulfate liquid iron (1 tbsp)"}
            />
            <div className="current-supplements-editor-paste-row">
              <button
                type="button"
                className="current-supplements-editor-add-btn"
                onClick={addPasteList}
                disabled={!pasteText.trim()}
              >
                Add all
              </button>
              <button
                type="button"
                className="current-supplements-editor-paste-cancel"
                onClick={() => {
                  setPasteOpen(false)
                  setPasteText("")
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {entries.length > 0 && (
        <ul className="current-supplements-editor-list" aria-label="Your supplements">
          {entries.map((e, idx) => (
            <li key={`${e.clientId ?? e.id ?? e.name}-${idx}`} className="current-supplements-editor-row">
              <span className="current-supplements-editor-name">
                {e.name}
                {e.dose ? (
                  <span className="current-supplements-editor-row-dose"> · {e.dose}</span>
                ) : null}
              </span>
              <input
                type="url"
                className="settings-input current-supplements-editor-url"
                placeholder="Product link (optional)"
                aria-label={`Product link for ${e.name}`}
                value={e.productUrl ?? ""}
                onChange={(ev) => updateUrl(idx, ev.target.value)}
              />
              {e.productUrl?.trim() && /^https?:\/\//i.test(e.productUrl.trim()) ? (
                <button
                  type="button"
                  className="current-supplements-editor-resolve-btn"
                  onClick={() => void resolveRowUrl(idx)}
                  disabled={resolveIdx === idx}
                >
                  {resolveIdx === idx ? "…" : "Guess name from link"}
                </button>
              ) : null}
              <StackItemActionsMenu
                compact
                ariaLabel={`Actions for ${e.name}`}
                onEdit={() => openEdit(idx)}
                onDelete={() => removeAt(idx)}
              />
            </li>
          ))}
        </ul>
      )}
      <StackItemEditModal
        open={editOpen && editingEntry != null}
        title="Update supplement"
        initialName={editingEntry?.name ?? ""}
        initialDose={editingEntry?.dose ?? ""}
        initialUrl={editingEntry?.productUrl ?? ""}
        onClose={() => {
          setEditOpen(false)
          setEditIdx(null)
        }}
        onSave={saveEdit}
      />
    </div>
  )
}
