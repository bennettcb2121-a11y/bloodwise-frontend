"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function ProtocolSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading")

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    const slug = searchParams.get("slug")
    if (!sessionId || !slug) {
      setStatus("error")
      return
    }
    fetch("/api/record-protocol-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("done")
          router.replace(`/protocols/${slug}`)
        } else {
          setStatus("error")
        }
      })
      .catch(() => setStatus("error"))
  }, [searchParams, router])

  return (
    <main className="protocol-success-shell">
      <div className="protocol-success-box">
        {status === "loading" && <p>Recording your purchase…</p>}
        {status === "done" && <p>Redirecting to your protocol…</p>}
        {status === "error" && (
          <>
            <p>Something went wrong. Your payment was successful; you can go to the protocol from the dashboard.</p>
            <a href="/dashboard">Go to Dashboard</a>
          </>
        )}
      </div>
    </main>
  )
}

export default function ProtocolSuccessPage() {
  return (
    <Suspense fallback={
      <main className="protocol-success-shell">
        <div className="protocol-success-box"><p>Loading…</p></div>
      </main>
    }>
      <ProtocolSuccessContent />
    </Suspense>
  )
}
