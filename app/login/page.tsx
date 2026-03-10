"use client"

import React from "react"
import Link from "next/link"
import { AuthUI } from "@/src/components/AuthUI"

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-page-container">
        <Link href="/" className="login-page-logo">Clarion</Link>
        <h1 className="login-page-title">Sign in</h1>
        <p className="login-page-subtitle">Create an account or log in to save your results and access your dashboard.</p>
        <div className="login-page-card">
          <AuthUI />
        </div>
        <p className="login-page-back">
          <Link href="/">← Back to home</Link>
        </p>
      </div>
      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(165deg, #1a0a2e 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f0a1a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .login-page-container {
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .login-page-logo {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #fafafa;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 32px;
        }
        .login-page-logo:hover {
          color: #f97316;
        }
        .login-page-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #fafafa;
          margin: 0 0 8px;
        }
        .login-page-subtitle {
          font-size: 16px;
          color: rgba(255,255,255,0.65);
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .login-page-card {
          background: rgba(26,26,31,0.9);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .login-page-back {
          margin-top: 24px;
          font-size: 14px;
        }
        .login-page-back a {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
        }
        .login-page-back a:hover {
          color: #f97316;
        }
      `}</style>
    </main>
  )
}
