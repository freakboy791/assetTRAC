import { useState, useEffect } from 'react'
import { validateTabSession, getCurrentTabId as getTabId } from '../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'


const ASSET_TYPES = [
  'Laptop',
  'Desktop PC',
  'Tablet',
  'Cell Phone',
  'Monitor',
  'Printer'
]

export default function CreateAssetPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isViewer, setIsViewer] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  
  // Form fields
  const [assetType, setAssetType] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [note, setNote] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

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
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError) {
          handleSessionError(sessionError)
          return
        }
        
        if (validatedSession) {
          try {
            const response = await fetch('/api/auth/getUser', {
              headers: {
                'Authorization': `Bearer ${validatedSession.accessToken}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              setUser(data.user)
              setUserRoles(data.roles || [])
              setIsViewer(data.roles?.some((role: string) => role.startsWith('viewer')) || false)
            } else {
              setUser(validatedSession.user)
              setUserRoles(validatedSession.userData.roles || [])
              setIsViewer(validatedSession.userData.roles?.some((role: string) => role.startsWith('viewer')) || false)
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            setUser(validatedSession.user)
            setUserRoles(validatedSession.userData.roles || [])
            setIsViewer(validatedSession.userData.roles?.some((role: string) => role.startsWith('viewer')) || false)
          }
          
          setLoading(false)
          
          const { success, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {
            handleSessionError(activityError)
            return
          }
          
          // Load company users for dropdown
          await loadCompanyUsers(validatedSession.accessToken)
          
          return
        }

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

  const loadCompanyUsers = async (accessToken: string) => {
    try {
      const response = await fetch('/api/users/company', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCompanyUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading company users:', error)
    }
  }

  // No longer need to load containers for asset creation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!assetType || !make || !model) {
      alert('Please fill in all required fields (Asset Type, Make, Model)')
      return
    }

    setSubmitting(true)

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) {
        alert('Session expired. Please log in again.')
        window.location.href = '/'
        return
      }

      // Create asset name from make and model
      const assetName = `${make} ${model}`.trim()

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          name: assetName,
          type: assetType,
          make: make.trim(),
          model: model.trim(),
          serial_number: serialNumber.trim() || null,
          note: note.trim() || null,
          assigned_to: assignedTo || null,
          status: 'active'
        })
      })

      if (response.ok) {
        // Redirect back to assets page
        window.location.href = '/assets'
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to create asset'
        console.error('Error creating asset:', data)
        alert(errorMessage)
        setSubmitting(false)
      }
    } catch (error) {
      console.error('Error creating asset:', error)
      alert('Failed to create asset')
      setSubmitting(false)
    }
  }

  const getDisplayName = () => {
    return getUserDisplayName(user)
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

  if (isViewer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to create assets.</p>
          <button
            onClick={() => window.location.href = '/assets'}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to Assets
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
          <div className="block sm:hidden py-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AT</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.href = '/assets'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs text-gray-700 truncate">Welcome, {getDisplayName()}</span>
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
              )}
            </div>
          </div>
          
          <div className="hidden sm:flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">Welcome, {getDisplayName()}</span>
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
                )}
              </div>
              <button
                onClick={() => window.location.href = '/assets'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back
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
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="sr-only">Dashboard</span>
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => window.location.href = '/assets'}
                    className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Assets
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Create Asset</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create New Asset</h2>
              <p className="mt-1 text-sm text-gray-600">Add a new asset to your inventory</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="space-y-6">
                {/* Asset Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select asset type...</option>
                    {ASSET_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Make */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Dell, HP, Apple"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Latitude 5520, MacBook Pro"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter serial number (optional)"
                  />
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {companyUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.display_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Assign this asset to a user</p>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Additional notes about this asset (optional)"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => window.location.href = '/assets'}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Asset'}
                </button>
              </div>
            </form>
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

