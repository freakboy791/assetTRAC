import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, storeTabSession, clearTabSession, getCurrentTabId as getTabId, validateSessionWithServer } from '../../../lib/sessionValidator'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../../lib/userDisplayName'

interface User {
  id: string
  email: string
  role: string
  completed_at: string
  first_name: string | null
  last_name: string | null
  display_name: string
  last_login_at: string | null
  company_name: string | null
  company_id: string | null
}

interface CompanyGroup {
  company_id: string
  company_name: string
  users: User[]
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    const checkUser = async () => {


      
      try {
        // Check if this tab already has a validated session
        const tabId = getTabId()
        const validatedSession = validateTabSession(tabId)
        
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
            } else {
              console.error('Failed to fetch user data, using session data')
              setUser(validatedSession.user)
              setIsAdmin(true)
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            setUser(validatedSession.user)
            setIsAdmin(true)
          }
          
          setLoading(false)
          
          // Load users for admin
          await loadCompletedUsers()
          
          return
        }

        // If no validated admin session, redirect to login
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

  const loadCompletedUsers = async () => {
    try {
      // Get the current tab-specific session token
      const tabId = getTabId()
      const validatedSession = validateTabSession(tabId)
      
      if (!validatedSession || !validatedSession.accessToken) {
        console.error('No valid session token found for loading completed users.')
        return
      }

      const response = await fetch('/api/users/completed', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.users) {
          setUsers(data.users)
        }
      } else {
        console.error('Failed to load completed users')
      }
    } catch (error) {
      console.error('Error loading completed users:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Group users by company
  const groupUsersByCompany = (users: User[]): CompanyGroup[] => {
    const groups: { [key: string]: CompanyGroup } = {}
    
    users.forEach(user => {
      const companyId = user.company_id || 'no-company'
      const companyName = user.company_name || 'No Company'
      
      if (!groups[companyId]) {
        groups[companyId] = {
          company_id: companyId,
          company_name: companyName,
          users: []
        }
      }
      
      groups[companyId].users.push(user)
    })
    
    return Object.values(groups).sort((a, b) => a.company_name.localeCompare(b.company_name))
  }

  const toggleCompany = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(companyId)) {
        newSet.delete(companyId)
      } else {
        newSet.add(companyId)
      }
      return newSet
    })
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
            Return to Dashboard
          </Link>
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
            <div className="flex justify-between items-start">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center">
                  <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                    <span className="text-xs font-bold text-white">AT</span>
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
                </div>
                <span className="text-xs text-gray-700 truncate">
                  Welcome, {getDisplayName()}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => {
                    const { supabase: getSupabaseClient } = require('../../../lib/supabaseClient')
                    const supabase = getSupabaseClient()
                    supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
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
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const { supabase: getSupabaseClient } = require('../../../lib/supabaseClient')
                  const supabase = getSupabaseClient()
                  supabase.auth.signOut()
                  window.location.href = '/'
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="fixed top-28 sm:top-24 left-0 right-0 z-40 bg-white">
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
                  <span className="ml-4 text-sm font-medium text-gray-500">Manage Users</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
              <p className="mt-1 text-sm text-gray-600">View and manage completed users in your organization</p>
            </div>
            <div className="px-6 py-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Completed Users ({users.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">Users organized by company</p>
              </div>
              
              {users.length === 0 ? (
                <p className="text-gray-500">No completed users found.</p>
              ) : (
                <div className="space-y-4">
                  {groupUsersByCompany(users).map((company) => (
                    <div key={company.company_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Company Header */}
                      <div 
                        className="bg-gray-50 px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCompany(company.company_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-indigo-600">
                                {company.company_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                {company.company_name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {company.users.length} user{company.users.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              {expandedCompanies.has(company.company_id) ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Users List - Collapsible */}
                      {expandedCompanies.has(company.company_id) && (
                        <div className="bg-white">
                          <div className="overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Completed
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {company.users.map((user) => (
                                  <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">
                                              {user.first_name ? user.first_name.charAt(0) : user.email.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="ml-4">
                                          <div className="text-sm font-medium text-gray-900">
                                            {user.display_name || 'No Name Set'}
                                          </div>
                                          <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(user.completed_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {formatDate(user.last_login_at)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
