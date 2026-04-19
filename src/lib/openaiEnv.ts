/**
 * Server-only OpenAI API key for route handlers.
 *
 * Uses dynamic `process.env[name]` lookups so the value is read at **runtime** on Vercel.
 * A plain `process.env.OPENAI_API_KEY` can be inlined as `undefined` at build time if the
 * variable was not present during `next build`, which breaks production even after you add
 * the secret in the dashboard (until the next build sees it — and CI builds often have no key).
 *
 * Vercel: set `OPENAI_API_KEY` on the project → Environment Variables → enable **Production** → redeploy.
 * Optional fallbacks: `OPENAI_KEY`, `OPENAI_SECRET_KEY` (same sk- value).
 */
export function getOpenAiApiKey(): string | null {
  const names = ["OPENAI_API_KEY", "OPENAI_KEY", "OPENAI_SECRET_KEY"] as const
  for (const name of names) {
    const raw = process.env[name]
    if (typeof raw !== "string") continue
    const key = raw.trim()
    if (key.length > 0) return key
  }
  return null
}
