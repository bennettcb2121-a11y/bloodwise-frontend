"use client"

import React from "react"
import Link from "next/link"

export default function AuthErrorPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const message = params?.get("message") || "Something went wrong signing you in."

  return (
    <main className="auth-error-page">
      <h1>Sign-in issue</h1>
      <p>{message}</p>
      <Link href="/">Back to home</Link>
      <style jsx>{`
        .auth-error-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg, #060914 0%, #070b16 100%);
          color: #f8fafc;
        }
        .auth-error-page h1 {
          font-size: 20px;
          margin-bottom: 12px;
        }
        .auth-error-page p {
          color: rgba(226, 232, 240, 0.8);
          margin-bottom: 24px;
        }
        .auth-error-page a {
          color: #7c8cff;
        }
      `}</style>
    </main>
  )
}
