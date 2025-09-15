import { useState, useEffect } from 'react'
import { Invitation } from '../../../types'

export default function AdminInvitePage() {
  const [invitedEmail, setInvitedEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [userRole, setUserRole] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'viewer-asset':
        return 'Read-only access to asset information only. Can view asset details, status, and location.'
      case 'viewer-financials':
        return 'Read-only access to financial data only. Can view costs, depreciation, and financial reports.'
      case 'viewer-both':
        return 'Read-only access to both asset and financial data. Full viewer permissions.'
      case 'tech':
        return 'Asset management access. Can create, update, and manage company assets.'
      case 'manager-asset':
        return 'Management access with asset view permissions. Can approve Tech/Viewers, manage assets, and send invitations.'
      case 'manager-financials':
        return 'Management access with financials view permissions. Can approve Tech/Viewers, manage assets, and send invitations.'
      case 'manager-both':
        return 'Management access with both asset and financials permissions. Can approve Tech/Viewers, manage assets, and send invitations.'
      case 'owner':
        return 'Full company access. Can manage all settings, users, and will be redirected to company setup.'
      default:
        return 'Select a role to see description.'
    }
  }

  const getAvailableRoles = (userRole: string) => {
    const allRoles = [
      { value: 'viewer-asset', label: 'Viewer - Asset View' },
      { value: 'viewer-financials', label: 'Viewer - Financials View' },
      { value: 'viewer-both', label: 'Viewer - Both Asset & Financials' },
      { value: 'tech', label: 'Tech' },
      { value: 'manager-asset', label: 'Manager - Asset View' },
      { value: 'manager-financials', label: 'Manager - Financials View' },
      { value: 'manager-both', label: 'Manager - Both Asset & Financials' },
      { value: 'owner', label: 'Owner' }
    ]

    switch (userRole) {
      case 'admin':
        return allRoles // Admin can manage all roles
      case 'owner':
        return allRoles.filter(role => role.value !== 'admin') // Owner can manage all except admin
      case 'manager':
      case 'manager-asset':
      case 'manager-financials':
      case 'manager-both':
        return allRoles.filter(role => !['admin', 'owner', 'manager-asset', 'manager-financials', 'manager-both'].includes(role.value)) // Manager can manage tech and viewers
      default:
        return [] // Other roles cannot send invitations
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!session?.user) {
          window.location.href = '/'
          return
        }

        setUser(session.user)

        // For now, assume admin role
        setUserRoles(['admin'])
        setIsAdmin(true)
      } catch (error) {
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const getDefaultRole = (currentUserRoles: string[], availableRoles: any[]) => {
    // For admins, default to Owner; for others, use first available role
    return currentUserRoles.includes('admin') && availableRoles.some(role => role.value === 'owner')
      ? 'owner'
      : availableRoles.length > 0 ? availableRoles[0].value : ''
  }

  // Set default role when userRoles are loaded
  useEffect(() => {
    if (userRoles.length > 0 && !userRole) {
      const availableRoles = getAvailableRoles(userRoles[0])
      if (availableRoles.length > 0) {
        const defaultRole = getDefaultRole(userRoles, availableRoles)
        setUserRole(defaultRole)
      }
    }
  }, [userRoles, userRole])

  const handleSendInvite = async () => {
    if (!invitedEmail || !companyName) {
      setStatusMessage('Please fill in all required fields')
      return
    }

    setLoading(true)
    setStatusMessage('')

    try {
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitedEmail,
          companyName: companyName,
          message: personalMessage || null,
          role: userRole
        })
      })

      const result = await response.json()

      if (response.ok) {
        setStatusMessage(`Invitation sent successfully to ${invitedEmail}!`)
        setInvitedEmail('')
        setCompanyName('')
        setPersonalMessage('')
        const availableRoles = getAvailableRoles(userRoles[0] || 'admin')
        const defaultRole = getDefaultRole(userRoles, availableRoles)
        setUserRole(defaultRole)
        
        // Redirect to dashboard after 2 seconds to show the success message
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setStatusMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      setStatusMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // We'll need to create an API route for sign out
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
    }
  }

  if (!isAdmin) {
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex mb-2" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
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
                  <span className="ml-4 text-sm font-medium text-gray-500">Send Invitation</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Send New Invitation</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Invite a new user to join your organization
                </p>
              </div>
              
              <div className="px-6 py-6 space-y-6">
                <div>
                  <label htmlFor="invitedEmail" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="invitedEmail"
                    value={invitedEmail}
                    onChange={(e) => setInvitedEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Your Company Name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="personalMessage" className="block text-sm font-medium text-gray-700">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    id="personalMessage"
                    rows={3}
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Add a personal message to the invitation..."
                  />
                </div>

                <div>
                  <label htmlFor="userRole" className="block text-sm font-medium text-gray-700">
                    User Role *
                  </label>
                  <select
                    id="userRole"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  >
                    {getAvailableRoles(userRoles[0] || 'admin').map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {getRoleDescription(userRole)}
                  </p>
                </div>

                {statusMessage && (
                  <div className={`p-4 rounded-md ${
                    statusMessage.includes('Error') || statusMessage.includes('error')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {statusMessage}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}