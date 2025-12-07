// Session validation utility for tab-isolated sessions
// This ensures each tab maintains its own validated session state

interface TabSession {
  user: any
  userData: any
  accessToken: string
  validatedAt: number
  lastActivity: number
  tabId: string
}

// Validate if a session is still valid for this tab
export function validateTabSession(tabId: string): TabSession | null {
  try {
    const sessionData = sessionStorage.getItem(`_tab_${tabId}_session`)
    
    if (!sessionData) {
      return null
    }

    const session: TabSession = JSON.parse(sessionData)
    
    // Check if session is expired (24 hours from validation OR 30 minutes of inactivity)
    const now = Date.now()
    const sessionAge = now - session.validatedAt
    const inactivityTime = now - (session.lastActivity || session.validatedAt)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    const maxInactivity = 30 * 60 * 1000 // 30 minutes in milliseconds
    
    if (sessionAge > maxAge || inactivityTime > maxInactivity) {
      clearTabSession(tabId)
      return null
    }

    // Verify the session belongs to this tab
    if (session.tabId !== tabId) {
      clearTabSession(tabId)
      return null
    }

    return session
  } catch (error) {
    console.error('Error validating tab session:', error)
    return null
  }
}

// Store a validated session for this tab
export function storeTabSession(tabId: string, user: any, userData: any, accessToken: string): void {
  try {
    const now = Date.now()
    const session: TabSession = {
      user,
      userData,
      accessToken,
      validatedAt: now,
      lastActivity: now,
      tabId
    }
    
    sessionStorage.setItem(`_tab_${tabId}_session`, JSON.stringify(session))
  } catch (error) {
    console.error('Error storing tab session:', error)
  }
}

// Update last activity timestamp for this tab
export function updateLastActivity(tabId: string): void {
  try {
    const sessionData = sessionStorage.getItem(`_tab_${tabId}_session`)
    if (sessionData) {
      const session: TabSession = JSON.parse(sessionData)
      session.lastActivity = Date.now()
      sessionStorage.setItem(`_tab_${tabId}_session`, JSON.stringify(session))
    }
  } catch (error) {
    console.error('Error updating last activity:', error)
  }
}

// Clear session for this tab
export function clearTabSession(tabId: string): void {
  try {
    sessionStorage.removeItem(`_tab_${tabId}_session`)
  } catch (error) {
    console.error('Error clearing tab session:', error)
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

// Validate session with server
export async function validateSessionWithServer(accessToken: string): Promise<{ valid: boolean; userData?: any }> {
  try {
    const response = await fetch('/api/auth/getUser', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.ok) {
      const userData = await response.json()
      return { valid: true, userData }
    } else {
      return { valid: false }
    }
  } catch (error) {
    console.error('Error validating session with server:', error)
    return { valid: false }
  }
}
