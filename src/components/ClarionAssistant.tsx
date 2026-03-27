"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { MessageCircle, X, Send } from "lucide-react"

type ChatMessage = { role: "user" | "assistant"; content: string }

export const CLARION_OPEN_ASSISTANT_EVENT = "clarion-open-assistant"

export function ClarionAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(CLARION_OPEN_ASSISTANT_EVENT, handler)
    return () => window.removeEventListener(CLARION_OPEN_ASSISTANT_EVENT, handler)
  }, [])

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)
    scrollToBottom()
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data?.error ?? "Something went wrong. Please try again." }])
        return
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }])
      scrollToBottom()
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Unable to reach the assistant. Please try again." }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, scrollToBottom])

  return (
    <>
      <button
        type="button"
        className="clarion-assistant-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Ask Clarion"}
      >
        {open ? <X size={24} strokeWidth={2} /> : <MessageCircle size={24} strokeWidth={2} />}
      </button>
      {open && (
        <div className="clarion-assistant-panel">
          <div className="clarion-assistant-header">
            <h2 className="clarion-assistant-title">Ask Clarion</h2>
            <p className="clarion-assistant-disclaimer">
              For education only—not medical advice. This chat does not cite studies or guidelines line by line; do not treat replies as a literature review. Answers may be incomplete or wrong for your situation—verify with your clinician.
            </p>
          </div>
          <div className="clarion-assistant-messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="clarion-assistant-placeholder">Ask a question about your biomarkers or wellness. I’ll explain in plain language and suggest when to talk to your doctor.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`clarion-assistant-msg clarion-assistant-msg--${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="clarion-assistant-msg clarion-assistant-msg--assistant clarion-assistant-typing">Thinking…</div>}
          </div>
          <div className="clarion-assistant-input-wrap">
            <textarea
              className="clarion-assistant-input"
              placeholder="Type your question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={2}
              disabled={loading}
            />
            <button type="button" className="clarion-assistant-send" onClick={send} disabled={loading || !input.trim()}>
              <Send size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        .clarion-assistant-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9998;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #1F6F5B;
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clarion-assistant-fab:hover {
          background: #2A8C72;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
        }
        [data-theme="light"] .clarion-assistant-fab {
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 4px 16px rgba(31, 111, 91, 0.35);
        }
        [data-theme="light"] .clarion-assistant-fab:hover {
          box-shadow: 0 6px 20px rgba(31, 111, 91, 0.45);
        }
        .clarion-assistant-panel {
          position: fixed;
          bottom: 90px;
          right: 24px;
          z-index: 9997;
          width: 360px;
          max-width: calc(100vw - 48px);
          max-height: 480px;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-muted);
          border: 1px solid var(--color-border-strong);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        [data-theme="light"] .clarion-assistant-panel {
          background: var(--color-surface-elevated);
          border-color: var(--color-border-strong);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        .clarion-assistant-header {
          padding: 16px;
          border-bottom: 1px solid var(--clarion-card-border);
        }
        .clarion-assistant-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .clarion-assistant-disclaimer {
          margin: 0;
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .clarion-assistant-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          min-height: 160px;
          max-height: 320px;
        }
        .clarion-assistant-placeholder {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.5;
        }
        .clarion-assistant-msg {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
        }
        .clarion-assistant-msg--user {
          background: var(--color-accent-soft);
          border: 1px solid rgba(31, 111, 91, 0.35);
          color: var(--color-text-primary);
          margin-left: 24px;
        }
        .clarion-assistant-msg--assistant {
          background: var(--color-surface-elevated);
          color: var(--color-text-secondary);
          margin-right: 24px;
        }
        .clarion-assistant-typing { color: var(--color-text-muted); }
        .clarion-assistant-input-wrap {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid var(--clarion-card-border);
        }
        .clarion-assistant-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--clarion-card-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 14px;
          resize: none;
          font-family: inherit;
        }
        .clarion-assistant-input::placeholder { color: var(--color-text-muted); }
        .clarion-assistant-send {
          align-self: flex-end;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--color-accent);
          color: var(--color-accent-contrast);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clarion-assistant-send:hover:not(:disabled) {
          background: var(--color-accent-hover);
        }
        .clarion-assistant-send:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}
