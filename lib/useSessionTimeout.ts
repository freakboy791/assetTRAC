// React hook for managing session timeout
import { useEffect, useState, useCallback } from 'react'
import { 
  initializeSessionTimeout, 
  stopSessionTimeout, 
  resetSessionTimeout,
  getSessionTimeRemaining,
  getSessionWarningTimeRemaining,
  isSessionExpiringSoon,
  formatTimeRemaining
} from './sessionTimeout'
import { clearTabSession, getCurrentTabId } from './sessionValidator'

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number
  warningMinutes?: number
  onTimeout?: () => void
  onWarning?: () => void
  enabled?: boolean
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeoutMinutes = 30,
    warningMinutes = 5,
    onTimeout,
    onWarning,
    enabled = true
  } = options

  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [warningTimeRemaining, setWarningTimeRemaining] = useState<number>(0)
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false)
  const [showWarning, setShowWarning] = useState<boolean>(false)

  // Default timeout handler
  const handleTimeout = useCallback(() => {
    console.log('Session timeout: Logging out user due to inactivity')
    
    // Clear the session
    const tabId = getCurrentTabId()
    clearTabSession(tabId)
    
    // Clear Supabase session
    import('./supabaseClient').then(({ supabase: getSupabaseClient }) => {
      const supabase = getSupabaseClient()
      supabase.auth.signOut()
    })
    
    // Redirect to login
    window.location.href = '/'
    
    // Call custom timeout handler if provided
    if (onTimeout) {
      onTimeout()
    }
  }, [onTimeout])

  // Default warning handler
  const handleWarning = useCallback(() => {
    console.log('Session warning: User will be logged out soon due to inactivity')
    setShowWarning(true)
    
    // Call custom warning handler if provided
    if (onWarning) {
      onWarning()
    }
  }, [onWarning])

  // Initialize session timeout
  useEffect(() => {
    if (!enabled) {
      return
    }

    initializeSessionTimeout(
      handleTimeout,
      handleWarning,
      {
        timeoutMinutes,
        warningMinutes
      }
    )

    // Update time remaining periodically
    const interval = setInterval(() => {
      setTimeRemaining(getSessionTimeRemaining())
      setWarningTimeRemaining(getSessionWarningTimeRemaining())
      setIsExpiringSoon(isSessionExpiringSoon())
    }, 1000) // Update every second

    return () => {
      clearInterval(interval)
      stopSessionTimeout()
    }
  }, [enabled, timeoutMinutes, warningMinutes]) // Removed handleTimeout and handleWarning from dependencies

  // Function to reset timeout (call when user is active)
  const resetTimeout = useCallback(() => {
    resetSessionTimeout()
    setShowWarning(false)
  }, [])

  // Function to dismiss warning
  const dismissWarning = useCallback(() => {
    setShowWarning(false)
  }, [])

  // Function to extend session
  const extendSession = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  return {
    timeRemaining,
    warningTimeRemaining,
    isExpiringSoon,
    showWarning,
    resetTimeout,
    dismissWarning,
    extendSession,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    warningTimeRemainingFormatted: formatTimeRemaining(warningTimeRemaining)
  }
}
