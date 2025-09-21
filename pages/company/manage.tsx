import { useState, useEffect } from 'react'
import Link from 'next/link'

// Tab-specific storage utility
const getTabId = () => {
  let tabId = sessionStorage.getItem('tabId')
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('tabId', tabId)
  }
  return tabId
}

const setTabStorage = (key: string, value: string) => {
  const tabId = getTabId()
  sessionStorage.setItem(`${tabId}_${key}`, value)
}

const getTabStorage = (key: string) => {
  const tabId = getTabId()
  return sessionStorage.getItem(`${tabId}_${key}`)
}

const clearTabStorage = () => {
  const tabId = getTabId()
  const keys = Object.keys(sessionStorage)
  keys.forEach(key => {
    if (key.startsWith(`${tabId}_`)) {
      sessionStorage.removeItem(key)
    }
  })
  sessionStorage.removeItem('tabId')
}

export default function CompanyManagePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isManager, setIsManager] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [company, setCompany] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [companyData, setCompanyData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    depreciation_rate: 0
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          window.location.href = '/'
          return
        }

        setUser(session.user)
        
        // Get role information from tab-specific session storage
        const storedRoles = getTabStorage('userRoles')
        const storedIsOwner = getTabStorage('isOwner')
        const storedIsAdmin = getTabStorage('isAdmin')
        
        let roles: string[] = []
        let isOwnerRole = false
        let isAdminRole = false

        if (storedRoles) {
          roles = JSON.parse(storedRoles)
          isOwnerRole = storedIsOwner === 'true'
          isAdminRole = storedIsAdmin === 'true'
        } else {
          // Fallback: check user metadata if session storage is empty
          const userMetadata = session.user.user_metadata
          roles = userMetadata?.roles || []
          isOwnerRole = userMetadata?.isOwner || false
          isAdminRole = userMetadata?.isAdmin || false
        }

        setUserRoles(roles)
        setIsOwner(isOwnerRole)
        setIsAdmin(isAdminRole)
        setIsManager(roles.includes('manager'))
        
        await loadCompanyData()
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const loadCompanyData = async () => {
    try {
      // Get the session to get the access token
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setMessage('No valid session found')
        return
      }

      const response = await fetch('/api/company/get', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()
      
      if (data.company) {
        setCompany(data.company)
        setCompanyData({
          name: data.company.name || '',
          street: data.company.street || '',
          city: data.company.city || '',
          state: data.company.state || '',
          zip: data.company.zip || '',
          phone: data.company.phone || '',
          email: data.company.email || '',
          depreciation_rate: data.company.depreciation_rate || 0
        })
      }
    } catch (error) {
      console.error('Error loading company data:', error)
      setMessage('Error loading company data')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Helper function to check if user can edit company
  const canEditCompany = () => {
    return isAdmin || isOwner || userRoles.some(role => role.startsWith('manager'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canEditCompany()) {
      setMessage('You do not have permission to update company information')
      return
    }

    console.log('Submitting company data:', companyData)
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/company/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Company information updated successfully!')
        await loadCompanyData() // Reload data to show updated values
        setIsEditing(false) // Exit edit mode after successful save
      } else {
        console.error('Company save error:', result)
        setMessage(`Error: ${result.error || result.message || 'Failed to save company information'}`)
      }
    } catch (error) {
      console.error('Company save error:', error)
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save company information'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company information...</p>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
                <span className="text-xs text-gray-700 truncate">Welcome, {user?.email}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
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
                <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
                <div className="flex items-center space-x-2 mt-1">
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
              <button
                onClick={() => window.location.href = isAdmin ? '/admin/dashboard' : '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-5 py-2.5 rounded-md text-sm hover:bg-red-700 transition-colors"
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
                  <span className="ml-4 text-sm font-medium text-gray-500">Company Management</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {canEditCompany() ? 'Manage Company Information' : 'Company Information'}
                    </h1>
                    <p className="mt-2 text-gray-600">
                      {canEditCompany() 
                        ? 'Update your company details and settings' 
                        : 'View your company information'
                      }
                    </p>
                  </div>
                  {canEditCompany() && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isEditing
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Company'}
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <div className={`mb-6 p-4 rounded-md ${
                  message.includes('Error') || message.includes('error') 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-green-50 text-green-700'
                }`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={companyData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing || !canEditCompany()}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                      isEditing && canEditCompany()
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Address Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Address
                  </label>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="street" className="block text-sm font-medium text-gray-600">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="street"
                        id="street"
                        value={companyData.street}
                        onChange={handleInputChange}
                        disabled={!isEditing || !canEditCompany()}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                          isEditing && canEditCompany()
                            ? 'border-gray-300' 
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-600">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          id="city"
                          value={companyData.city}
                          onChange={handleInputChange}
                          disabled={!isEditing || !canEditCompany()}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isEditing && canEditCompany()
                              ? 'border-gray-300' 
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-600">
                          State
                        </label>
                        <input
                          type="text"
                          name="state"
                          id="state"
                          value={companyData.state}
                          onChange={handleInputChange}
                          disabled={!isEditing || !canEditCompany()}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isEditing && canEditCompany()
                              ? 'border-gray-300' 
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-600">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          name="zip"
                          id="zip"
                          value={companyData.zip}
                          onChange={handleInputChange}
                          disabled={!isEditing || !canEditCompany()}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isEditing && canEditCompany()
                              ? 'border-gray-300' 
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={companyData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing || !canEditCompany()}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isEditing && canEditCompany()
                          ? 'border-gray-300' 
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={companyData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing || !canEditCompany()}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isEditing && canEditCompany()
                          ? 'border-gray-300' 
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {/* Depreciation Rate - Only for Owners */}
                {isOwner && (
                  <div>
                    <label htmlFor="depreciation_rate" className="block text-sm font-medium text-gray-700">
                      Depreciation Rate (%)
                    </label>
                    <input
                      type="number"
                      name="depreciation_rate"
                      id="depreciation_rate"
                      value={companyData.depreciation_rate || ''}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!isEditing || !canEditCompany()}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isEditing && canEditCompany()
                          ? 'border-gray-300' 
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Set the default depreciation rate for company assets
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  {isEditing && canEditCompany() && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
