import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId, updateLastActivity } from '../../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'

interface Owner {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  display_name: string
}

interface Company {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  description: string
  created_at: string
  updated_at: string
  depreciation_rate: number
  owner: Owner | null
}

export default function AdminCompaniesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
        
        if (validatedSession && validatedSession.userData.isAdmin) {
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
          
          // Load companies
          await loadCompanies()
          
          return
        }

        // If no validated session or not admin, redirect to login
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


  const loadCompanies = async () => {
    try {
      setCompaniesLoading(true)
      const tabId = getTabId()
      const validatedSession = validateTabSession(tabId)
      
      if (!validatedSession || !validatedSession.accessToken) {
        console.error('No valid session found')
        return
      }

      const response = await fetch('/api/admin/companies', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      } else {
        console.error('Failed to load companies')
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setCompaniesLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Clear tab-specific session storage
      const tabId = getTabId()
      clearTabSession(tabId)
      
      // Import the shared Supabase client
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      
      // Clear Supabase session
      await supabase.auth.signOut()
      
      // Clear component state
      setUser(null)
      setCompanies([])
      
      // Redirect to login
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if there's an error
      window.location.href = '/'
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.state.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Back
                </button>
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
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Back
                </button>
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
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Company Management</span>
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
            <h2 className="text-3xl font-bold text-gray-900">Company Management</h2>
            <p className="mt-2 text-gray-600">View and manage all companies in the system</p>
          </div>

          {/* Search and Stats */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="text-sm text-gray-500">
                  Total: {companies.length} companies
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={() => window.location.href = '/company/create'}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Create Company
                </button>
              </div>
            </div>
          </div>

          {/* Companies List */}
          {companiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No companies found</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredCompanies.map((company) => (
                <div key={company.id} className="bg-white shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-500">
                            {[company.address, company.city, `${company.state} ${company.zip}`]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {company.phone && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Phone:</span>
                              <span className="ml-2 text-sm text-gray-900">{company.phone}</span>
                            </div>
                          )}
                        </div>
                        {company.description && (
                          <p className="text-sm text-gray-600 mt-2">{company.description}</p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-xs text-gray-400">
                          Created: {new Date(company.created_at).toLocaleDateString()}
                        </div>
                        <div className="mt-2 space-y-1">
                          {company.owner && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Owner:</span>
                              <span className="ml-2 text-sm text-gray-900">{company.owner.display_name}</span>
                            </div>
                          )}
                          {company.email && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Email:</span>
                              <span className="ml-2 text-sm text-gray-900">{company.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
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
