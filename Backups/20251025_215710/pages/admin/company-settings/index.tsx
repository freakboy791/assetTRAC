import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSessionTimeout } from '../../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning'

export default function CompanySettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const isEditingRef = useRef(false)
  const [companyData, setCompanyData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  })

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

  const loadCompanyData = async () => {
    try {
      // Get the current session to get the access token
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
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
          email: data.company.email || ''
        })
      } else {
        setMessage(data.error || 'Failed to load company data')
      }
    } catch (error) {
      console.error('Error loading company data:', error)
      setMessage('Error loading company data')
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          window.location.href = '/'
          return
        }

        // Fetch fresh user data from API to get profile information
        try {
          const response = await fetch('/api/auth/getUser', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()

            setUser(data.user) // This now includes profile data
          } else {
            console.error('Failed to fetch user data, using session data')
            setUser(session.user)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUser(session.user)
        }
        
        await loadCompanyData()
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  // Debug useEffect to track isEditing changes
  useEffect(() => {

  }, [isEditing])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      // Get the current session to get the access token
      const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setMessage('No valid session found')
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/company/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ companyData }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Company updated successfully!')
        setCompany(data.company)
        setIsEditing(false) // Exit edit mode after successful save
        isEditingRef.current = false
      } else {
        setMessage(data.error || 'Failed to update company')
      }
    } catch (error) {
      console.error('Error updating company:', error)
      setMessage('Error updating company')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setCompanyData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const handleEditToggle = () => {


    
    const newValue = !isEditing

    
    // Update both state and ref
    setIsEditing(newValue)
    isEditingRef.current = newValue
    
    // Clear message when entering edit mode
    if (newValue) {
      setMessage('')
    }
    
    // Force a re-render by updating a dummy state
    setTimeout(() => {


    }, 100)
  }

  const handleCancel = () => {

    setIsEditing(false)
    isEditingRef.current = false
    // Reload the original data
    loadCompanyData()
    setMessage('')
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
                <span className="text-xs text-gray-700 truncate">
                  Welcome, {getDisplayName()}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => {
                    const { supabase: getSupabaseClient } = require('../../../lib/supabaseClient')
                    const supabase = getSupabaseClient()
                    supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your company information and settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">
                  Welcome, {getDisplayName()}
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const { supabase: getSupabaseClient } = require('../../../lib/supabaseClient')
                  const supabase = getSupabaseClient()
                  supabase.auth.signOut()
                  window.location.href = '/'
                }}
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
                    onClick={() => window.location.href = '/admin/dashboard'}
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
                  <span className="ml-4 text-sm font-medium text-gray-500">Company Settings</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isEditing ? 'Edit your company details and settings' : 'View your company details and settings'}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {



                      setIsEditing(!isEditing)
                      isEditingRef.current = !isEditingRef.current
                    }}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    TEST TOGGLE
                  </button>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors cursor-pointer z-10 relative"
                      style={{ pointerEvents: 'auto' }}
                    >
                      Edit Company
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Debug info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs">
                Debug: isEditing = {isEditing.toString()}, isEditingRef = {isEditingRef.current.toString()}
              </div>
              {message && (
                <div className={`p-4 rounded-md ${
                  message.includes('successfully') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    key={`name-${isEditing}`}
                    type="text"
                    name="name"
                    id="name"
                    value={companyData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    key={`email-${isEditing}`}
                    type="email"
                    name="email"
                    id="email"
                    value={companyData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    key={`phone-${isEditing}`}
                    type="tel"
                    name="phone"
                    id="phone"
                    value={companyData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

              </div>

              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  key={`street-${isEditing}`}
                  type="text"
                  name="street"
                  id="street"
                  value={companyData.street}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    key={`city-${isEditing}`}
                    type="text"
                    name="city"
                    id="city"
                    value={companyData.city}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    key={`state-${isEditing}`}
                    type="text"
                    name="state"
                    id="state"
                    value={companyData.state}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                    ZIP Code
                  </label>
                  <input
                    key={`zip-${isEditing}`}
                    type="text"
                    name="zip"
                    id="zip"
                    value={companyData.zip}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
              </form>
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
