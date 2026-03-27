"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  SUPPLEMENT_PRESETS,
  parseCurrentSupplementsEntries,
  serializeCurrentSupplementsEntries,
  type CurrentSupplementEntry,
} from "@/src/lib/supplementMetadata"

type Props = {
  value: string
  onChange: (serialized: string) => void
  idPrefix?: string
  /** Optional class for outer wrapper */
  className?: string
}

/**
 * Chips for common supplements + custom rows with optional product URL.
 * Persists to `profile.current_supplements` as JSON for stack comparison + Amazon links.
 */
export function CurrentSupplementsEditor({ value, onChange, idPrefix = "current-supplements", className = "" }: Props) {
  const [entries, setEntries] = useState<CurrentSupplementEntry[]>(() => parseCurrentSupplementsEntries(value))
  const [customName, setCustomName] = useState("")
  const [customUrl, setCustomUrl] = useState("")

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
    const preset = SUPPLEMENT_PRESETS.find((p) => p.id === id)
    if (!preset) return
    if (presetSelected(id)) {
      pushSerialized(entries.filter((e) => e.id !== id))
    } else {
      pushSerialized([...entries.filter((e) => e.id !== id), { id: preset.id, name: preset.displayName }])
    }
  }

  const addCustom = () => {
    const name = customName.trim()
    if (!name) return
    pushSerialized([...entries, { name, productUrl: customUrl.trim() || undefined }])
    setCustomName("")
    setCustomUrl("")
  }

  const removeAt = (idx: number) => {
    pushSerialized(entries.filter((_, i) => i !== idx))
  }

  const updateUrl = (idx: number, productUrl: string) => {
    const next = entries.map((e, i) => (i === idx ? { ...e, productUrl: productUrl.trim() || undefined } : e))
    pushSerialized(next)
  }

  return (
    <div className={`current-supplements-editor ${className}`.trim()}>
      <p className="current-supplements-editor-hint">
        Select what you take today. Add a link to the exact product if you want — we use it to compare with Clarion&apos;s picks and spot upgrades.
      </p>
      <div className="current-supplements-editor-chips" role="group" aria-label="Common supplements">
        {SUPPLEMENT_PRESETS.map((p) => (
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
      <div className="current-supplements-editor-custom">
        <label htmlFor={`${idPrefix}-name`} className="current-supplements-editor-sr-label">
          Add supplement name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          className="settings-input current-supplements-editor-input"
          placeholder="Other (e.g. ashwagandha)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addCustom()
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
          placeholder="https://… (optional)"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
        />
        <button type="button" className="current-supplements-editor-add-btn" onClick={addCustom}>
          Add
        </button>
      </div>
      {entries.length > 0 && (
        <ul className="current-supplements-editor-list" aria-label="Your supplements">
          {entries.map((e, idx) => (
            <li key={`${e.id ?? e.name}-${idx}`} className="current-supplements-editor-row">
              <span className="current-supplements-editor-name">{e.name}</span>
              <input
                type="url"
                className="settings-input current-supplements-editor-url"
                placeholder="Product link (optional)"
                aria-label={`Product link for ${e.name}`}
                value={e.productUrl ?? ""}
                onChange={(ev) => updateUrl(idx, ev.target.value)}
              />
              <button type="button" className="current-supplements-editor-remove" onClick={() => removeAt(idx)} aria-label={`Remove ${e.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
