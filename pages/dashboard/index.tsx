import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Invitation } from '../../types'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [hasCompany, setHasCompany] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      console.log('Dashboard: Checking user authentication...')
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Dashboard: Session check result:', error ? 'Error' : 'Success')
        console.log('Dashboard: Session data:', session ? 'Session found' : 'No session')
        
        if (!session?.user) {
          console.log('Dashboard: No user found, redirecting to home')
          window.location.href = '/'
          return
        }

        console.log('Dashboard: User found:', session.user.email)
        setUser(session.user)

        // Get role information from session storage (set during login)
        const storedRoles = sessionStorage.getItem('userRoles')
        const storedIsAdmin = sessionStorage.getItem('isAdmin')
        const storedIsOwner = sessionStorage.getItem('isOwner')
        const storedHasCompany = sessionStorage.getItem('hasCompany')

        let roles: string[] = []
        let isOwnerRole = false
        let hasCompanyData = false
        let isAdminRole = false

        if (storedRoles) {
          roles = JSON.parse(storedRoles)
          isOwnerRole = storedIsOwner === 'true'
          hasCompanyData = storedHasCompany === 'true'
          isAdminRole = storedIsAdmin === 'true'
        } else {
          // Fallback: check user metadata if session storage is empty
          const userMetadata = session.user.user_metadata
          roles = userMetadata?.roles || []
          isOwnerRole = userMetadata?.isOwner || false
          hasCompanyData = userMetadata?.hasCompany || false
          isAdminRole = userMetadata?.isAdmin || false
        }

        setUserRoles(roles)
        setIsAdmin(isAdminRole)
        setIsOwner(isOwnerRole)
        setHasCompany(hasCompanyData)

        // If owner but no company, check database to be sure
        if (isOwnerRole && !hasCompanyData) {
          console.log('Dashboard: Owner with no company in session storage, checking database...')
          
          // Check if user actually has a company in the database
          const { data: companyUsers, error: companyError } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', session.user.id)
            .limit(1)
          
          if (companyError) {
            console.error('Dashboard: Error checking company association:', companyError)
          } else if (companyUsers && companyUsers.length > 0) {
            console.log('Dashboard: User has company in database, updating session storage')
            sessionStorage.setItem('hasCompany', 'true')
            setHasCompany(true)
          } else {
            console.log('Dashboard: Owner with no company, redirecting to company creation')
            window.location.href = '/company/create'
            return
          }
        }

        // Load invitations if user is admin
        if (isAdminRole) {
          console.log('Dashboard: User is admin, loading invitations...')
          await loadInvitations()
        }

        console.log('Dashboard: Setting loading to false')
        setLoading(false)
      } catch (error) {
        console.error('Dashboard: Error checking user:', error)
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const handleSignOut = async () => {
    try {
      // Import the shared Supabase client
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if signout fails
      window.location.href = '/'
    }
  }

  const loadInvitations = async () => {
    try {
      setInvitationsLoading(true)
      
      // Get the current session token
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      const response = await fetch('/api/admin/invitations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()

      if (data.error) {
        console.error('Error from API:', data.error)
        return
      }

      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setInvitationsLoading(false)
    }
  }

  const handleApprove = async (invitationId: number) => {
    try {
      // Get the current session token
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      const response = await fetch('/api/admin/approve-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        return
      }

      // Reload invitations
      loadInvitations()
    } catch (error) {
      console.error('Error approving invitation:', error)
    }
  }

  const handleReject = async (invitationId: number) => {
    try {
      // Get the current session token
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      const response = await fetch('/api/admin/reject-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        return
      }

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
    } else if (invitation.status === 'expired') {
      return { text: 'Rejected', color: 'bg-red-100 text-red-800' }
    } else {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' }
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
      <header className="bg-white shadow">
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
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs text-gray-700 truncate">Welcome, {user?.email}</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="mt-2 text-gray-600">Welcome to your assetTRAC dashboard</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Admin Actions */}
            {isAdmin && (
              <>

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
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                      >
                        Send New Invitation
                      </button>
                    </div>
                  </div>
                </div>

              </>
            )}

            {/* Company Actions */}
            {hasCompany && (
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
                      <p className="text-sm text-gray-500">Manage your company settings</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/company/manage'}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      Manage Company
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Company */}
            {!hasCompany && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Create Company</h3>
                      <p className="text-sm text-gray-500">Set up your company profile</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => window.location.href = '/company/create'}
                      className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700 transition-colors"
                    >
                      Create Company
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invitation Management - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invitation Management</h2>
                <button
                  onClick={loadInvitations}
                  disabled={invitationsLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {invitationsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {/* Summary Statistics */}
              {!invitationsLoading && invitations.length > 0 && (
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

              {invitationsLoading ? (
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
          )}

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-500">No recent activity to display.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}