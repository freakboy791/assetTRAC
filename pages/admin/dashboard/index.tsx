import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Invitation } from '../../../types'
import { validateTabSession, storeTabSession, clearTabSession, getCurrentTabId as getTabId, validateSessionWithServer, updateLastActivity } from '../../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'
import { triggerUserRefresh } from '../../../lib/adminRefresh'
import { getUserDisplayName } from '../../../lib/userDisplayName'

// Extend Window interface to include adminPollingInterval
declare global {
  interface Window {
    adminPollingInterval?: NodeJS.Timeout | null
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [hasCompany, setHasCompany] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [companyData, setCompanyData] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [completedUsers, setCompletedUsers] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [companiesCount, setCompaniesCount] = useState<number>(0)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [buttonProcessing, setButtonProcessing] = useState(false)
  const dataLoadedRef = useRef(false) // Guard to prevent duplicate data loading

  // Session timeout management
  const {
    showWarning,
    timeRemainingFormatted,
    extendSession,
    dismissWarning
  } = useSessionTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    enabled: true // Always enabled to prevent re-initialization
  })

  // Event handlers for refresh functionality
  const handleFocus = useCallback(() => {
    // Only refresh on focus if data hasn't been loaded yet (first visit)
    if (!dataLoadedRef.current && !invitationsLoading && !activityLoading && !buttonProcessing) {
      handleRefreshAll()
    }
  }, [invitationsLoading, activityLoading, buttonProcessing])

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Only refresh if data hasn't been loaded yet (first visit)
      if (!dataLoadedRef.current && !invitationsLoading && !activityLoading && !buttonProcessing) {
        handleRefreshAll()
      }
    }
  }, [invitationsLoading, activityLoading, buttonProcessing])

  const handleRouteChange = useCallback((url: string) => {
    // Always refresh when navigating back to admin dashboard
    if (url.includes('/admin/dashboard') && !invitationsLoading && !activityLoading && !buttonProcessing) {
      // Reset the data loaded flag to allow fresh data loading
      dataLoadedRef.current = false
      handleRefreshAll()
    }
  }, [invitationsLoading, activityLoading, buttonProcessing])

  const handleAdminAction = useCallback((action: string) => {
    if (dataLoadedRef.current && !invitationsLoading && !activityLoading && !buttonProcessing) {
      handleRefreshAll()
    }
  }, [invitationsLoading, activityLoading, buttonProcessing])

  const handleCustomRefresh = useCallback((event: CustomEvent) => {
    handleAdminAction(event.detail?.action || 'unknown')
  }, [handleAdminAction])


  // Function to get display name
  const getDisplayName = () => {
    return getUserDisplayName(user)
  }

  // Main useEffect for initial data loading
  useEffect(() => {
    const checkUser = async () => {
      
      try {
        // Check if this tab already has a validated admin session with enhanced validation
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError) {
          handleSessionError(sessionError)
          return
        }

        if (validatedSession && validatedSession.userData.isAdmin) {
          // Fetch fresh user data with profile information
          try {
            const response = await fetch('/api/auth/getUser', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${validatedSession.accessToken}`
              }
            })

            if (response.ok) {
              const data = await response.json()




              setUser(data.user) // This now includes profile data
            } else {
              console.error('Failed to fetch user data, using session data')

              setUser(validatedSession.user)
            }
          } catch (error) {
            console.error('Error fetching user data, using session data:', error)
            setUser(validatedSession.user)
          }

          setIsAdmin(true)
          setIsOwner(validatedSession.userData.isOwner || false)
          setHasCompany(validatedSession.userData.hasCompany || false)
          setUserRoles(validatedSession.userData.roles || [])
          
          setLoading(false)
          
          // Update last activity timestamp with enhanced session management
          const { success: activitySuccess, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {
            handleSessionError(activityError)
            return
          }
          
          // Always load data when component mounts or user state changes

          dataLoadedRef.current = true
          
          // Load data for admin dashboard with delays to prevent overwhelming
          await loadCompanyData()
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay to ensure signin API completes
          await loadRecentActivity()
          await new Promise(resolve => setTimeout(resolve, 100))
          await loadCompletedUsers()
          await new Promise(resolve => setTimeout(resolve, 100))
          await loadCompaniesCount()
          await new Promise(resolve => setTimeout(resolve, 100))
          await loadInvitations()
          
          return
        }

        // If no validated session, redirect to login
        // No validated admin session found, redirecting to login
        window.location.href = '/'
          return
      } catch (error) {
        console.error('Admin Dashboard: Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, []) // Empty dependency array - only run once on mount

  // Separate useEffect to refresh data when user state changes (removed to prevent double refresh)

  // Separate useEffect for event listeners
  useEffect(() => {
    // Set up event listeners only on client side
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      router.events.on('routeChangeComplete', handleRouteChange)
      window.addEventListener('adminAction', handleCustomRefresh as EventListener)
    }

    // Cleanup event listeners on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        router.events.off('routeChangeComplete', handleRouteChange)
        window.removeEventListener('adminAction', handleCustomRefresh as EventListener)
      }
    }
  }, [handleFocus, handleVisibilityChange, handleRouteChange, handleCustomRefresh])

  // Polling-based refresh for admin dashboard as backup to event system
  useEffect(() => {
    if (!isAdmin || invitationsLoading || activityLoading) return


    
    // Add a delay before starting the polling to avoid interfering with natural page loads
    const initialDelay = setTimeout(() => {

      
      // Check for changes every 10 seconds when admin dashboard is visible
      const interval = setInterval(async () => {
        // Only refresh if the page is visible and focused and not processing buttons
        if (document.visibilityState === 'visible' && document.hasFocus() && !buttonProcessing) {

          await handleRefreshAll()
        }
      }, 10000) // 10 seconds polling as backup

      // Store interval reference for cleanup
      window.adminPollingInterval = interval
    }, 15000) // 15 second delay before starting polling

    return () => {

      clearTimeout(initialDelay)
      if (window.adminPollingInterval) {
        clearInterval(window.adminPollingInterval)
        window.adminPollingInterval = null
      }
    }
  }, [isAdmin, invitationsLoading, activityLoading, buttonProcessing])

  // Removed visibility change handler to prevent extra refreshes
  // Fresh loads happen on initial visit and navigation, polling handles staying on page

  const loadInvitations = async () => {

    console.trace('loadInvitations call stack')
    try {
      setInvitationsLoading(true)
      
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      





      
      // Debug session storage
      const sessionStorageKeys = Object.keys(sessionStorage).filter(key => key.startsWith('_tab_'))

      sessionStorageKeys.forEach(key => {
        const sessionData = sessionStorage.getItem(key)

      })
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for invitations:', sessionError?.message)
        setInvitations([])
        return
      }

      const response = await fetch('/api/admin/invitations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()


        
        // Debug each invitation status
        if (data) {
          data.forEach((inv: any, index: number) => {
            })
        }
        



      const filteredInvitations = data?.filter(inv => inv.status !== 'completed') || []

      setInvitations(filteredInvitations)
      } else {
        console.error('Admin Dashboard: Failed to load invitations, status:', response.status)
        const errorData = await response.json()
        console.error('Admin Dashboard: Error details:', errorData)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setInvitationsLoading(false)
    }
  }

  // Helper function to check if user has asset management access
  const hasAssetManagementAccess = () => {
    // System Admin always has access (system admins have full access)
    if (isAdmin) {
      return true
    }
    
    // Owner always has access
    if (isOwner) {
      return true
    }
    
    // Check for specific roles that have asset access
    return userRoles.some(role => 
      role === 'tech' || 
      role === 'manager-asset' || 
      role === 'manager-both' || 
      role === 'viewer-asset' || 
      role === 'viewer-both'
    )
  }

  const handleGenerateDownloadToken = async () => {
    try {
      setButtonProcessing(true)
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) {
        alert('Session expired. Please refresh the page.')
        return
      }

      const response = await fetch('/api/admin/generate-download-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresInDays: 7,
          singleUse: true
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Show token and URL in a modal or alert
        const message = `Download Token Generated!\n\nToken: ${data.token}\n\nDownload URL:\n${data.downloadUrl}\n\nExpires: ${new Date(data.expiresAt).toLocaleDateString()}\n\nCopy this URL and share it with the user.`
        alert(message)
        
        // Optionally copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data.downloadUrl).then(() => {
            console.log('Download URL copied to clipboard')
          })
        }
      } else {
        alert(`Failed to generate token: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating download token:', error)
      alert('Failed to generate download token. Please try again.')
    } finally {
      setButtonProcessing(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Starting sign out process
      
      // Clear tab-specific session storage
      const tabId = getTabId()
      clearTabSession(tabId)
      
      // Import the shared Supabase client
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()

      // Clear Supabase session
      // Clearing Supabase session
      await supabase.auth.signOut()
      
      // Clear all state
      setUser(null)
      setIsAdmin(false)
      setIsOwner(false)
      setHasCompany(false)
      setUserRoles([])
      
      // Sign out complete, redirecting to login
      
      // Force redirect to login page
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if signout fails
      window.location.href = '/'
    }
  }

  const loadCompanyData = async () => {
    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for company data:', sessionError?.message)
        return
      }

      const response = await fetch('/api/company/get', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      const data = await response.json()
      
      if (data.company) {
        setCompanyData(data.company)
      }
    } catch (error) {
      console.error('Error loading company data:', error)
    }
  }


  const loadRecentActivity = async () => {

    console.trace('loadRecentActivity call stack')
    setActivityLoading(true)
    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for recent activity:', sessionError?.message)
        setRecentActivity([])
        return
      }
      
      // Get current user info for role-based filtering
      const userEmail = user?.email || ''
      const userRolesFromSession = validatedSession?.userData?.roles || []
      const userRolesString = JSON.stringify(userRolesFromSession)
      
      const response = await fetch(`/api/activity/log?limit=10&user_email=${encodeURIComponent(userEmail)}&user_roles=${encodeURIComponent(userRolesString)}`, {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Activity API response received
        setRecentActivity(data.activities || [])
      } else {
        console.error('Failed to load recent activity:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading recent activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const handleRefreshAll = async () => {

    try {
      await Promise.all([
        loadRecentActivity(),
        loadInvitations(),
        loadCompletedUsers(),
        loadCompaniesCount()
      ])

    } catch (error) {
      console.error('Admin Dashboard: Error during refresh:', error)
    }
  }

  const loadCompletedUsers = async () => {
    setUsersLoading(true)
    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for completed users:', sessionError?.message)
        setCompletedUsers([])
        return
      }

      const response = await fetch('/api/users/completed', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()

        setCompletedUsers(data.users || [])
      } else {
        console.error('Admin Dashboard: Failed to load completed users, status:', response.status)
        const errorData = await response.json()
        console.error('Admin Dashboard: Completed users error details:', errorData)
      }
    } catch (error) {
      console.error('Error loading completed users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const loadCompaniesCount = async () => {
    setCompaniesLoading(true)
    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for companies count:', sessionError?.message)
        return
      }

      const response = await fetch('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()

        setCompaniesCount(data.companiesCount || 0)
      } else {
        console.error('Admin Dashboard: Failed to load companies count, status:', response.status)
        const errorData = await response.json()
        console.error('Admin Dashboard: Companies count error details:', errorData)
      }
    } catch (error) {
      console.error('Error loading companies count:', error)
    } finally {
      setCompaniesLoading(false)
    }
  }

  const handleApprove = useCallback(async (invitationId: number) => {


    setButtonProcessing(true) // Prevent focus events from interfering
    setInvitationsLoading(true)
    try {
      // Get the current tab-specific session token with enhanced validation

      const tabId = getTabId()

      

      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for approving user:', sessionError?.message)

        // Try to refresh the session by redirecting to login
        window.location.href = '/'
        return
      }





      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin Dashboard: Approve request failed:', errorText)
        
        // If it's a 401 error, the session might be invalid
        if (response.status === 401) {

          window.location.href = '/'
        }
        return
      }


      
      // Trigger admin refresh for user approval

      triggerUserRefresh.approved()
      
      // Reload invitations, recent activity, and completed users

      await loadInvitations()

      await loadRecentActivity()

      await loadCompletedUsers()
      

    } catch (error) {
      console.error('Admin Dashboard: handleApprove - Error approving invitation:', error)
      console.error('Admin Dashboard: handleApprove - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    } finally {

      setInvitationsLoading(false)
      setButtonProcessing(false) // Re-enable focus events

    }
  }, [])

  const handleReject = useCallback(async (invitationId: number) => {

    setButtonProcessing(true) // Prevent focus events from interfering
    setInvitationsLoading(true)
    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Dashboard: No valid session found for rejecting invitation:', sessionError?.message)
        // Try to refresh the session by redirecting to login
        window.location.href = '/'
        return
      }



      const response = await fetch('/api/admin/reject-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({ invitationId }),
      })



      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin Dashboard: Reject request failed:', errorText)
        
        // If it's a 401 error, the session might be invalid
        if (response.status === 401) {

          window.location.href = '/'
        }
        return
      }


      
      // Trigger admin refresh for user denial
      triggerUserRefresh.denied()
      
      // Reload invitations, recent activity, and completed users

      await loadInvitations()

      await loadRecentActivity()

      await loadCompletedUsers()
    } catch (error) {
      console.error('Error rejecting invitation:', error)
    } finally {
      setInvitationsLoading(false)
      setButtonProcessing(false) // Re-enable focus events
    }
  }, []) // Dependency array for useCallback

  const getUserActivationStatus = (invitation: Invitation) => {
    if (invitation.status === 'pending') {
      return { text: 'Not Activated', color: 'bg-yellow-100 text-yellow-800' }
    } else if (invitation.email_confirmed_at) {
      return { text: 'Activated', color: 'bg-green-100 text-green-800' }
    } else if (invitation.status === 'completed') {
      return { text: 'Activated', color: 'bg-green-100 text-green-800' }
    } else {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const getAdminApprovalStatus = (invitation: Invitation) => {
    if (invitation.status === 'admin_approved') {
      return { text: 'Approved', color: 'bg-green-100 text-green-800' }
    } else if (invitation.status === 'email_confirmed') {
      return { text: 'Unapproved', color: 'bg-red-100 text-red-800' }
    } else if (invitation.status === 'completed') {
      return { text: 'Completed', color: 'bg-blue-100 text-blue-800' }
    } else if (invitation.status === 'pending') {
      return { text: 'Unapproved', color: 'bg-red-100 text-red-800' }
    } else if (invitation.status === 'expired') {
      return { text: 'Denied', color: 'bg-red-100 text-red-800' }
    } else {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // Helper function to check if user can manage company (admin only)
  const canManageCompany = () => {
    return userRoles.includes('admin')
  }

  // Helper function to check if user should see company recap
  const shouldShowCompanyRecap = () => {
    return userRoles.some(role => role.startsWith('viewer')) || userRoles.includes('tech')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="block sm:hidden py-4">
            <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
                <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AT</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Profile
                </button>
              <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                  Sign Out
              </button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs text-gray-700 truncate">
                Welcome, {getDisplayName()}
              </span>
              {userRoles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((role, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : role === 'owner'
                            ? 'bg-green-100 text-green-800'
                            : role.startsWith('manager')
                            ? 'bg-orange-100 text-orange-800'
                            : role === 'tech'
                            ? 'bg-blue-100 text-blue-800'
                            : role.startsWith('viewer')
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role.includes('-') 
                          ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : role.charAt(0).toUpperCase() + role.slice(1)
                        }
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">
                  Welcome, {getDisplayName()}
                </span>
                {userRoles.length > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Role:</span>
                    <div className="flex space-x-1">
                      {userRoles.map((role, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : role === 'owner'
                              ? 'bg-green-100 text-green-800'
                              : role.startsWith('manager')
                              ? 'bg-orange-100 text-orange-800'
                              : role === 'tech'
                              ? 'bg-blue-100 text-blue-800'
                              : role.startsWith('viewer')
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role.includes('-') 
                            ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                            : role.charAt(0).toUpperCase() + role.slice(1)
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Profile
                </button>
              <button
                onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Sign Out
              </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="fixed top-32 sm:top-24 left-0 right-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <button
                    onClick={() => window.location.href = '/admin/dashboard'}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="sr-only">Dashboard</span>
                  </button>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-44 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
                <p className="mt-2 text-gray-600">Welcome to your assetTRAC admin dashboard</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Live updates enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Recap for Viewer/Tech Roles */}
          {shouldShowCompanyRecap() && companyData && (
            <div className="mb-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Company Name</h4>
                      <p className="mt-1 text-sm text-gray-900">{companyData.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Email</h4>
                      <p className="mt-1 text-sm text-gray-900">{companyData.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                      <p className="mt-1 text-sm text-gray-900">{companyData.phone}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Address</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {companyData.street && (
                          <span>{companyData.street}<br /></span>
                        )}
                        {companyData.city && companyData.state && companyData.zip && (
                          <span>{companyData.city}, {companyData.state} {companyData.zip}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Admin/Owner/Manager Actions - Send Invitation */}
            {(isAdmin || isOwner || userRoles.some(role => role.startsWith('manager'))) && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Send Invitation</h3>
                      <p className="text-sm text-gray-500">Invite new users to your organization</p>
                    </div>
                  </div>
                  <div className="mt-4">
            <button
              onClick={() => window.location.href = '/admin/invite'}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Send New Invitation
            </button>
                    </div>
                  </div>
                </div>
              )}

            {/* Generate Download Token - Users with asset management access */}
            {hasAssetManagementAccess() && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Android App Download</h3>
                      <p className="text-sm text-gray-500">Generate secure download tokens for device installation</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleGenerateDownloadToken}
                      disabled={buttonProcessing}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {buttonProcessing ? 'Generating...' : 'Generate Download Token'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Company Management - For all users with company access */}
            {hasCompany && canManageCompany() && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Company Management</h3>
                      <p className="text-sm text-gray-500">Manage all companies in your organization</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/admin/companies'}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-center"
                    >
                      Manage All Companies ({companiesLoading ? '...' : companiesCount})
                    </button>
                  </div>
                  </div>
                </div>
              )}


            {/* Manage Users - Admin/Owner/Manager Only */}
            {(isAdmin || isOwner || userRoles.some(role => role.startsWith('manager'))) && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Manage Users</h3>
                      <p className="text-sm text-gray-500">Manage all users in your organization</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/admin/users'}
                      className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                    >
                      View All Users ({usersLoading ? '...' : completedUsers.length})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Updates automatically in real-time</p>
              </div>
              <button
                onClick={handleRefreshAll}
                disabled={activityLoading || invitationsLoading || usersLoading || companiesLoading}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activityLoading || invitationsLoading || usersLoading || companiesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4">
                {activityLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={activity.id || index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>


          {/* Invitation Management - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invitation Management</h2>
              </div>

          {/* Summary Statistics */}
              {!invitationsLoading && invitations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-gray-900">
                  {invitations.filter(inv => inv.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Activation</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-yellow-600">
                  {invitations.filter(inv => inv.status === 'email_confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Awaiting Approval</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">
                  {invitations.filter(inv => inv.status === 'admin_approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
            </div>
          )}

              {invitationsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading invitations...</p>
            </div>
          ) : (
            <div className="space-y-4">
                  {invitations.filter(invitation => invitation.status !== 'completed').length === 0 ? (
                <div className="text-center py-8">
                      <p className="text-gray-500">No invitations in progress.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                      {invitations.filter(invitation => invitation.status !== 'completed').map((invitation) => (
                    <li key={invitation.id} className="px-6 py-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {invitation.invited_email}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Role: {invitation.role}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">
                            Company: {invitation.company_name}
                          </p>
                          
                          {/* Status Indicators */}
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600 font-medium">User Activation:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUserActivationStatus(invitation).color}`}>
                                {getUserActivationStatus(invitation).text}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600 font-medium">Admin Approval:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAdminApprovalStatus(invitation).color}`}>
                                {getAdminApprovalStatus(invitation).text}
                              </span>
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <span>Created: {new Date(invitation.created_at).toLocaleDateString()}</span>
                            {invitation.email_confirmed_at && (
                              <span>Activated: {new Date(invitation.email_confirmed_at).toLocaleDateString()}</span>
                            )}
                            {invitation.admin_approved_at && (
                              <span>Approved: {new Date(invitation.admin_approved_at).toLocaleDateString()}</span>
                            )}
                          </div>

                          {invitation.message && (
                            <p className="text-sm text-gray-500 mt-2">
                              Message: {invitation.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {/* Action Buttons */}
                          {(() => {
                            const shouldShowButtons = invitation.status === 'email_confirmed' && !invitation.admin_approved_at;
                            return shouldShowButtons;
                          })() && (
                            <div className="flex items-center space-x-2">
                               <button
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   handleApprove(invitation.id);
                                 }}
                                 className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                                 style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
                                 type="button"
                               >
                                 Approve
                               </button>
                               <button
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   handleReject(invitation.id);
                                 }}
                                 className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                                 style={{ pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
                                 type="button"
                               >
                                 Deny
                               </button>
                            </div>
                          )}
                          
                          {/* Status Messages */}
                          {invitation.status === 'pending' && (
                            <span className="text-sm text-gray-500 text-right">
                              Waiting for user to activate
                            </span>
                          )}
                          {invitation.status === 'email_confirmed' && !invitation.admin_approved_at && (
                            <span className="text-sm text-yellow-600 text-right">
                              User activated - awaiting admin approval
                            </span>
                          )}
                          {invitation.status === 'admin_approved' && (
                            <span className="text-sm text-green-600 text-right">
                              ✓ Approved - waiting for user to login
                            </span>
                          )}
                          {invitation.status === 'completed' && invitation.admin_approved_at && (
                            <span className="text-sm text-purple-600 text-right">
                              ✓ Completed
                            </span>
                          )}
                          {invitation.status === 'expired' && (
                            <span className="text-sm text-red-600 text-right">
                              ✗ Denied by admin
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          </div>
          )}

        </div>
      </main>

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        show={showWarning}
        timeRemaining={timeRemainingFormatted}
        onExtend={extendSession}
        onDismiss={dismissWarning}
      />
    </div>
  )
}
