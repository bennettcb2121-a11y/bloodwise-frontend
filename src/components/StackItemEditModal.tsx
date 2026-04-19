"use client"

import React, { useEffect, useState } from "react"

type Props = {
  open: boolean
  title: string
  initialName: string
  initialDose: string
  initialUrl?: string
  onClose: () => void
  onSave: (payload: { supplementName: string; dose: string; productUrl: string }) => void | Promise<void>
}

export function StackItemEditModal({
  open,
  title,
  initialName,
  initialDose,
  initialUrl = "",
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName)
  const [dose, setDose] = useState(initialDose)
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setDose(initialDose)
    setUrl(initialUrl ?? "")
  }, [open, initialName, initialDose, initialUrl])

  if (!open) return null

  const submit = async () => {
    setSaving(true)
    try {
      await onSave({ supplementName: name.trim(), dose: dose.trim(), productUrl: url.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack-item-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="stack-item-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stack-item-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="stack-item-modal-title" className="stack-item-modal__title">
          {title}
        </h2>
        <label className="stack-item-modal__label">
          <span>Product name</span>
          <input className="stack-item-modal__input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="stack-item-modal__label">
          <span>How much do you take? (dose / frequency)</span>
          <input
            className="stack-item-modal__input"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 1 softgel with breakfast"
            autoComplete="off"
          />
        </label>
        <label className="stack-item-modal__label">
          <span>Product link (optional)</span>
          <input
            className="stack-item-modal__input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
          />
        </label>
        <div className="stack-item-modal__actions">
          <button type="button" className="stack-item-modal__btn stack-item-modal__btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="stack-item-modal__btn stack-item-modal__btn--primary" onClick={() => void submit()} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
