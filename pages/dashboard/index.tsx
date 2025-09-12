import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [hasCompany, setHasCompany] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          window.location.href = '/'
          return
        }

        setUser(user)

        // Check user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)

        if (userRoles) {
          const roles = userRoles.map(r => r.role)
          setUserRoles(roles)
          
          if (roles.includes('admin')) {
            setIsAdmin(true)
          }
          
          if (roles.includes('owner')) {
            setIsOwner(true)
            
            // Check if owner has a company
            const { data: companyData } = await supabase
              .from('company_users')
              .select('company_id')
              .eq('user_id', user.id)
              .eq('role', 'owner')
              .single()

            if (companyData) {
              setHasCompany(true)
            } else {
              // Owner without company - redirect to create company
              window.location.href = '/company/create'
              return
            }
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
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
          <div className="flex justify-between items-center py-6">
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
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                You have successfully logged in to assetTRAC!
              </p>

              {/* Admin Section */}
              {isAdmin && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                    Admin Panel
                  </h3>
                  <div className="space-y-4">
                    <p className="text-yellow-700">
                      As an admin, you can manage invitations and user accounts.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={() => window.location.href = '/admin/invite'}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
                      >
                        Send Invitations
                      </button>
                      <button
                        onClick={() => window.location.href = '/admin/dashboard'}
                        className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
                      >
                        Manage Invitations
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Section */}
              {isOwner && hasCompany && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">
                    Company Owner
                  </h3>
                  <p className="text-green-700 mb-4">
                    Your company is set up! You can now manage your company and invite team members.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => window.location.href = '/company/update'}
                      className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
                    >
                      Manage Company
                    </button>
                    <button
                      onClick={() => window.location.href = '/admin/invite'}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                    >
                      Invite Team Members
                    </button>
                    <button
                      onClick={() => window.location.href = '/admin/dashboard'}
                      className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-medium shadow-sm"
                    >
                      Manage Invitations
                    </button>
                  </div>
                </div>
              )}

              {/* Regular User Section */}
              {!isAdmin && !isOwner && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">
                    Getting Started
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Your account is ready! You can now start using assetTRAC to manage your assets.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => window.location.href = '/company/create'}
                      className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
                    >
                      Create Company
                    </button>
                    <button
                      onClick={() => window.location.href = '/company/update'}
                      className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-medium shadow-sm"
                    >
                      Manage Company
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Assets</h3>
                  <p className="text-gray-600 mb-4">Manage your company's assets</p>
                  <button className="text-indigo-600 hover:text-indigo-500 font-medium">
                    View Assets →
                  </button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
                  <p className="text-gray-600 mb-4">Generate asset reports</p>
                  <button className="text-indigo-600 hover:text-indigo-500 font-medium">
                    View Reports →
                  </button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Settings</h3>
                  <p className="text-gray-600 mb-4">Configure your preferences</p>
                  <button className="text-indigo-600 hover:text-indigo-500 font-medium">
                    View Settings →
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
