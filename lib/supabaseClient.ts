import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'placeholder-anon-key'
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || 'placeholder-service-role-key'

const missingSupabaseConfig = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY

// Only log on server-side to avoid exposing environment info in browser
if (typeof window === 'undefined') {
  console.log('Supabase Service Key:', process.env.SUPABASE_SECRET_KEY ? 'Available' : 'Missing')
  console.log('Environment check:', {
    hasSecret: !!process.env.SUPABASE_SECRET_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_KEY,
  })

  if (missingSupabaseConfig) {
    console.warn('Supabase environment variables are missing; using placeholder values so the app can start in development.')
  }
}

// Client for frontend operations (with auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
// Create the admin client only on the server to avoid instantiating
// another GoTrue (auth) client in the browser bundle which can
// produce the "Multiple GoTrueClient instances detected" warning.
export const supabaseAdmin: SupabaseClient | undefined =
  typeof window === 'undefined'
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : undefined
