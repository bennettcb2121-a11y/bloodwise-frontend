"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { HelpCircle, X, Send } from "lucide-react"

type ChatMessage = { role: "user" | "assistant"; content: string }

export const CLARION_OPEN_SUPPORT_EVENT = "clarion-open-support"

export function SupportAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener(CLARION_OPEN_SUPPORT_EVENT, handler)
    return () => window.removeEventListener(CLARION_OPEN_SUPPORT_EVENT, handler)
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
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error ?? "Something went wrong. Please try again or visit /faq." },
        ])
        return
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply ?? "" }])
      scrollToBottom()
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to reach support chat. Try again or open clarionlabs.com/faq." },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, scrollToBottom])

  return (
    <>
      <button
        type="button"
        className="clarion-support-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Help and FAQ"}
      >
        {open ? <X size={22} strokeWidth={2} /> : <HelpCircle size={22} strokeWidth={2} />}
      </button>
      {open && (
        <div className="clarion-support-panel">
          <div className="clarion-support-header">
            <h2 className="clarion-support-title">Help</h2>
            <p className="clarion-support-disclaimer">
              Account, billing, and how to use Clarion—not medical advice. For health questions about results, use{" "}
              <strong>Ask Clarion</strong> (right).
            </p>
          </div>
          <div className="clarion-support-messages" ref={listRef}>
            {messages.length === 0 && (
              <p className="clarion-support-placeholder">
                Ask about login, billing, or where to find features—or open the{" "}
                <a href="/faq" className="clarion-support-inline-link">
                  FAQ
                </a>
                .
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`clarion-support-msg clarion-support-msg--${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="clarion-support-msg clarion-support-msg--assistant clarion-support-typing">…</div>}
          </div>
          <div className="clarion-support-input-wrap">
            <textarea
              className="clarion-support-input"
              placeholder="How can we help?"
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
            <button type="button" className="clarion-support-send" onClick={send} disabled={loading || !input.trim()}>
              <Send size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        .clarion-support-fab {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9998;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--color-surface-elevated);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-strong);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clarion-support-fab:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .clarion-support-panel {
          position: fixed;
          bottom: 86px;
          left: 24px;
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
        [data-theme="light"] .clarion-support-panel {
          background: var(--color-surface-elevated);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
        .clarion-support-header {
          padding: 16px;
          border-bottom: 1px solid var(--clarion-card-border);
        }
        .clarion-support-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .clarion-support-disclaimer {
          margin: 0;
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.45;
        }
        .clarion-support-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          min-height: 140px;
          max-height: 300px;
        }
        .clarion-support-placeholder {
          margin: 0;
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.5;
        }
        .clarion-support-inline-link {
          color: var(--color-accent);
          font-weight: 600;
          text-decoration: none;
        }
        .clarion-support-inline-link:hover {
          text-decoration: underline;
        }
        .clarion-support-msg {
          margin-bottom: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .clarion-support-msg--user {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          margin-left: 20px;
        }
        .clarion-support-msg--assistant {
          background: var(--color-surface-elevated);
          color: var(--color-text-secondary);
          margin-right: 20px;
        }
        .clarion-support-typing {
          color: var(--color-text-muted);
        }
        .clarion-support-input-wrap {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid var(--clarion-card-border);
        }
        .clarion-support-input {
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
        .clarion-support-input::placeholder {
          color: var(--color-text-muted);
        }
        .clarion-support-send {
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
        .clarion-support-send:hover:not(:disabled) {
          background: var(--color-accent-hover);
        }
        .clarion-support-send:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}
