import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null

export { supabase, supabaseAdmin }

// Function to handle auth errors and clear invalid tokens
export const handleAuthError = async (error: { message?: string }) => {
  if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
    // Clear invalid session
    await supabase.auth.signOut()
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
    }
    // Redirect to login
    window.location.href = '/'
  }
}

export type AuthError = {
  message: string
}

export type AuthResult = {
  success: boolean
  message: string
  error?: AuthError
}
