import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY

// Only log on server-side to avoid exposing environment info in browser
if (typeof window === 'undefined') {
  console.log('Supabase Service Key:', supabaseServiceKey ? 'Available' : 'Missing')
  console.log('Environment check:', { 
    hasSecret: !!process.env.SUPABASE_SECRET_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_KEY
  })
}

// Client for frontend operations (with auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
// Create the admin client only on the server to avoid instantiating
// another GoTrue (auth) client in the browser bundle which can
// produce the "Multiple GoTrueClient instances detected" warning.
export const supabaseAdmin: SupabaseClient | undefined =
  typeof window === 'undefined'
    ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : undefined
