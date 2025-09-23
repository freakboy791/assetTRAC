import { useState, useEffect } from 'react'
import Link from 'next/link'

// Window-specific storage utility using localStorage with unique window ID
const getWindowId = () => {
  let windowId = localStorage.getItem('windowId')
  if (!windowId) {
    // Create a unique window identifier using performance.now() for better uniqueness
    windowId = `win_${Date.now()}_${performance.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('windowId', windowId)
  }
  return windowId
}

const setTabStorage = (key: string, value: string) => {
  const windowId = getWindowId()
  localStorage.setItem(`${windowId}_${key}`, value)
}

const getTabStorage = (key: string) => {
  const windowId = getWindowId()
  return localStorage.getItem(`${windowId}_${key}`)
}

const clearTabStorage = () => {
  const windowId = getWindowId()
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(`${windowId}_`)) {
      localStorage.removeItem(key)
    }
  })
  localStorage.removeItem('windowId')
}

interface User {
  id: string
  email: string
  role: string
  completed_at: string
  first_name: string | null
  last_name: string | null
  last_login_at: string | null
  company_name: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          window.location.href = '/'
          return
        }

        setUser(session.user)
        
        // Check if user is admin
        const storedIsAdmin = getTabStorage('isAdmin')
        const isAdminRole = storedIsAdmin === 'true'
        
        // If session storage doesn't have admin flag, check via API
        if (!isAdminRole) {
          try {
            const approvalResponse = await fetch('/api/auth/getUser', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            const approvalData = await approvalResponse.json()
            
            if (approvalData.isAdmin) {
              setTabStorage('isAdmin', 'true')
              setTabStorage('userRoles', JSON.stringify(approvalData.userRoles || []))
              setIsAdmin(true)
            } else {
              window.location.href = '/dashboard'
              return
            }
          } catch (apiError) {
            console.error('Error checking admin status:', apiError)
            window.location.href = '/dashboard'
            return
          }
        } else {
          setIsAdmin(isAdminRole)
        }

        // Load completed users
        await loadCompletedUsers()
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
      // Get the current session token
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      const response = await fetch('/api/users/completed', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
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
                  Welcome, {user?.user_metadata?.first_name || user?.first_name || user?.email}
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
                  Back to Dashboard
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
                  Welcome, {user?.user_metadata?.first_name || user?.first_name || user?.email}
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
                Back to Dashboard
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
              </div>
              
              {users.length === 0 ? (
                <p className="text-gray-500">No completed users found.</p>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
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
                      {users.map((user) => (
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
                                  {user.company_name || 'No Company'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {user.first_name && user.last_name 
                                    ? `${user.first_name} ${user.last_name}` 
                                    : 'No Name Set'
                                  }
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
