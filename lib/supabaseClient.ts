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

// Add auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email)
  
  if (event === 'SIGNED_OUT') {
    // Clear any remaining auth data
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.')) {
            localStorage.removeItem(key)
          }
        })
        console.log('Auth data cleared on sign out')
      } catch (error) {
        console.error('Error clearing auth data:', error)
      }
    }
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
  console.log('Handling auth error:', error.message)
  
  if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
    console.log('Invalid refresh token detected, clearing session...')
    
    try {
      // Clear invalid session
      await supabase.auth.signOut()
      console.log('Session cleared successfully')
    } catch (signOutError) {
      console.error('Error during sign out:', signOutError)
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
        
        console.log('Local storage cleared')
      } catch (storageError) {
        console.error('Error clearing storage:', storageError)
      }
    }
    
    // Redirect to login
    try {
      window.location.href = '/'
    } catch (redirectError) {
      console.error('Error redirecting:', redirectError)
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
      console.error('Error getting session:', error)
      await handleAuthError(error)
      return null
    }
    
    if (!session) {
      console.log('No active session')
      return null
    }
    
    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.log('Session expired, refreshing...')
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError)
        await handleAuthError(refreshError)
        return null
      }
      
      return refreshData.session
    }
    
    return session
  } catch (error) {
    console.error('Unexpected error in checkAndRefreshSession:', error)
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
      
      console.log('All auth data cleared')
    } catch (error) {
      console.error('Error clearing auth data:', error)
    }
  }
}

// Development utility: Add to window for easy access in console
if (typeof window !== 'undefined') {
  // Add development utilities to window object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).clearAuthData = clearAllAuthData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).supabaseClient = supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
      // Test basic connectivity
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      })
      
      console.log('Connection test response:', response.status, response.statusText)
      return response.ok
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
  
  console.log('Development utilities available:')
  console.log('- window.clearAuthData() - Clear all auth data')
  console.log('- window.supabaseClient - Access Supabase client')
  console.log('- window.testSupabaseConnection() - Test Supabase connectivity')
}
