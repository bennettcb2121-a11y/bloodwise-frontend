"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ConsentGate } from "@/src/components/ConsentGate"
import {
  BloodworkUploadModal,
  type UploadedExtraction,
} from "@/src/components/BloodworkUploadModal"
import { BloodworkExtractionConfirm } from "@/src/components/BloodworkExtractionConfirm"

import "../labs.css"

type Stage =
  | { kind: "upload" }
  | { kind: "confirm"; sessionId: string; extractions: UploadedExtraction[] }
  | { kind: "done"; sessionId: string }

export default function LabsUploadPage() {
  const [stage, setStage] = useState<Stage>({ kind: "upload" })
  const router = useRouter()
  const searchParams = useSearchParams()
  /** `?return=onboarding` sends the user back into the survey (analyze → paywall lock) after upload;
   *  default flow sends them to `/dashboard?newResults=1` for returning users. */
  const returnTo = searchParams.get("return")

  const backHref = returnTo === "onboarding" ? "/?step=labs" : "/dashboard"
  const backLabel = returnTo === "onboarding" ? "Back to survey" : "Dashboard"

  return (
    <main className="clarion-labs-shell">
      <p style={{ margin: 0 }}>
        <Link
          href={backHref}
          className="clarion-lab-actions__secondary"
          style={{ padding: "0.35rem 0.9rem", fontSize: "0.82rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={14} aria-hidden /> {backLabel}
        </Link>
      </p>

      <header>
        <h1 className="clarion-labs-heading">Upload your lab results</h1>
        <p className="clarion-labs-sub">
          Drop PDFs or photos from your iPhone, Quest portal, LabCorp, Kaiser, or any
          other lab. Clarion extracts biomarker values locally-first, then you review
          and confirm. Your raw file is deleted immediately after confirmation.
        </p>
      </header>

      <ConsentGate
        requiredConsents={["lab_processing", "ai_processing", "retention_default", "health_data_privacy_v1"]}
        context={{ flow: "lab_upload" }}
      >
        {stage.kind === "upload" ? (
          <BloodworkUploadModal
            onComplete={(payload) =>
              setStage({ kind: "confirm", sessionId: payload.sessionId, extractions: payload.extractions })
            }
          />
        ) : null}

        {stage.kind === "confirm" ? (
          <BloodworkExtractionConfirm
            sessionId={stage.sessionId}
            extractions={stage.extractions}
            onConfirmed={() => {
              setStage({ kind: "done", sessionId: stage.sessionId })
              /** Onboarding users haven't paid yet; send them to the score-reveal step so they hit the paywall.
               *  Returning dashboard users land on `/dashboard?newResults=1` where trends + biomarkers pick up
               *  the new save automatically. Previous saves stay in history in both cases. */
              if (returnTo === "onboarding") {
                router.push("/?step=labs&analyze=1")
              } else {
                router.push("/dashboard?newResults=1")
              }
            }}
          />
        ) : null}

        {stage.kind === "done" ? (
          <div className="clarion-lab-confirm-panel">
            <h2 className="clarion-lab-confirm-panel__title">Saved</h2>
            <p className="clarion-labs-sub">
              Your new results are saved. Taking you home…
            </p>
          </div>
        ) : null}
      </ConsentGate>
    </main>
  )
}
