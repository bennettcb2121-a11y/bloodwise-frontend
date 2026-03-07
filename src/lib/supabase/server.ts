import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mhtttwoxdehxnoxltqek.supabase.co"
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_NzanihbkymtgFInShAB17g_pHqjdtBP"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options ?? {})
          )
        } catch {
          // Ignored if called from Server Component
        }
      },
    },
  })
}
