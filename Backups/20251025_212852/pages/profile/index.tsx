import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId, updateLastActivity } from '../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [companyData, setCompanyData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal')
  const [companyLoading, setCompanyLoading] = useState(false)

  // Function to get display name for user
  const getDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    } else if (user?.first_name) {
      return user.first_name
    } else if (user?.last_name) {
      return user.last_name
    } else if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name
    } else {
      return user?.email || 'User'
    }
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
          // Fetch fresh user data from API to get profile information
          try {
            const response = await fetch('/api/auth/getUser', {
              headers: {
                'Authorization': `Bearer ${validatedSession.accessToken}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()

              setUser(data.user) // This now includes profile data
              setIsAdmin(data.isAdmin || false)
              setIsOwner(data.isOwner || false)
              setUserRoles(data.roles || [])
            } else {
              console.error('Failed to fetch user data, using session data')
              setUser(validatedSession.user)
              setIsAdmin(validatedSession.userData.isAdmin || false)
              setIsOwner(validatedSession.userData.isOwner || false)
              setUserRoles(validatedSession.userData.roles || [])
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            setUser(validatedSession.user)
            setIsAdmin(validatedSession.userData.isAdmin || false)
            setIsOwner(validatedSession.userData.isOwner || false)
            setUserRoles(validatedSession.userData.roles || [])
          }
          
          setLoading(false)
          
          // Update last activity timestamp with enhanced session management
          const { success: activitySuccess, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {

            handleSessionError(activityError)
            return
          }
          
          // Load company data

          await loadCompanyData()
          
          return
        }

        // If no validated session, redirect to login
        window.location.href = '/'
        return
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const loadCompanyData = async () => {
    try {
      setCompanyLoading(true)
      const tabId = getTabId()
      const validatedSession = validateTabSession(tabId)
      



      
      if (!validatedSession || !validatedSession.accessToken) {
        console.error('Profile: No valid session found')
        return
      }


      const response = await fetch('/api/company/get', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })


      if (response.ok) {
        const data = await response.json()

        setCompanyData(data.company)
      } else {
        console.error('Failed to load company data')
      }
    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setCompanyLoading(false)
    }
  }

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
                    <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                          {isAdmin ? 'Admin' : isOwner ? 'Owner' : userRoles.join(', ')}
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
