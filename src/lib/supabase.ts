import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhtttwoxdehxnoxltqek.supabase.co'

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_NzanihbkymtgFInShAB17g_pHqjdtBP'
export const supabase = createClient(supabaseUrl, supabaseKey)