import { useState, useEffect } from 'react'
import { Invitation } from '../../../types'

export default function AdminInvitePage() {
  const [invitedEmail, setInvitedEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

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
          message: personalMessage || null
        })
      })

      const result = await response.json()

      if (response.ok) {
        setStatusMessage('Invitation sent successfully!')
        setInvitedEmail('')
        setCompanyName('')
        setPersonalMessage('')
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
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
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

      {/* Breadcrumb Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Main Dashboard
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Dashboard
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-500 text-sm">Send Invitation</span>
          </div>
        </div>
      </nav>

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