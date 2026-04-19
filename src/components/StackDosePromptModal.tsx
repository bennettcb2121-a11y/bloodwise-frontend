"use client"

import React, { useState } from "react"

type Props = {
  open: boolean
  productName: string
  onSave: (dose: string) => void | Promise<void>
  onSkip: () => void
}

/** First-time prompt for how much the user takes (dose / frequency). */
export function StackDosePromptModal({ open, productName, onSave, onSkip }: Props) {
  const [dose, setDose] = useState("")
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const save = async () => {
    setBusy(true)
    try {
      await onSave(dose.trim())
      setDose("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack-item-modal-overlay stack-item-modal-overlay--dose" role="presentation">
      <div className="stack-item-modal stack-item-modal--dose" role="dialog" aria-modal="true" aria-labelledby="stack-dose-modal-title">
        <h2 id="stack-dose-modal-title" className="stack-item-modal__title">
          How much do you take?
        </h2>
        <p className="stack-item-modal__lede">
          <strong>{productName}</strong> — add your usual dose or schedule so your stack stays accurate. You can change this anytime from the ··· menu.
        </p>
        <label className="stack-item-modal__label">
          <span>Dose / frequency</span>
          <input
            className="stack-item-modal__input"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 1 capsule daily with food"
            autoComplete="off"
            autoFocus
          />
        </label>
        <div className="stack-item-modal__actions">
          <button type="button" className="stack-item-modal__btn stack-item-modal__btn--ghost" onClick={onSkip} disabled={busy}>
            Skip for now
          </button>
          <button type="button" className="stack-item-modal__btn stack-item-modal__btn--primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
