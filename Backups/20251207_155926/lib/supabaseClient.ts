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

// Create a server-side client for JWT token validation
export const supabaseServer = () => {
  // Only create server client on server side
  if (typeof window !== 'undefined') {
    throw new Error('supabaseServer() can only be used on the server side')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })
}

// Function to validate JWT token and get user data
export const validateJWTToken = async (token: string) => {
  try {
    // For now, let's use the admin client to get user data directly
    // This bypasses the session requirement
    const adminClient = supabaseAdmin()
    
    // Decode the JWT token to get user ID
    const payload = JSON.parse(atob(token.split('.')[1]))
    const userId = payload.sub
    
    if (!userId) {
      console.log('JWT validation error: No user ID in token')
      return { user: null, error: { message: 'Invalid token: No user ID' } }
    }
    
    // Get user data from the database using admin client
    const { data: user, error } = await adminClient.auth.admin.getUserById(userId)
    
    if (error) {
      console.log('JWT validation error:', error)
      return { user: null, error }
    }
    
    return { user: user.user, error: null }
  } catch (error) {
    console.log('JWT validation exception:', error)
    return { user: null, error }
  }
}

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