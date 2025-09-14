import { useState, useEffect } from 'react'
import { Invitation } from '../../../types'

// Make this page dynamic to avoid build-time issues
export async function getServerSideProps() {
  return {
    props: {},
  }
}

export default function AdminDashboardPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
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

        // For now, assume admin role (you can implement proper role checking later)
        setUserRoles(['admin'])
        setIsAdmin(true)

        // Load invitations (you'll need to implement this API route)
        // For now, set empty array
        setInvitations([])
        setLoading(false)
      } catch (error) {
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const loadInvitations = async () => {
    try {
      // We'll need to create an API route for this
      const response = await fetch('/api/admin/invitations')
      const data = await response.json()

      if (data.error) {
        return
      }

      setInvitations(data.invitations || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (invitationId: number) => {
    try {
      const response = await fetch('/api/admin/approve-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        return
      }

      // Reload invitations
      loadInvitations()
    } catch (error) {
    }
  }

  const handleReject = async (invitationId: number) => {
    try {
      const response = await fetch('/api/admin/reject-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        return
      }

      // Reload invitations
      loadInvitations()
    } catch (error) {
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
    } else if (invitation.status === 'expired') {
      return { text: 'Rejected', color: 'bg-red-100 text-red-800' }
    } else {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const handleSignOut = async () => {
    try {
      // Import the shared Supabase client
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if signout fails
      window.location.href = '/'
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
                title="Back to Main Dashboard"
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
            <span className="text-gray-500 text-sm">Admin Dashboard</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Invitations</h2>
            <button
              onClick={() => window.location.href = '/admin/invite'}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Send New Invitation
            </button>
          </div>

          {/* Summary Statistics */}
          {!loading && invitations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-purple-600">
                  {invitations.filter(inv => inv.status === 'completed' && inv.admin_approved_at).length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading invitations...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No invitations found.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {invitations.map((invitation) => (
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
                          {invitation.admin_approved_at && invitation.status !== 'completed' && (
                            <span className="text-sm text-green-600 text-right">
                              Approved - waiting for user completion
                            </span>
                          )}
                          {invitation.status === 'completed' && invitation.admin_approved_at && (
                            <span className="text-sm text-purple-600 text-right">
                              ✓ Completed
                            </span>
                          )}
                          {invitation.status === 'expired' && (
                            <span className="text-sm text-red-600 text-right">
                              ✗ Rejected/Expired
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
      </main>
    </div>
  )
}