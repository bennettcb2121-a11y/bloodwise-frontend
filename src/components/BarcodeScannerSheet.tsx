"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { X, Flashlight } from "lucide-react"
import { BarcodeProductConfirmCard } from "@/src/components/BarcodeProductConfirmCard"
import { isHttpUrl, resolveBarcodeWithCache, type ResolvedBarcodeProduct } from "@/src/lib/barcodeScan"
import { mergeSupplementEntriesIntoSerialized, type CurrentSupplementEntry } from "@/src/lib/supplementMetadata"
import type { StackProductFit, StackProductFitChipTone } from "@/src/lib/stackProductFit"
import type { Result } from "@zxing/library"

/** Prefer a stream we can still read from (iOS can lag before tracks report "live"). */
function streamForBarcodeScan(...candidates: Array<MediaStream | null | undefined>): MediaStream | null {
  for (const s of candidates) {
    if (!s) continue
    const tracks = s.getVideoTracks()
    if (tracks.length === 0) continue
    if (tracks.some((t) => t.readyState === "live")) return s
    if (tracks.some((t) => t.readyState !== "ended")) return s
  }
  return null
}

type Props = {
  open: boolean
  onClose: () => void
  currentSupplements: string
  onChangeSupplements: (serialized: string) => void
  /**
   * Stream from a direct user tap (e.g. parent "Scan barcode"). iOS Safari only reliably opens the
   * camera when getUserMedia runs in that gesture — not after dynamic import in useEffect.
   */
  primedVideoStream?: MediaStream | null
  /** QR decoded to a URL — open paste-link wizard. */
  onQrProductLink?: (url: string) => void
  /** Prefill / jump straight to lookup (e.g. from unified search). */
  initialTypedCode?: string
}

export function BarcodeScannerSheet({
  open,
  onClose,
  currentSupplements,
  onChangeSupplements,
  primedVideoStream = null,
  onQrProductLink,
  initialTypedCode,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerControlsRef = useRef<{ stop: () => void } | null>(null)
  const [manualCode, setManualCode] = useState("")
  const [camError, setCamError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [phase, setPhase] = useState<"scan" | "confirm">("scan")
  const [resolved, setResolved] = useState<ResolvedBarcodeProduct | null>(null)
  const [fitLoading, setFitLoading] = useState(false)
  const [fit, setFit] = useState<StackProductFit | null>(null)
  const [fitChipLabel, setFitChipLabel] = useState("")
  const [fitChipTone, setFitChipTone] = useState<StackProductFitChipTone>("unmapped")
  const [rationale, setRationale] = useState("")
  const [scanSessionKey, setScanSessionKey] = useState(0)
  /** Fresh stream when user taps "Scan again" (another user gesture). */
  const [rescanPrimedStream, setRescanPrimedStream] = useState<MediaStream | null>(null)
  /**
   * Lifecycle of the preview: idle → starting → playing, or → stalled if iOS didn't paint frames
   * within a couple of seconds. "stalled" surfaces a "Tap to start camera" button that runs
   * getUserMedia inside a fresh user gesture — this is the reliable recovery on iOS Safari.
   */
  const [videoStatus, setVideoStatus] = useState<"idle" | "starting" | "playing" | "stalled">("idle")

  const stopReader = useCallback(() => {
    try {
      readerControlsRef.current?.stop()
    } catch {
      /* ignore */
    }
    readerControlsRef.current = null
    const v = videoRef.current
    if (v?.srcObject) {
      const stream = v.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      v.srcObject = null
    }
  }, [])

  const reset = useCallback(() => {
    stopReader()
    setPhase("scan")
    setResolved(null)
    setFit(null)
    setFitChipLabel("")
    setFitChipTone("unmapped")
    setRationale("")
    setManualCode("")
    setCamError(null)
    setTorchOn(false)
    setVideoStatus("idle")
    setRescanPrimedStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    setScanSessionKey((k) => k + 1)
  }, [stopReader])

  const handleClose = () => {
    reset()
    onClose()
  }

  const backToLiveScan = useCallback(() => {
    stopReader()
    setPhase("scan")
    setResolved(null)
    setFit(null)
    setFitChipLabel("")
    setFitChipTone("unmapped")
    setRationale("")
    setCamError(null)
    setTorchOn(false)
    setVideoStatus("idle")
    void (async () => {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
      } catch {
        /* effect may fall back to decodeFromVideoDevice */
      }
      setRescanPrimedStream(stream)
      setScanSessionKey((k) => k + 1)
    })()
  }, [stopReader])

  /**
   * "Tap to start camera" fallback. Used when the primed stream didn't paint frames (iOS quirk)
   * so the user-gesture context is fresh and reliable. Runs entirely synchronously from the tap:
   * getUserMedia → srcObject → play(), no awaits before getUserMedia.
   */
  const manualStartCamera = useCallback(() => {
    stopReader()
    setCamError(null)
    setVideoStatus("starting")
    // Don't await getUserMedia on a previously-primed stream — drop it first so iOS treats this
    // as a totally fresh request inside the current user gesture.
    setRescanPrimedStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        setRescanPrimedStream(stream)
        setScanSessionKey((k) => k + 1)
      })
      .catch(() => {
        setCamError("Let Clarion use your camera in Settings, or type the UPC manually below.")
        setVideoStatus("stalled")
      })
  }, [stopReader])

  const runResolveAndFit = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      if (isHttpUrl(text)) {
        stopReader()
        onQrProductLink?.(text)
        onClose()
        return
      }
      stopReader()
      const r = await resolveBarcodeWithCache(text)
      setResolved(r)
      setPhase("confirm")
      if (!r.name.trim()) {
        return
      }
      setFitLoading(true)
      setFit(null)
      try {
        const res = await fetch("/api/stack-product-fit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            supplementName: r.name,
            marker: null,
            dose: "",
          }),
        })
        const data = (await res.json()) as {
          fit?: StackProductFit
          rationale?: string
          chipLabel?: string
          chipTone?: StackProductFitChipTone
        }
        if (res.ok) {
          const f = data.fit ?? "unknown"
          setFit(f)
          setRationale(data.rationale ?? "")
          setFitChipLabel(data.chipLabel ?? "")
          setFitChipTone(
            data.chipTone ?? (f === "aligned" ? "aligned" : f === "suboptimal" ? "suboptimal" : "unmapped")
          )
        }
      } catch {
        /* unsigned or network — still allow add */
      } finally {
        setFitLoading(false)
      }
    },
    [onQrProductLink, onClose, stopReader]
  )

  const runResolveRef = useRef(runResolveAndFit)
  runResolveRef.current = runResolveAndFit

  const onDecodeText = useCallback((text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20)
    } catch {
      /* ignore */
    }
    void runResolveRef.current(text)
  }, [])

  useEffect(() => {
    if (!open || !initialTypedCode?.trim()) return
    const digits = initialTypedCode.replace(/\D/g, "")
    if (digits.length < 8) return
    setManualCode(initialTypedCode.trim())
    void runResolveRef.current(initialTypedCode)
  }, [open, initialTypedCode])

  useEffect(() => {
    if (!open) {
      stopReader()
      setPhase("scan")
      setResolved(null)
      setFit(null)
      setFitChipLabel("")
      setFitChipTone("unmapped")
      setRationale("")
      setCamError(null)
      setTorchOn(false)
      setTorchSupported(false)
      setVideoStatus("idle")
      setRescanPrimedStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop())
        return null
      })
      return
    }

    if ((initialTypedCode?.replace(/\D/g, "").length ?? 0) >= 8) {
      return
    }

    let cancelled = false
    const streamFromTap = streamForBarcodeScan(rescanPrimedStream, primedVideoStream)
    let stalledTimer: ReturnType<typeof setTimeout> | null = null
    let playRetryTimer: ReturnType<typeof setTimeout> | null = null

    const clearTimers = () => {
      if (stalledTimer) {
        clearTimeout(stalledTimer)
        stalledTimer = null
      }
      if (playRetryTimer) {
        clearTimeout(playRetryTimer)
        playRetryTimer = null
      }
    }

    const armStalledTimer = () => {
      if (stalledTimer) clearTimeout(stalledTimer)
      // If the video hasn't started painting frames within this window, offer the manual fallback.
      stalledTimer = setTimeout(() => {
        if (cancelled) return
        setVideoStatus((prev) => (prev === "playing" ? prev : "stalled"))
      }, 2500)
    }

    const tryPlayWithRetry = (video: HTMLVideoElement, attempt = 0) => {
      if (cancelled) return
      video.play().then(
        () => {
          /* onplaying handler will set status */
        },
        () => {
          if (cancelled) return
          if (attempt < 3) {
            playRetryTimer = setTimeout(() => tryPlayWithRetry(video, attempt + 1), 250)
          }
        }
      )
    }

    const start = async () => {
      setCamError(null)
      setPhase("scan")
      setVideoStatus("starting")
      try {
        let video = videoRef.current
        if (!video || cancelled) return
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        if (cancelled) return
        video = videoRef.current
        if (!video || cancelled) return

        // Frame-level ready signal. iOS fires 'playing' once the first real frame is decoded;
        // 'loadedmetadata' fires earlier, before rendering. We trust 'playing' for the UI.
        const markPlaying = () => {
          if (cancelled) return
          setVideoStatus("playing")
          if (stalledTimer) {
            clearTimeout(stalledTimer)
            stalledTimer = null
          }
        }
        video.onplaying = markPlaying
        video.onloadedmetadata = () => {
          if (cancelled || !video) return
          tryPlayWithRetry(video)
        }
        video.onerror = () => {
          if (cancelled) return
          setVideoStatus("stalled")
        }

        if (streamFromTap) {
          video.srcObject = streamFromTap
          video.muted = true
          video.setAttribute("playsinline", "true")
          video.setAttribute("webkit-playsinline", "true")
          tryPlayWithRetry(video)
        }

        armStalledTimer()

        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ])
        if (cancelled) return
        const hints = new Map<number, unknown>()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints)

        const onResult = (result: Result | undefined, _err: unknown, controls: { stop: () => void }) => {
          if (cancelled) return
          if (result) {
            const t = result.getText()?.trim()
            if (t) {
              try {
                controls.stop()
              } catch {
                /* ignore */
              }
              readerControlsRef.current = null
              onDecodeText(t)
            }
          }
        }

        const ctrls = streamFromTap
          ? await reader.decodeFromVideoElement(video, onResult)
          : await reader.decodeFromVideoDevice(undefined, video, onResult)
        if (cancelled) {
          try {
            ctrls.stop()
          } catch {
            /* ignore */
          }
          return
        }
        readerControlsRef.current = ctrls

        const stream = video.srcObject as MediaStream | null
        const track = stream?.getVideoTracks()?.[0]
        const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined
        setTorchSupported(Boolean(caps?.torch))
      } catch {
        if (!cancelled) {
          setVideoStatus("stalled")
          setCamError("Let Clarion use your camera in Settings, or type the UPC manually below.")
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      clearTimers()
      const v = videoRef.current
      if (v) {
        v.onplaying = null
        v.onloadedmetadata = null
        v.onerror = null
      }
      stopReader()
    }
  }, [open, initialTypedCode, primedVideoStream, rescanPrimedStream, onDecodeText, stopReader, scanSessionKey])

  const toggleTorch = async () => {
    const video = videoRef.current
    const stream = video?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()?.[0]
    if (!track?.applyConstraints) return
    try {
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      /* ignore */
    }
  }

  const addResolved = () => {
    if (!resolved?.name.trim()) return
    const entry: CurrentSupplementEntry = {
      name: resolved.name.trim(),
      ...(fit ? { fitStatus: fit } : {}),
    }
    onChangeSupplements(mergeSupplementEntriesIntoSerialized(currentSupplements, [entry]))
    handleClose()
  }

  const editInstead = () => {
    if (!resolved?.name.trim()) {
      handleClose()
      return
    }
    const entry: CurrentSupplementEntry = { name: resolved.name.trim() }
    onChangeSupplements(mergeSupplementEntriesIntoSerialized(currentSupplements, [entry]))
    handleClose()
  }

  if (!open) return null

  return (
    <div className="barcode-scanner-sheet-root" role="presentation">
      <button type="button" className="barcode-scanner-sheet-backdrop" aria-label="Close" onClick={handleClose} />
      <div className="barcode-scanner-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
        <div className="barcode-scanner-sheet-head">
          <h2 id="barcode-scanner-title" className="barcode-scanner-sheet-title">
            Scan barcode
          </h2>
          <button type="button" className="barcode-scanner-sheet-close" onClick={handleClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {phase === "scan" ? (
          <>
            {(initialTypedCode?.replace(/\D/g, "").length ?? 0) >= 8 ? (
              <p className="barcode-scanner-sheet-hint">Looking up that code…</p>
            ) : (
              <>
                <p className="barcode-scanner-sheet-hint">
                  Point the back camera at the barcode — we&apos;ll scan it automatically. Works best with good light.
                </p>
                <div className="barcode-scanner-sheet-video-wrap">
                  <video
                    ref={videoRef}
                    className="barcode-scanner-sheet-video"
                    playsInline
                    muted
                    autoPlay
                  />
                  <div className="barcode-scanner-sheet-reticle" aria-hidden />
                  {videoStatus !== "playing" ? (
                    <div className="barcode-scanner-sheet-overlay" role="status" aria-live="polite">
                      {videoStatus === "stalled" ? (
                        <>
                          <p className="barcode-scanner-sheet-overlay-text">
                            Camera isn&apos;t showing — tap to start.
                          </p>
                          <button
                            type="button"
                            className="onboarding-primary-btn barcode-scanner-sheet-overlay-btn"
                            onClick={manualStartCamera}
                          >
                            Tap to start camera
                          </button>
                        </>
                      ) : (
                        <p className="barcode-scanner-sheet-overlay-text">Starting camera…</p>
                      )}
                    </div>
                  ) : null}
                  {videoStatus === "playing" ? (
                    <div className="barcode-scanner-sheet-scanning" aria-hidden>
                      Scanning…
                    </div>
                  ) : null}
                  {torchSupported && videoStatus === "playing" ? (
                    <button type="button" className="barcode-scanner-sheet-torch" onClick={() => void toggleTorch()} aria-pressed={torchOn}>
                      <Flashlight size={20} aria-hidden />
                      <span>{torchOn ? "Light off" : "Light on"}</span>
                    </button>
                  ) : null}
                </div>
                {camError ? <p className="barcode-scanner-sheet-error">{camError}</p> : null}
              </>
            )}

            <label className="barcode-scanner-sheet-manual">
              <span>Type code instead</span>
              <div className="barcode-scanner-sheet-manual-row">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="settings-input"
                  placeholder="UPC / EAN"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button
                  type="button"
                  className="onboarding-primary-btn"
                  disabled={manualCode.replace(/\D/g, "").length < 8}
                  onClick={() => void runResolveAndFit(manualCode)}
                >
                  Look up
                </button>
              </div>
            </label>
          </>
        ) : resolved ? (
          <>
            <button type="button" className="onboarding-ghost-btn barcode-scanner-sheet-back" onClick={() => void backToLiveScan()}>
              Scan again
            </button>
            <BarcodeProductConfirmCard
              resolved={resolved}
              fit={fit}
              fitChipLabel={fitChipLabel}
              fitChipTone={fitChipTone}
              rationale={rationale}
              fitLoading={fitLoading}
              onAddToCabinet={addResolved}
              onEditInstead={editInstead}
              onDismiss={handleClose}
            />
          </>
        ) : null}

        <style jsx>{`
          .barcode-scanner-sheet-root {
            position: fixed;
            inset: 0;
            z-index: 13000;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .barcode-scanner-sheet-backdrop {
            position: absolute;
            inset: 0;
            border: none;
            background: color-mix(in srgb, var(--color-text-primary) 55%, transparent);
            backdrop-filter: blur(4px);
            cursor: pointer;
          }
          .barcode-scanner-sheet-panel {
            position: relative;
            max-height: 92vh;
            overflow: auto;
            background: var(--color-bg-elevated, var(--color-bg));
            color: var(--color-text-primary);
            border-radius: 16px 16px 0 0;
            padding: 16px 16px 24px;
            border: 1px solid color-mix(in srgb, var(--color-text-muted) 18%, transparent);
            border-bottom: none;
          }
          @media (min-width: 640px) {
            .barcode-scanner-sheet-root {
              justify-content: center;
              padding: 16px;
            }
            .barcode-scanner-sheet-panel {
              border-radius: 16px;
              max-width: 440px;
              margin: 0 auto;
              width: 100%;
            }
          }
          .barcode-scanner-sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .barcode-scanner-sheet-title {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 700;
          }
          .barcode-scanner-sheet-close {
            border: none;
            background: transparent;
            color: var(--color-text-muted);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
          }
          .barcode-scanner-sheet-hint {
            margin: 0 0 10px;
            font-size: 13px;
            color: var(--color-text-secondary);
            line-height: 1.4;
          }
          .barcode-scanner-sheet-video-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            border-radius: 12px;
            overflow: hidden;
            background: #111;
            margin-bottom: 12px;
          }
          .barcode-scanner-sheet-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            background: #111;
          }
          .barcode-scanner-sheet-reticle {
            position: absolute;
            inset: 0;
            pointer-events: none;
            box-shadow: inset 0 0 0 9999px color-mix(in srgb, #000 35%, transparent);
          }
          .barcode-scanner-sheet-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px;
            text-align: center;
            color: #fff;
            background: color-mix(in srgb, #000 55%, transparent);
            z-index: 2;
          }
          .barcode-scanner-sheet-overlay-text {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
          }
          .barcode-scanner-sheet-overlay-btn {
            padding: 10px 18px;
          }
          .barcode-scanner-sheet-scanning {
            position: absolute;
            top: 10px;
            left: 10px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #fff;
            background: color-mix(in srgb, #000 55%, transparent);
            border: 1px solid color-mix(in srgb, #fff 25%, transparent);
            border-radius: 999px;
            z-index: 1;
            pointer-events: none;
          }
          .barcode-scanner-sheet-reticle::before {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 72%;
            height: 38%;
            border: 2px solid color-mix(in srgb, #fff 75%, transparent);
            border-radius: 8px;
            box-shadow: 0 0 0 1px color-mix(in srgb, #000 40%, transparent);
          }
          .barcode-scanner-sheet-torch {
            position: absolute;
            right: 10px;
            bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, #fff 35%, transparent);
            background: color-mix(in srgb, #000 45%, transparent);
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .barcode-scanner-sheet-error {
            font-size: 13px;
            color: #c45c4a;
            margin: 0 0 12px;
            line-height: 1.4;
          }
          .barcode-scanner-sheet-manual {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }
          .barcode-scanner-sheet-manual-row {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .barcode-scanner-sheet-manual-row :global(.settings-input) {
            flex: 1;
            min-width: 0;
          }
          .barcode-scanner-sheet-back {
            margin-bottom: 10px;
          }
        `}</style>
      </div>
    </div>
  )
}
