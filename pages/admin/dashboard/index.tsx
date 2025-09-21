import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Invitation {
  id: string
  invited_email: string
  company_name: string
  role: string
  status: string
  created_at: string
  email_confirmed_at: string | null
  admin_approved_at: string | null
  message: string | null
}

export default function AdminDashboard() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
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
        const storedIsAdmin = sessionStorage.getItem('isAdmin')
        const isAdminRole = storedIsAdmin === 'true'
        setIsAdmin(isAdminRole)

        if (!isAdminRole) {
          window.location.href = '/dashboard'
          return
        }

        // Load invitations
        await loadInvitations()
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/admin/invitations')
      const data = await response.json()
      
      if (data.invitations) {
        setInvitations(data.invitations)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const handleApprove = async (invitationId: string) => {
    try {
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('No valid session found')
        return
      }

      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invitationId })
      })

      const data = await response.json()
      
      if (data.success) {
        // Reload invitations
        await loadInvitations()
      } else {
        alert('Error approving user: ' + data.message)
      }
    } catch (error) {
      console.error('Error approving user:', error)
      alert('Error approving user')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
      case 'email_confirmed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Awaiting Approval</span>
      case 'admin_approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const formatDate = (dateString: string) => {
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
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {user?.email}</span>
              <button
                onClick={() => {
                  const { supabase: getSupabaseClient } = require('../../../lib/supabaseClient')
                  const supabase = getSupabaseClient()
                  supabase.auth.signOut()
                  window.location.href = '/'
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Pending Invitations
              </h3>
              
              {invitations.length === 0 ? (
                <p className="text-gray-500">No invitations found.</p>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-6 gap-4 items-center">
                        <div className="col-span-2">
                          <div className="text-sm font-medium text-gray-900">{invitation.invited_email}</div>
                          <div className="text-sm text-gray-500">{invitation.company_name}</div>
                        </div>
                        <div className="col-span-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {invitation.role}
                          </span>
                        </div>
                        <div className="col-span-1">
                          {getStatusBadge(invitation.status)}
                        </div>
                        <div className="col-span-1">
                          <div className="text-sm text-gray-500">{formatDate(invitation.created_at)}</div>
                        </div>
                        <div className="col-span-1">
                          {invitation.status === 'email_confirmed' && (
                            <button
                              onClick={() => handleApprove(invitation.id)}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded-md"
                            >
                              Approve
                            </button>
                          )}
                          {invitation.status === 'admin_approved' && (
                            <span className="text-green-600">Approved</span>
                          )}
                          {invitation.status === 'pending' && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
