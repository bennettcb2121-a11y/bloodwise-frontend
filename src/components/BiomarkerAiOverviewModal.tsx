"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { X, Send, Sparkles } from "lucide-react"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"
import {
  BIOMARKER_OVERVIEW_USER_PROMPT,
  buildBiomarkerSnapshotForAi,
} from "@/src/lib/biomarkerAiContext"

type ChatMessage = { role: "user" | "assistant"; content: string }

export function BiomarkerAiOverviewModal({
  open,
  onClose,
  analysisResults,
  profile,
  healthScore,
  prefilledOverview,
}: {
  open: boolean
  onClose: () => void
  analysisResults: BiomarkerResult[]
  profile: ProfileRow | null
  healthScore: number
  /** Full written overview from `/api/biomarkers-overview` — required for chat context. */
  prefilledOverview: string | null
}) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loadingReply, setLoadingReply] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef("")

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setChatHistory([])
      setInput("")
      setError(null)
      return
    }
    if (analysisResults.length === 0) return
    const snapshot = buildBiomarkerSnapshotForAi(analysisResults, { healthScore, profile })
    snapshotRef.current = snapshot
    const text = prefilledOverview?.trim()
    if (text) {
      setChatHistory([{ role: "assistant", content: text }])
      setError(null)
      queueMicrotask(() => scrollToBottom())
    } else {
      setChatHistory([])
      setError("Overview isn’t loaded yet. Close and try again.")
    }
  }, [open, prefilledOverview, analysisResults, healthScore, profile, scrollToBottom])

  const sendFollowUp = useCallback(() => {
    const text = input.trim()
    if (!text || loadingReply) return
    const snapshot = snapshotRef.current
    if (!snapshot) return
    setInput("")
    setLoadingReply(true)
    setError(null)
    setChatHistory((prev) => {
      const conversationHistory: ChatMessage[] = [
        { role: "user", content: BIOMARKER_OVERVIEW_USER_PROMPT },
        ...prev,
      ]
      queueMicrotask(async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              biomarkerSnapshot: snapshot,
              conversationHistory,
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            setChatHistory((p) => [
              ...p,
              { role: "assistant", content: data?.error ?? "Something went wrong." },
            ])
            return
          }
          const reply = typeof data?.reply === "string" ? data.reply : ""
          setChatHistory((p) => [...p, { role: "assistant", content: reply || "No response." }])
          scrollToBottom()
        } catch {
          setChatHistory((p) => [
            ...p,
            { role: "assistant", content: "Unable to reach the assistant. Please try again." },
          ])
        } finally {
          setLoadingReply(false)
        }
      })
      return [...prev, { role: "user", content: text }]
    })
    scrollToBottom()
  }, [input, loadingReply, scrollToBottom])

  if (!open) return null

  return (
    <div className="biomarker-ai-modal-root" role="dialog" aria-modal="true" aria-labelledby="biomarker-ai-modal-title">
      <button type="button" className="biomarker-ai-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="biomarker-ai-modal-panel">
        <div className="biomarker-ai-modal-header">
          <div className="biomarker-ai-modal-header-text">
            <Sparkles size={20} className="biomarker-ai-modal-icon" aria-hidden />
            <div>
              <h2 id="biomarker-ai-modal-title" className="biomarker-ai-modal-title">
                Full review
              </h2>
              <p className="biomarker-ai-modal-subtitle">
                Detailed overview of your panel. Ask follow-ups below—education only, not medical advice.
              </p>
            </div>
          </div>
          <button type="button" className="biomarker-ai-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <p className="biomarker-ai-modal-disclaimer">
          For education only—not medical advice. Does not cite studies line by line. Verify important decisions with your
          clinician.
        </p>
        {error && (
          <p className="biomarker-ai-modal-error" role="alert">
            {error}
          </p>
        )}
        <div className="biomarker-ai-modal-messages" ref={listRef}>
          {chatHistory.length === 0 && !error && (
            <p className="biomarker-ai-modal-placeholder">No overview to show.</p>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} className={`biomarker-ai-modal-msg biomarker-ai-modal-msg--${m.role}`}>
              {m.content}
            </div>
          ))}
          {loadingReply && (
            <div className="biomarker-ai-modal-msg biomarker-ai-modal-msg--assistant biomarker-ai-modal-typing">
              Thinking…
            </div>
          )}
        </div>
        <div className="biomarker-ai-modal-input-row">
          <textarea
            className="biomarker-ai-modal-input"
            placeholder="Ask a follow-up question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendFollowUp()
              }
            }}
            rows={2}
            disabled={loadingReply}
          />
          <button
            type="button"
            className="biomarker-ai-modal-send"
            onClick={sendFollowUp}
            disabled={loadingReply || !input.trim()}
            aria-label="Send message"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
      <style jsx>{`
        .biomarker-ai-modal-root {
          position: fixed;
          inset: 0;
          z-index: 10050;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
          font-family: inherit;
        }
        @media (min-width: 640px) {
          .biomarker-ai-modal-root {
            align-items: center;
          }
        }
        .biomarker-ai-modal-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          margin: 0;
          padding: 0;
          background: rgba(0, 0, 0, 0.45);
          cursor: pointer;
        }
        .biomarker-ai-modal-panel {
          position: relative;
          width: 100%;
          max-width: 520px;
          max-height: min(88vh, 640px);
          display: flex;
          flex-direction: column;
          background: var(--clarion-card-bg);
          border: 1px solid var(--clarion-card-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }
        .biomarker-ai-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 18px 0 18px;
        }
        .biomarker-ai-modal-header-text {
          display: flex;
          gap: 10px;
          margin: 0;
        }
        .biomarker-ai-modal-icon {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .biomarker-ai-modal-title {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }
        .biomarker-ai-modal-subtitle {
          margin: 4px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-text-muted);
        }
        .biomarker-ai-modal-close {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 10px;
          background: var(--color-surface);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .biomarker-ai-modal-close:hover {
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
        }
        .biomarker-ai-modal-disclaimer {
          margin: 0;
          padding: 10px 18px 0;
          font-size: 11px;
          line-height: 1.45;
          color: var(--color-text-muted);
        }
        .biomarker-ai-modal-error {
          margin: 8px 18px 0;
          padding: 10px 12px;
          font-size: 13px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--color-error) 12%, transparent);
          color: var(--color-error);
        }
        .biomarker-ai-modal-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .biomarker-ai-modal-placeholder {
          margin: 0;
          font-size: 14px;
          color: var(--color-text-muted);
        }
        .biomarker-ai-modal-msg {
          font-size: 14px;
          line-height: 1.55;
          padding: 12px 14px;
          border-radius: 12px;
          white-space: pre-wrap;
        }
        .biomarker-ai-modal-msg--assistant {
          background: var(--color-accent-soft);
          color: var(--color-text-primary);
          border: 1px solid var(--color-accent-border);
        }
        .biomarker-ai-modal-msg--user {
          align-self: flex-end;
          max-width: 92%;
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        .biomarker-ai-modal-typing {
          opacity: 0.85;
          font-style: italic;
        }
        .biomarker-ai-modal-input-row {
          display: flex;
          gap: 8px;
          padding: 12px 18px 18px;
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-muted);
        }
        .biomarker-ai-modal-input {
          flex: 1;
          resize: none;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          color: var(--color-text-primary);
          background: var(--clarion-card-bg);
          min-height: 44px;
        }
        .biomarker-ai-modal-input:focus {
          outline: none;
          box-shadow: var(--ring-focus);
          border-color: var(--color-accent-border);
        }
        .biomarker-ai-modal-input:disabled {
          opacity: 0.65;
        }
        .biomarker-ai-modal-send {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: none;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .biomarker-ai-modal-send:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .biomarker-ai-modal-send:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
