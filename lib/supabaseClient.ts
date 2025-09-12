import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    try {
      // Clear invalid session
      await supabase.auth.signOut()
    } catch (signOutError) {
      // Silently handle sign out errors
    }
    
    // Clear any remaining auth data from localStorage
    if (typeof window !== 'undefined') {
      try {
        // Clear all Supabase-related storage
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('supabase.auth.expires_at')
        localStorage.removeItem('supabase.auth.refresh_token')
        sessionStorage.removeItem('supabase.auth.token')
        sessionStorage.removeItem('supabase.auth.expires_at')
        sessionStorage.removeItem('supabase.auth.refresh_token')
        
        // Also clear any other potential auth keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.')) {
            localStorage.removeItem(key)
          }
        })
      } catch (storageError) {
        // Silently handle storage errors
      }
    }
    
    // Redirect to login
    try {
      window.location.href = '/'
    } catch (redirectError) {
      // Fallback: try to reload the page
      window.location.reload()
    }
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

// Utility function to check and refresh session
export const checkAndRefreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      await handleAuthError(error)
      return null
    }
    
    if (!session) {
      return null
    }
    
    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        await handleAuthError(refreshError)
        return null
      }
      
      return refreshData.session
    }
    
    return session
  } catch (error) {
    return null
  }
}

// Utility function to clear all auth data
export const clearAllAuthData = () => {
  if (typeof window !== 'undefined') {
    try {
      // Clear all Supabase-related storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          localStorage.removeItem(key)
        }
      })
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (error) {
      // Silently handle storage errors
    }
  }
}