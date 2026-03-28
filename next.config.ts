import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    /** Short hash for DevTools: confirm the deployed bundle matches the expected build (see `data-clarion-build` on dashboard shell). */
    NEXT_PUBLIC_CLARION_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 7) ??
      "local",
  },
}

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG ?? "_",
  project: process.env.SENTRY_PROJECT ?? "_",
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
}

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
