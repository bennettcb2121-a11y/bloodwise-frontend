"use client"

import React, { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"

type Props = {
  ariaLabel: string
  onEdit: () => void
  onDelete: () => void
  /** Smaller hit target for dense protocol rows */
  compact?: boolean
}

export function StackItemActionsMenu({ ariaLabel, onEdit, onDelete, compact }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  return (
    <div className={`stack-item-actions${compact ? " stack-item-actions--compact" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="stack-item-actions__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical size={compact ? 16 : 18} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <ul className="stack-item-actions__menu" role="menu">
          <li role="none">
            <button type="button" className="stack-item-actions__item" role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
              Update details
            </button>
          </li>
          <li role="none">
            <button type="button" className="stack-item-actions__item stack-item-actions__item--danger" role="menuitem" onClick={() => { setOpen(false); onDelete() }}>
              Remove from stack
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
