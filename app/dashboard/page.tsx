'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Company, CompanyAssociation } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const runAuthCheck = async () => {
      // Only run auth check if we're actually on the dashboard page
      if (isMounted && typeof window !== 'undefined' && window.location.pathname === '/dashboard') {
        await checkAuthAndCompany()
      }
    }
    
    runAuthCheck()
    
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (userRole === 'admin') {
      fetchPendingApprovals()
    }
  }, [userRole])

  // Debug: Log when userRole changes
  useEffect(() => {
    console.log('userRole state changed to:', userRole)
  }, [userRole])

  const checkAuthAndCompany = async () => {
    try {
      // Check if user has an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('No active session, redirecting to login')
        router.push('/')
        return
      }

      const currentUser = session.user
      if (!currentUser) {
        console.log('No user in session, redirecting to login')
        router.push('/')
        return
      }

      setUser(currentUser)

      // Check if user has company associations (can be multiple)
      const { data: companyAssociations, error: companyError } = await supabase
        .from('company_users')
        .select('*, companies(*)')
        .eq('user_id', currentUser.id)

      if (companyError) {
        setMessage(`Error checking company associations: ${companyError.message}`)
      } else if (!companyAssociations || companyAssociations.length === 0) {
        // No company associations found - check if user is admin
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single()

        console.log('Dashboard role check:', { userRoleData, roleError, currentUser: currentUser.id })

        if (roleError || !userRoleData) {
          // No role found - but don't redirect, let them access admin functionality
          console.log('No role found in dashboard, but staying here for admin functionality')
          setUserRole('owner') // Set a default role to prevent redirect loops
          // Don't redirect - let user access admin invite functionality
        } else if (userRoleData && userRoleData.role === 'admin') {
          // Admin user - set role and show admin dashboard
          console.log('Admin user in dashboard, staying here')
          setUserRole('admin')
          // Don't redirect - stay on dashboard to show admin interface
        } else {
          // Owner without company - don't redirect, let them access admin functionality
          console.log('Non-admin user without company, but staying here for admin functionality')
          setUserRole('owner')
        }
      } else if (companyAssociations.length === 1) {
        // Single company association
        const association = companyAssociations[0]
        setCompany(association.companies)
        
        // Check if user has admin role FIRST
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('role', 'admin')
          .single()

        console.log('Admin role check result:', { userRoleData, roleError, userId: currentUser.id })

        if (!roleError && userRoleData) {
          // User has admin role - set admin role
          console.log('Setting user role to admin')
          setUserRole('admin')
        } else {
          // No admin role - use company role
          console.log('No admin role, using company role:', association.role)
          setUserRole(association.role)
        }
      } else if (companyAssociations.length > 1) {
        // Multiple company associations - show company selector
        setAllCompanies(companyAssociations.map((assoc: CompanyAssociation) => assoc.companies))
        setCompany(companyAssociations[0].companies) // Default to first company
        
        // Check if user has admin role FIRST
        const { data: userRoleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('role', 'admin')
          .single()

        if (!roleError && userRoleData) {
          // User has admin role - set admin role
          console.log('Setting user role to admin (multiple companies)')
          setUserRole('admin')
        } else {
          // No admin role - use company role
          console.log('No admin role, using company role (multiple companies):', companyAssociations[0].role)
          setUserRole(companyAssociations[0].role)
        }
        
        setMessage(`You are associated with ${companyAssociations.length} companies. Currently viewing: ${companyAssociations[0].companies.name}`)
      }

    } catch (error) {
      console.error('Error in checkAuthAndCompany:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = (companyId: string) => {
    const selectedCompany = allCompanies.find(c => c.id === companyId)
    if (selectedCompany) {
      setCompany(selectedCompany)
      setMessage(`Switched to: ${selectedCompany.name}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleInviteOwner = () => {
    router.push('/admin/invite')
  }

  const fetchPendingApprovals = async () => {
    if (userRole === 'admin') {
      try {
        console.log('Fetching pending approvals...')
        const { data: pendingUsers, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_approved', false)
          .eq('email_verified', true)
          .order('created_at', { ascending: false })

        console.log('Pending approvals query result:', { data: pendingUsers, error })

        if (error) {
          console.error('Error fetching pending approvals:', error)
          console.error('Error details:', error.message, error.code, error.details)
        } else {
          setPendingApprovals(pendingUsers || [])
        }
      } catch (error) {
        console.error('Error in fetchPendingApprovals:', error)
      }
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_approved: true, 
          approved_by: user!.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('id', userId)

      if (error) {
        setMessage(`Error approving user: ${error.message}`)
      } else {
        setMessage('User approved successfully!')
        fetchPendingApprovals() // Refresh the list
      }
    } catch (error) {
      console.error('Error approving user:', error)
      setMessage('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  // Admin Dashboard (no company info)
  if (userRole === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
                             <div>
                 <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                 <p className="text-gray-600">Welcome, {user.email}</p>
                 <p className="text-sm text-indigo-600 font-medium">Role: Admin</p>
               </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleInviteOwner}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                  Invite Owner
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
          {message && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700">{message}</p>
            </div>
          )}

          {/* Pending Approvals Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pending User Approvals</h2>
            {pendingApprovals.length === 0 ? (
              <p className="text-gray-500">No pending approvals</p>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((pendingUser) => (
                  <div key={pendingUser.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{pendingUser.email}</p>
                      <p className="text-sm text-gray-500">Created: {new Date(pendingUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handleApproveUser(pendingUser.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Company Owner Dashboard
  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
                         <h3 className="mt-4 text-lg font-medium text-gray-900">Company Association Required</h3>
             <p className="text-sm text-indigo-600 font-medium mb-2">Role: {userRole}</p>
             <div className="mt-2 text-sm text-gray-500">
               <p>{message}</p>
             </div>
          </div>
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
                           <div>
                 <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                 <p className="text-gray-600">Welcome, {user.email}</p>
                 <p className="text-sm text-indigo-600 font-medium">Role: {userRole}</p>
               </div>
            <div className="flex items-center space-x-4">
              {userRole === 'admin' && (
                <button
                  onClick={handleInviteOwner}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                  Invite Owner
                </button>
              )}
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
        {message && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700">{message}</p>
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profile</h2>
              {company && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Company Information</h3>
                    <div className="bg-gray-50 rounded-md p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Company Name:</span>
                        </p>
                        <p className="text-sm text-gray-900">{company.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Depreciation Rate:</span>
                        </p>
                        <p className="text-sm text-gray-900">{company.depreciation_rate ? `${company.depreciation_rate}%` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Phone:</span>
                        </p>
                        <p className="text-sm text-gray-900">{company.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Email:</span>
                        </p>
                        <p className="text-sm text-gray-900">{company.email || 'N/A'}</p>
                      </div>
                      {(company.street || company.city || company.state || company.zip) && (
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Address:</span>
                          </p>
                          <div className="text-sm text-gray-900">
                            {company.street && <p>{company.street}</p>}
                            {(company.city || company.state || company.zip) && (
                              <p>{[company.city, company.state, company.zip].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {company.note && (
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span>
                          </p>
                          <p className="text-sm text-gray-900">{company.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Only show Update button for owners */}
                  {userRole === 'owner' && (
                    <button
                      onClick={() => router.push(`/company/update/${company.id}`)}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Update Company
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to your Dashboard</h2>
              <p className="text-gray-600">Your main dashboard content will appear here.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
