import { useState, useEffect } from 'react'
import { Invitation } from '../../../types'
import { validateAndRefreshSession, storeEnhancedSession, handleSessionError, getCurrentTabId as getTabId } from '../../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'
import { triggerInviteRefresh } from '../../../lib/adminRefresh'

export default function AdminInvitePage() {
  const [invitedEmail, setInvitedEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [userRole, setUserRole] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'viewer-asset':
        return 'Read-only access to asset information only. Can view asset details, status, and location (no create, update, delete).'
      case 'viewer-financials':
        return 'Read-only access to financial data only. Can view costs, depreciation, and financial reports (no create, update, delete).'
      case 'viewer-both':
        return 'Read-only access to both asset and financial data. Can view all information but cannot make changes.'
      case 'tech':
        return 'Asset management access only. Can create, update, and manage company assets. No access to financial data.'
      case 'manager-asset':
        return 'Management access with full asset management permissions. Can approve Tech/Viewers, manage assets (create, update, delete), and send invitations. No financial access.'
      case 'manager-financials':
        return 'Management access with full financials management permissions. Can approve Tech/Viewers, manage financial data (create, update, delete), and send invitations. No asset access.'
      case 'manager-both':
        return 'Management access with both asset and financials management permissions. Can approve Tech/Viewers, manage all data (create, update, delete), and send invitations.'
      case 'owner':
        return 'Full company access. Can manage all settings, users, company information, assets, and financials with full create, update, delete permissions.'
      default:
        return 'Select a role to see description.'
    }
  }

  const getAvailableRoles = (userRoles: string[]) => {
    const allRoles = [
      { value: 'viewer-asset', label: 'Viewer - Asset' },
      { value: 'viewer-financials', label: 'Viewer - Financials' },
      { value: 'viewer-both', label: 'Viewer - Both' },
      { value: 'tech', label: 'Tech' },
      { value: 'manager-asset', label: 'Manager - Asset' },
      { value: 'manager-financials', label: 'Manager - Financials' },
      { value: 'manager-both', label: 'Manager - Both' },
      { value: 'owner', label: 'Owner' }
    ]

    // Admin can invite any role (except admin)
    if (userRoles.includes('admin')) {
      return allRoles // Admin can invite all roles
    }
    
    // Owner can invite any role below them (no admin, no other owners)
    if (userRoles.includes('owner')) {
      return allRoles.filter(role => role.value !== 'owner') // Owner cannot invite other owners
    }
    
    // Manager can only invite tech and viewer roles (all sub-types)
    if (userRoles.some(role => role.startsWith('manager'))) {
      return allRoles.filter(role => 
        role.value === 'tech' || 
        role.value.startsWith('viewer-') || 
        role.value === 'viewer'
      )
    }
    
    // Tech and Viewer cannot send invitations
    return []
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Check if this tab already has a validated session with enhanced validation
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError || !validatedSession) {
          console.error('Admin Invite: Session validation failed:', sessionError?.message)
          if (sessionError) {
            handleSessionError(sessionError)
          }
          return
        }
        
        // Get user data from the session
        const userData = validatedSession.userData || {}
        
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
            setUserRoles(data.roles || [])
          } else {
            console.error('Failed to fetch user data, using session data')
            setUser(validatedSession.user)
            setIsAdmin(userData.isAdmin || false)
            setUserRoles(userData.roles || [])
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUser(validatedSession.user)
          setIsAdmin(userData.isAdmin || false)
          setUserRoles(userData.roles || [])
        }
        
        setLoading(false)
        
        // Check if user has permission to send invitations
        const canSendInvitations = userData.isAdmin || 
                                  userData.isOwner || 
                                  userData.roles?.some(role => role.startsWith('manager'))
        if (!canSendInvitations) {
          setStatusMessage('You do not have permission to send invitations')
          // Redirect to appropriate dashboard after showing message
          setTimeout(() => {
            window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'
          }, 2000)
          return
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

  const getDefaultRole = (currentUserRoles: string[], availableRoles: any[]) => {
    // If user is admin, default to owner
    if (currentUserRoles.includes('admin')) {
      return availableRoles.find(role => role.value === 'owner')?.value || 
             availableRoles.find(role => role.value === 'manager-both')?.value || 
             availableRoles.find(role => role.value.startsWith('manager-'))?.value || 
             availableRoles[0]?.value || ''
    }
    
    // If user is owner, default to manager-both
    if (currentUserRoles.includes('owner')) {
      return availableRoles.find(role => role.value === 'manager-both')?.value || 
             availableRoles.find(role => role.value.startsWith('manager-'))?.value || 
             availableRoles[0]?.value || ''
    }
    
    // For manager, default to tech
    if (currentUserRoles.some(role => role.startsWith('manager'))) {
      return availableRoles.find(role => role.value === 'tech')?.value || availableRoles[0]?.value || ''
    }
    
    // For other roles, use the first available role
    return availableRoles.length > 0 ? availableRoles[0].value : ''
  }

  // Set default role when userRoles are loaded
  useEffect(() => {
    if (userRoles.length > 0 && !userRole) {
      const availableRoles = getAvailableRoles(userRoles)
      if (availableRoles.length > 0) {
        const defaultRole = getDefaultRole(userRoles, availableRoles)
        setUserRole(defaultRole)
      }
    }
  }, [userRoles, userRole])

  const handleSendInvite = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent any default behavior
    e.stopPropagation() // Stop event bubbling
    




    
    if (!invitedEmail || !companyName) {
      setStatusMessage('Please fill in all required fields')
      return
    }

    setLoading(true)
    setStatusMessage('')

    try {
      // Get the current tab-specific session token with enhanced validation
      const tabId = getTabId()
      const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
      
      if (sessionError || !validatedSession || !validatedSession.accessToken) {
        console.error('Admin Invite: No valid session found:', sessionError?.message)
        setStatusMessage('Error: No valid session found. Please log in again.')
        return
      }


      ,
        companyName: companyName.trim(),
        message: personalMessage ? personalMessage.trim() : null,
        role: userRole
      })
      
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          email: invitedEmail.trim(),
          companyName: companyName.trim(),
          message: personalMessage ? personalMessage.trim() : null,
          role: userRole
        })
      })
      




      const result = await response.json()

      if (response.ok) {
        setStatusMessage(`Invitation created successfully for ${invitedEmail}!`)
        
        // Show the invitation link if provided
        if (result.invitationLink) {
          setStatusMessage(prev => prev + ` Invitation link: ${result.invitationLink}`)
        }
        
        // Clear form
        setInvitedEmail('')
        setCompanyName('')
        setPersonalMessage('')
        const availableRoles = getAvailableRoles(userRoles)
        const defaultRole = getDefaultRole(userRoles, availableRoles)
        setUserRole(defaultRole)
      
        // Trigger admin dashboard refresh (client-side only)
        if (typeof window !== 'undefined') {
          triggerInviteRefresh.sent()
        }
        
        // Redirect to admin dashboard after a short delay to show the success message
        setTimeout(() => {
          window.location.href = '/admin/dashboard?refresh=invitations'
        }, 3000)
      } else {
        setStatusMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      console.error('=== FRONTEND: Error in handleSendInvite ===', error)
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

  // Check if user has permission to send invitations
  const canSendInvitations = isAdmin || userRoles.includes('owner') || userRoles.some(role => role.startsWith('manager'))
  
  if (!canSendInvitations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">You don't have permission to send invitations.</p>
          <button
            onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
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
                  <h1 className="text-lg font-bold text-gray-900">assetTRAC Admin</h1>
                </div>
                <span className="text-xs text-gray-700 truncate">
                  Welcome, {getDisplayName()}
                </span>
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
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              <button
                  onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
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
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">
                  Welcome, {getDisplayName()}
                </span>
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
              </div>
              <button
                onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back
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

      {/* Breadcrumbs */}
      <div className="fixed top-28 sm:top-24 left-0 right-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
            <button
                    onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
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
          </div>
        </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
                    required
                  >
                    {getAvailableRoles(userRoles).map((role) => (
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
                    onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                    onClick={(e) => {

                      handleSendInvite(e)
                    }}
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
