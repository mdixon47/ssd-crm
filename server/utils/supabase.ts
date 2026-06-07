import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role key for admin access)
export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables')
  }

  return createClient(url, key)
}
