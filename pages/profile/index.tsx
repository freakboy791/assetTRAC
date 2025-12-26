import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId, updateLastActivity } from '../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [companyData, setCompanyData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal')
  const [companyLoading, setCompanyLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editProfileForm, setEditProfileForm] = useState({
    first_name: '',
    last_name: '',
    middle_initial: ''
  })

  // Function to get display name for user
  const getDisplayName = () => {
    return getUserDisplayName(user)
  }

  // Session timeout management
  const {
    showWarning,
    timeRemainingFormatted,
    extendSession,
    dismissWarning
  } = useSessionTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    enabled: !loading && !!user
  })

  // Check for hash fragment to set active tab
  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#company') {
      setActiveTab('company')
    } else if (hash === '#personal') {
      setActiveTab('personal')
    }
  }, [])

  // Define loadCompanyData before it's used in useEffect
  const loadCompanyData = useCallback(async () => {
    try {
      setCompanyLoading(true)
      const tabId = getTabId()
      
      // Use enhanced session validation instead of synchronous validation
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Profile: No valid session found for company data')
        setCompanyData(null)
        return
      }

      // Retry logic for company data loading
      let companyDataLoaded = false
      let retryCount = 0
      const maxRetries = 3
      
      while (!companyDataLoaded && retryCount < maxRetries) {
        try {
          const response = await fetch('/api/company/get', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${validatedSession.accessToken}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            
            // Ensure we have valid company data
            if (data.company) {
              setCompanyData(data.company)
              companyDataLoaded = true
            } else {
              // No company data is valid (user might not have a company yet)
              setCompanyData(null)
              companyDataLoaded = true
            }
          } else {
            throw new Error(`API returned status ${response.status}`)
          }
        } catch (error) {
          retryCount++
          console.error(`Error loading company data (attempt ${retryCount}/${maxRetries}):`, error)
          
          if (retryCount >= maxRetries) {
            // Final fallback - set to null if we can't load it
            console.error('Failed to load company data after retries')
            setCompanyData(null)
            companyDataLoaded = true
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error)
      setCompanyData(null)
    } finally {
      setCompanyLoading(false)
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Check if this tab already has a validated session with enhanced validation
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError) {
          handleSessionError(sessionError)
          return
        }
        
        if (validatedSession) {
          // Fetch fresh user data from API to get profile information with retry logic
          let userDataLoaded = false
          let retryCount = 0
          const maxRetries = 3
          
          while (!userDataLoaded && retryCount < maxRetries) {
            try {
              const response = await fetch('/api/auth/getUser', {
                headers: {
                  'Authorization': `Bearer ${validatedSession.accessToken}`
                }
              })
              
              if (response.ok) {
                const data = await response.json()
                
                // Ensure we have all required user fields
                // The getUser API fetches first_name, last_name, and middle_initial from the profiles table
                if (data.user && data.user.id && data.user.email) {
                  setUser(data.user) // This includes profile data: first_name, last_name, middle_initial from profiles table
                  setIsAdmin(data.isAdmin || false)
                  setIsOwner(data.isOwner || false)
                  // Ensure roles array includes owner/admin if the flags are set
                  let roles = data.roles || []
                  if (data.isOwner && !roles.includes('owner')) {
                    roles = [...roles, 'owner']
                  }
                  if (data.isAdmin && !roles.includes('admin')) {
                    roles = [...roles, 'admin']
                  }
                  setUserRoles(roles)
                  console.log('Profile: User data loaded from profiles table', { 
                    isAdmin: data.isAdmin, 
                    isOwner: data.isOwner, 
                    roles: roles,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    middle_initial: data.user.middle_initial
                  })
                  userDataLoaded = true
                } else {
                  throw new Error('Incomplete user data received')
                }
              } else {
                throw new Error(`API returned status ${response.status}`)
              }
            } catch (error) {
              retryCount++
              console.error(`Error fetching user data (attempt ${retryCount}/${maxRetries}):`, error)
              
              if (retryCount >= maxRetries) {
                // Final fallback to session data, but ensure we have minimum required fields
                if (validatedSession.user && validatedSession.user.id && validatedSession.user.email) {
                  setUser(validatedSession.user)
                  setIsAdmin(validatedSession.userData?.isAdmin || false)
                  setIsOwner(validatedSession.userData?.isOwner || false)
                  // Ensure roles array includes owner/admin if the flags are set
                  let roles = validatedSession.userData?.roles || []
                  if (validatedSession.userData?.isOwner && !roles.includes('owner')) {
                    roles = [...roles, 'owner']
                  }
                  if (validatedSession.userData?.isAdmin && !roles.includes('admin')) {
                    roles = [...roles, 'admin']
                  }
                  setUserRoles(roles)
                  console.log('Profile: Using session data fallback', { isAdmin: validatedSession.userData?.isAdmin, isOwner: validatedSession.userData?.isOwner, roles: roles })
                  userDataLoaded = true
                } else {
                  console.error('Session data is incomplete, cannot display profile')
                  window.location.href = '/'
                  return
                }
              } else {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
              }
            }
          }
          
          // Update last activity timestamp with enhanced session management
          const { success: activitySuccess, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {
            handleSessionError(activityError)
            return
          }
          
          // Load company data - wait for it to complete before setting loading to false
          await loadCompanyData()
          
          // Only set loading to false after both user and company data are loaded
          setLoading(false)
          
          return
        }

        // If no validated session, redirect to login
        window.location.href = '/'
        return
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        // Ensure loading is set to false even if there's an error
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  // Reload data when page becomes visible again (handles tab switching, window focus)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user && user.id) {
        // Page became visible and we have a user - refresh data if it seems incomplete
        const needsRefresh = !user.email || !user.id || (activeTab === 'company' && !companyData && !companyLoading)
        
        if (needsRefresh) {
          console.log('Profile: Page visible, refreshing data...')
          const tabId = getTabId()
          const { session: validatedSession } = await validateAndRefreshSession(tabId)
          
          if (validatedSession) {
            // Refresh user data
            try {
              const response = await fetch('/api/auth/getUser', {
                headers: {
                  'Authorization': `Bearer ${validatedSession.accessToken}`
                }
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.user && data.user.id && data.user.email) {
                  setUser(data.user)
                  setIsAdmin(data.isAdmin || false)
                  setIsOwner(data.isOwner || false)
                  // Ensure roles array includes owner/admin if the flags are set
                  let roles = data.roles || []
                  if (data.isOwner && !roles.includes('owner')) {
                    roles = [...roles, 'owner']
                  }
                  if (data.isAdmin && !roles.includes('admin')) {
                    roles = [...roles, 'admin']
                  }
                  setUserRoles(roles)
                }
              }
            } catch (error) {
              console.error('Error refreshing user data:', error)
            }
            
            // Refresh company data if on company tab
            if (activeTab === 'company') {
              await loadCompanyData()
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, activeTab, companyData, companyLoading, loadCompanyData])

  const handleSignOut = async () => {
    try {
      // Clear tab-specific session storage
      const tabId = getTabId()
      clearTabSession(tabId)
      
      // Import the shared Supabase client
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      
      // Clear Supabase session
      await supabase.auth.signOut()
      
      // Clear component state
      setUser(null)
      setIsAdmin(false)
      setIsOwner(false)
      setUserRoles([])
      setCompanyData(null)
      
      // Redirect to login
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if there's an error
      window.location.href = '/'
    }
  }

  const canEditCompany = isAdmin || isOwner

  // Profile editing handlers
  const handleEditProfile = () => {
    setEditProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      middle_initial: user?.middle_initial || ''
    })
    setShowEditModal(true)
  }

  const cancelEditProfile = () => {
    setShowEditModal(false)
    setEditProfileForm({
      first_name: '',
      last_name: '',
      middle_initial: ''
    })
  }

  const saveProfile = async () => {
    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession || !validatedSession.accessToken) {
        alert('Session expired. Please refresh the page.')
        return
      }

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          first_name: editProfileForm.first_name.trim() || null,
          last_name: editProfileForm.last_name.trim() || null,
          middle_initial: editProfileForm.middle_initial.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update local user state with new profile data
        setUser({
          ...user,
          first_name: data.profile.first_name,
          last_name: data.profile.last_name,
          middle_initial: data.profile.middle_initial
        })
        setShowEditModal(false)
        if (data.warning) {
          alert(data.warning)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error', details: 'Could not parse error response' }))
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Unknown error'
        alert(`Failed to update profile: ${errorMessage}`)
        console.error('Profile update error:', errorData)
      }
    } catch (error: any) {
      console.error('Error saving profile:', error)
      alert(`An error occurred while saving the profile: ${error.message || 'Unknown error'}`)
    }
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
                  onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Back
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
              {(userRoles.length > 0 || isAdmin || isOwner) && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <div className="flex flex-wrap gap-1">
                    {isAdmin && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Admin
                      </span>
                    )}
                    {isOwner && !isAdmin && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Owner
                      </span>
                    )}
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
                {(userRoles.length > 0 || isAdmin || isOwner) && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Role:</span>
                    <div className="flex space-x-1">
                      {isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                      {isOwner && !isAdmin && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Owner
                        </span>
                      )}
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
                  onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Back
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
                <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'}>
                  <a className="text-gray-500 hover:text-gray-700">
                    <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span className="sr-only">Dashboard</span>
                  </a>
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Profile</span>
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
            <h2 className="text-3xl font-bold text-gray-900">User Profile</h2>
            <p className="mt-2 text-gray-600">Manage your personal and company information</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'personal'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Personal Information
                  </button>
                  <button
                    onClick={() => setActiveTab('company')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'company'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Company Information
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                      <button
                        onClick={handleEditProfile}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Edit Name
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {/* These values are pulled from the profiles table via /api/auth/getUser */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.first_name || 'Not set'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Middle Initial</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.middle_initial || 'Not set'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.last_name || 'Not set'}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">User ID</label>
                        <p className="mt-1 text-sm text-gray-900">{user?.id}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Roles</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {isAdmin 
                            ? 'Admin' 
                            : isOwner 
                            ? 'Owner' 
                            : userRoles.length > 0 
                            ? userRoles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ') 
                            : 'No roles assigned'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Status</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {user?.email_confirmed_at ? 'Verified' : 'Pending Verification'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'company' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                      {canEditCompany && (
                        <button
                          onClick={() => window.location.href = '/company/manage'}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Edit Company
                        </button>
                      )}
                    </div>

                    {companyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : companyData ? (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Company Name</label>
                          <p className="mt-1 text-sm text-gray-900">{companyData.name || 'Not set'}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {companyData.street ? 
                              [companyData.street, companyData.city, `${companyData.state} ${companyData.zip}`]
                                .filter(Boolean)
                                .join(', ') 
                              : 'Not set'}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <p className="mt-1 text-sm text-gray-900">{companyData.phone || 'Not set'}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="mt-1 text-sm text-gray-900">{companyData.email || 'Not set'}</p>
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="mt-1 text-sm text-gray-900">{companyData.note || 'Not set'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No company information available</p>
                        {canEditCompany && (
                          <button
                            onClick={() => window.location.href = '/company/create'}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            Create Company
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={cancelEditProfile}
        >
          <div 
            className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Profile
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.first_name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Initial
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.middle_initial}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, middle_initial: e.target.value.slice(0, 1).toUpperCase() })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter middle initial"
                    maxLength={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editProfileForm.last_name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter last name"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={cancelEditProfile}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
