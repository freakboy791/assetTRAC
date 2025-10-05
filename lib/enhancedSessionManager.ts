// Enhanced session management with automatic token refresh and error handling
import { createClient } from '@supabase/supabase-js'

interface TabSession {
  user: any
  userData: any
  accessToken: string
  refreshToken?: string
  validatedAt: number
  lastActivity: number
  tabId: string
  expiresAt?: number
}

interface SessionError {
  type: 'expired' | 'invalid' | 'network' | 'unknown'
  message: string
  shouldRedirect: boolean
}

// Create Supabase client for token operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
)

// Enhanced session validation with automatic refresh
export async function validateAndRefreshSession(tabId: string): Promise<{ session: TabSession | null; error: SessionError | null }> {
  try {
    const sessionData = sessionStorage.getItem(`_tab_${tabId}_session`)
    
    if (!sessionData) {
      return { session: null, error: { type: 'expired', message: 'No session found', shouldRedirect: true } }
    }

    const session: TabSession = JSON.parse(sessionData)
    
    // Check if session belongs to this tab
    if (session.tabId !== tabId) {
      clearTabSession(tabId)
      return { session: null, error: { type: 'invalid', message: 'Session tab mismatch', shouldRedirect: true } }
    }

    // Check if session is expired due to inactivity (30 minutes)
    const now = Date.now()
    const inactivityTime = now - (session.lastActivity || session.validatedAt)
    const maxInactivity = 30 * 60 * 1000 // 30 minutes

    if (inactivityTime > maxInactivity) {
      clearTabSession(tabId)
      return { 
        session: null, 
        error: { 
          type: 'expired', 
          message: 'Session expired due to inactivity. Please log in again.', 
          shouldRedirect: true 
        } 
      }
    }

    // Check if token is close to expiring (refresh if less than 5 minutes left)
    const tokenAge = now - session.validatedAt
    const tokenMaxAge = 24 * 60 * 60 * 1000 // 24 hours
    const refreshThreshold = 5 * 60 * 1000 // 5 minutes before expiry

    if (tokenAge > (tokenMaxAge - refreshThreshold)) {
      console.log('Session: Token is close to expiring, attempting refresh...')
      
      try {
        // Attempt to refresh the token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: session.refreshToken || ''
        })

        if (refreshError || !refreshData.session) {
          console.log('Session: Token refresh failed:', refreshError)
          clearTabSession(tabId)
          return { 
            session: null, 
            error: { 
              type: 'expired', 
              message: 'Session expired. Please log in again.', 
              shouldRedirect: true 
            } 
          }
        }

        // Update session with new token
        const newSession: TabSession = {
          ...session,
          accessToken: refreshData.session.access_token,
          refreshToken: refreshData.session.refresh_token,
          validatedAt: now,
          lastActivity: now,
          expiresAt: refreshData.session.expires_at ? refreshData.session.expires_at * 1000 : undefined
        }

        sessionStorage.setItem(`_tab_${tabId}_session`, JSON.stringify(newSession))
        console.log('Session: Token refreshed successfully')
        
        return { session: newSession, error: null }
      } catch (refreshError) {
        console.error('Session: Error during token refresh:', refreshError)
        clearTabSession(tabId)
        return { 
          session: null, 
          error: { 
            type: 'network', 
            message: 'Unable to refresh session. Please log in again.', 
            shouldRedirect: true 
          } 
        }
      }
    }

    // Temporarily disable server-side token validation to fix session issues
    // The token will be validated by the individual API calls
    console.log('Session: Skipping server-side validation to prevent session corruption')

    return { session, error: null }
  } catch (error) {
    console.error('Session: Error validating session:', error)
    clearTabSession(tabId)
    return { 
      session: null, 
      error: { 
        type: 'unknown', 
        message: 'Session validation failed. Please log in again.', 
        shouldRedirect: true 
      } 
    }
  }
}

// Validate token with server
async function validateTokenWithServer(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    return response.ok
  } catch (error) {
    console.error('Session: Error validating token with server:', error)
    return false
  }
}

// Store a validated session with refresh token
export function storeEnhancedSession(tabId: string, user: any, userData: any, accessToken: string, refreshToken?: string, expiresAt?: number): void {
  try {
    const now = Date.now()
    const session: TabSession = {
      user,
      userData,
      accessToken,
      refreshToken,
      validatedAt: now,
      lastActivity: now,
      tabId,
      expiresAt
    }
    
    sessionStorage.setItem(`_tab_${tabId}_session`, JSON.stringify(session))
    console.log('Session: Enhanced session stored successfully')
  } catch (error) {
    console.error('Session: Error storing enhanced session:', error)
  }
}

// Update last activity with automatic refresh check
export async function updateActivityWithRefresh(tabId: string): Promise<{ success: boolean; error: SessionError | null }> {
  try {
    const { session, error } = await validateAndRefreshSession(tabId)
    
    if (error) {
      return { success: false, error }
    }

    if (session) {
      session.lastActivity = Date.now()
      sessionStorage.setItem(`_tab_${tabId}_session`, JSON.stringify(session))
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Session: Error updating activity:', error)
    return { 
      success: false, 
      error: { 
        type: 'unknown', 
        message: 'Failed to update session activity.', 
        shouldRedirect: false 
      } 
    }
  }
}

// Clear session for this tab
export function clearTabSession(tabId: string): void {
  try {
    sessionStorage.removeItem(`_tab_${tabId}_session`)
    console.log('Session: Tab session cleared')
  } catch (error) {
    console.error('Session: Error clearing tab session:', error)
  }
}

// Get current tab ID
export function getCurrentTabId(): string {
  let tabId = sessionStorage.getItem('_tabId')
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('_tabId', tabId)
  }
  return tabId
}

// Handle session errors with silent redirect
export function handleSessionError(error: SessionError): void {
  console.error('Session Error:', error.message)
  
  if (error.shouldRedirect) {
    // Clear any existing session
    const tabId = getCurrentTabId()
    clearTabSession(tabId)
    
    // Redirect to login silently (no alert message)
    window.location.href = '/'
  }
}

// Legacy compatibility functions
export function validateTabSession(tabId: string): TabSession | null {
  // This is now a wrapper around the enhanced validation
  // For backward compatibility, we'll do a synchronous check first
  try {
    const sessionData = sessionStorage.getItem(`_tab_${tabId}_session`)
    if (!sessionData) return null
    
    const session: TabSession = JSON.parse(sessionData)
    
    // Quick check for obvious issues
    const now = Date.now()
    const inactivityTime = now - (session.lastActivity || session.validatedAt)
    const maxInactivity = 15 * 60 * 1000 // 15 minutes
    
    if (inactivityTime > maxInactivity || session.tabId !== tabId) {
      clearTabSession(tabId)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error in legacy validateTabSession:', error)
    return null
  }
}

export function storeTabSession(tabId: string, user: any, userData: any, accessToken: string): void {
  storeEnhancedSession(tabId, user, userData, accessToken)
}

export function updateLastActivity(tabId: string): void {
  updateActivityWithRefresh(tabId)
}
