import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Invitation } from '../../../types'
import { validateTabSession, storeTabSession, clearTabSession, getCurrentTabId as getTabId, validateSessionWithServer, updateLastActivity } from '../../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'

export default function AdminDashboard() {
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
          setUser(validatedSession.user)
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
          
          // Only load data if not already loaded (prevent duplicate loading in React Strict Mode)
          // Check if we're returning from invite page and refresh invitations
          const urlParams = new URLSearchParams(window.location.search)
          const isRefreshInvitations = urlParams.get('refresh') === 'invitations'
          
          if (!dataLoadedRef.current) {
            console.log('Admin Dashboard: Loading data for the first time')
            dataLoadedRef.current = true
            
            // Load data for admin dashboard with delays to prevent overwhelming
            await loadCompanyData()
            await new Promise(resolve => setTimeout(resolve, 100))
            await loadRecentActivity()
            await new Promise(resolve => setTimeout(resolve, 100))
            await loadCompletedUsers()
          } else {
            console.log('Admin Dashboard: Data already loaded, skipping duplicate load')
          }

          // Load invitations (either initial load or refresh)
          if (isRefreshInvitations) {
            console.log('Admin Dashboard: Refreshing invitations due to URL parameter')
            // Add a small delay to ensure the invitation is fully created
            setTimeout(async () => {
              await loadInvitations()
              // Remove the refresh parameter from URL
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.delete('refresh')
              window.history.replaceState({}, '', newUrl.toString())
            }, 1000)
        } else {
            // Initial load of invitations
            await loadInvitations()
          }
          
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

    // Add focus event listener to refresh data when page regains focus
    const handleFocus = () => {
      console.log('Admin Dashboard: Focus event triggered, loading state:', { invitationsLoading, activityLoading, dataLoaded: dataLoadedRef.current })
      console.trace('Focus event call stack')
      // Only refresh if data has been loaded and we're not already loading
      if (dataLoadedRef.current && !invitationsLoading && !activityLoading) {
        console.log('Admin Dashboard: Refreshing data on focus')
        loadInvitations()
        loadRecentActivity()
      } else {
        console.log('Admin Dashboard: Skipping refresh due to loading state or data not loaded yet')
      }
    }

    window.addEventListener('focus', handleFocus)

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, []) // Empty dependency array - only run once on mount

  const loadInvitations = async () => {
    console.log('Admin Dashboard: loadInvitations called')
    console.trace('loadInvitations call stack')
    try {
      setInvitationsLoading(true)
      
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      console.log('Admin Dashboard: Session validation - tabId:', tabId)
      console.log('Admin Dashboard: Session validation - validatedSession exists:', !!validatedSession)
      console.log('Admin Dashboard: Session validation - accessToken exists:', !!validatedSession?.accessToken)
      console.log('Admin Dashboard: Session validation - user email:', validatedSession?.user?.email)
      console.log('Admin Dashboard: Session validation - sessionError:', sessionError?.message)
      
      // Debug session storage
      const sessionStorageKeys = Object.keys(sessionStorage).filter(key => key.startsWith('_tab_'))
      console.log('Admin Dashboard: Session storage keys:', sessionStorageKeys)
      sessionStorageKeys.forEach(key => {
        const sessionData = sessionStorage.getItem(key)
        console.log(`Admin Dashboard: Session data for ${key}:`, sessionData ? JSON.parse(sessionData) : null)
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
        console.log('Admin Dashboard: Invitations loaded:', data?.length || 0, 'invitations')
        console.log('Admin Dashboard: Invitation data:', data)
        
        // Debug each invitation status
        if (data) {
          data.forEach((inv: any, index: number) => {
            console.log(`Admin Dashboard: Invitation ${index}:`, {
              id: inv.id,
              email: inv.invited_email,
              status: inv.status,
              admin_approved_at: inv.admin_approved_at,
              email_confirmed_at: inv.email_confirmed_at
            })
          })
        }
        
        console.log('Admin Dashboard: Received invitations:', data)
        console.log('Admin Dashboard: Invitation statuses:', data?.map(inv => ({ id: inv.id, email: inv.invited_email, status: inv.status })))
        setInvitations(data || [])
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
    console.log('Admin Dashboard: loadRecentActivity called')
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
    console.log('Admin Dashboard: Refreshing both recent activity and invitations')
    try {
      await Promise.all([
        loadRecentActivity(),
        loadInvitations()
      ])
      console.log('Admin Dashboard: Refresh completed successfully')
    } catch (error) {
      console.error('Admin Dashboard: Error during refresh:', error)
    }
  }

  const loadCompletedUsers = async () => {
    if (!isAdmin && !isOwner && !userRoles.some(role => role.startsWith('manager'))) return
    
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
        console.error('Failed to load completed users')
      }
    } catch (error) {
      console.error('Error loading completed users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleApprove = async (invitationId: number) => {
    console.log('Admin Dashboard: handleApprove called with invitationId:', invitationId)
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

      console.log('Admin Dashboard: Sending approve request with token length:', validatedSession.accessToken.length)
      console.log('Admin Dashboard: Token preview:', validatedSession.accessToken.substring(0, 50) + '...')

      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({ invitationId }),
      })

      console.log('Admin Dashboard: Approve response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin Dashboard: Approve request failed:', errorText)
        
        // If it's a 401 error, the session might be invalid
        if (response.status === 401) {
          console.log('Admin Dashboard: 401 error - redirecting to login')
          window.location.href = '/'
        }
        return
      }

      console.log('Admin Dashboard: Approve request successful')
      
      // Reload invitations and completed users
      console.log('Admin Dashboard: Reloading invitations after approval...')
      await loadInvitations()
      console.log('Admin Dashboard: Reloading completed users after approval...')
      await loadCompletedUsers()
    } catch (error) {
      console.error('Error approving invitation:', error)
    }
  }

  const handleReject = async (invitationId: number) => {
    console.log('Admin Dashboard: handleReject called with invitationId:', invitationId)
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

      console.log('Admin Dashboard: Sending reject request with token length:', validatedSession.accessToken.length)

      const response = await fetch('/api/admin/reject-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({ invitationId }),
      })

      console.log('Admin Dashboard: Reject response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin Dashboard: Reject request failed:', errorText)
        
        // If it's a 401 error, the session might be invalid
        if (response.status === 401) {
          console.log('Admin Dashboard: 401 error - redirecting to login')
          window.location.href = '/'
        }
        return
      }

      console.log('Admin Dashboard: Reject request successful')
      
      // Reload invitations
      loadInvitations()
    } catch (error) {
      console.error('Error rejecting invitation:', error)
    }
  }

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
    if (invitation.admin_approved_at) {
      return { text: 'Approved', color: 'bg-green-100 text-green-800' }
    } else if (invitation.status === 'email_confirmed') {
      return { text: 'Unapproved', color: 'bg-red-100 text-red-800' }
    } else if (invitation.status === 'completed') {
      return { text: 'Approved', color: 'bg-green-100 text-green-800' }
    } else if (invitation.status === 'pending') {
      return { text: 'Unapproved', color: 'bg-red-100 text-red-800' }
    } else if (invitation.status === 'rejected') {
      return { text: 'Rejected', color: 'bg-red-100 text-red-800' }
    } else if (invitation.status === 'expired') {
      return { text: 'Expired', color: 'bg-red-100 text-red-800' }
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
                Welcome, {user?.user_metadata?.first_name || user?.first_name || user?.email}
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
                  Welcome, {user?.user_metadata?.first_name || user?.first_name || user?.email}
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
                  <span className="text-gray-500">
                    <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="sr-only">Dashboard</span>
                  </span>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Admin Dashboard</span>
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
            <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="mt-2 text-gray-600">Welcome to your assetTRAC admin dashboard</p>
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
                      <p className="text-sm text-gray-500">Manage all company settings and information</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/admin/companies'}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-center"
                    >
                      Manage All Companies
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
                      <p className="text-sm text-gray-500">View and manage completed users</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/admin/users'}
                      className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                    >
                      View All Users
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
              <button
                onClick={handleRefreshAll}
                disabled={activityLoading || invitationsLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Refresh Recent Activity and Invitations"
              >
                <svg 
                  className={`w-4 h-4 ${(activityLoading || invitationsLoading) ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Refresh
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
                  {invitations.filter(inv => (inv.status === 'pending' || inv.status === 'email_confirmed') && !inv.admin_approved_at).length}
                </div>
                <div className="text-sm text-gray-600">Awaiting Approval</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">
                  {invitations.filter(inv => inv.admin_approved_at && inv.status !== 'completed').length}
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
                      {invitations.filter(invitation => invitation.status !== 'completed' && invitation.status !== 'admin_approved').map((invitation) => (
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
                          {invitation.status === 'email_confirmed' && !invitation.admin_approved_at && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleApprove(invitation.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(invitation.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                              >
                                Reject
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
                              {invitation.admin_approved_at && invitation.status === 'admin_approved' && (
                            <span className="text-sm text-green-600 text-right">
                                  Approved - waiting for user to login
                            </span>
                          )}
                          {invitation.status === 'completed' && invitation.admin_approved_at && (
                            <span className="text-sm text-purple-600 text-right">
                              ✓ Completed
                            </span>
                          )}
                          {invitation.status === 'rejected' && (
                            <span className="text-sm text-red-600 text-right">
                              ✗ Rejected by admin
                            </span>
                          )}
                          {invitation.status === 'expired' && (
                            <span className="text-sm text-red-600 text-right">
                              ✗ Expired
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

          {/* Approved Invitations Section */}
          {invitations.filter(invitation => invitation.status === 'admin_approved').length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Approved Invitations</h3>
                <p className="text-sm text-gray-500">These users have been approved and are waiting to complete their first login</p>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {invitations.filter(invitation => invitation.status === 'admin_approved').map((invitation) => (
                    <li key={invitation.id} className="px-6 py-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {invitation.invited_email}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {invitation.role}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Approved
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Company: {invitation.company_name}
                          </p>
                          {invitation.message && (
                            <p className="text-sm text-gray-600 mt-1">
                              Message: {invitation.message}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <span>Created: {new Date(invitation.created_at).toLocaleDateString()}</span>
                            {invitation.email_confirmed_at && (
                              <span>Activated: {new Date(invitation.email_confirmed_at).toLocaleDateString()}</span>
                            )}
                            {invitation.admin_approved_at && (
                              <span>Approved: {new Date(invitation.admin_approved_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className="text-sm text-green-600 text-right">
                            ✓ Approved - waiting for user to login
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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