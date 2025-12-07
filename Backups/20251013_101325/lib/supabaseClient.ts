import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug logging for environment variables (client-side only)
if (typeof window !== 'undefined') {
  console.log('Client-side environment check:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
  console.log('Session: Skipping server-side validation to prevent session corruption')
}

// Create Supabase client for client-side operations
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Export functions that return the clients
export const supabase = () => supabaseClient

// Create Supabase admin client for server-side operations only
export const supabaseAdmin = () => {
  // Only create admin client on server side
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() can only be used on the server side')
  }
  
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Function to handle auth errors and clear invalid tokens
export const handleAuthError = async (error: { message?: string }) => {
  if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
    try {
      // Clear invalid session
      supabase().auth.signOut()
      
      // Clear session storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase().auth.token')
        sessionStorage.clear()
      }
    } catch (clearError) {
      console.error('Error clearing invalid session:', clearError)
    }
  }
}