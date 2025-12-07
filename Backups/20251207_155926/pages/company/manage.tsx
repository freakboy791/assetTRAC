import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, storeTabSession, clearTabSession, getCurrentTabId as getTabId, validateSessionWithServer } from '../../lib/sessionValidator'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'

// US States data for dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
]

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
  const [isEditing, setIsEditing] = useState(true) // Start in edit mode by default

  // Function to get display name for user
  const getDisplayName = () => {
    return getUserDisplayName(user)
  }
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
  const [stateError, setStateError] = useState('')
  const [zipError, setZipError] = useState('')
  const [phoneError, setPhoneError] = useState('')

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


  // Validation functions
  const validateState = (state: string) => {
    if (!state) {
      setStateError('State is required')
      return false
    }
    if (state.length !== 2) {
      setStateError('State must be a 2-letter code (e.g., CA, NY)')
      return false
    }
    const validState = US_STATES.find(s => s.code === state.toUpperCase())
    if (!validState) {
      setStateError('Please enter a valid 2-letter state code')
      return false
    }
    setStateError('')
    return true
  }

  const validateZipCode = (zip: string) => {
    if (!zip) {
      setZipError('ZIP code is required')
      return false
    }
    // US ZIP code pattern: exactly 5 digits
    const zipPattern = /^\d{5}$/
    if (!zipPattern.test(zip)) {
      setZipError('Please enter a valid 5-digit ZIP code (e.g., 12345)')
      return false
    }
    setZipError('')
    return true
  }

  const validatePhoneNumber = (phone: string) => {
    if (!phone) {
      setPhoneError('Phone number is required')
      return false
    }
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      setPhoneError('Phone number must be 10 digits')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleStateChange = (value: string) => {
    setCompanyData(prev => ({
      ...prev,
      state: value.toUpperCase()
    }))
    validateState(value.toUpperCase())
  }

  const handleZipChange = (value: string) => {
    // Only allow digits, limit to 5 digits
    const digitsOnly = value.replace(/\D/g, '')
    const limitedDigits = digitsOnly.slice(0, 5)
    setCompanyData(prev => ({
      ...prev,
      zip: limitedDigits
    }))
    validateZipCode(limitedDigits)
  }

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limitedDigits = digitsOnly.slice(0, 10)
    
    // Format as (xxx)-xxx-xxxx
    let formatted = ''
    if (limitedDigits.length > 0) {
      if (limitedDigits.length <= 3) {
        formatted = `(${limitedDigits}`
      } else if (limitedDigits.length <= 6) {
        formatted = `(${limitedDigits.slice(0, 3)})-${limitedDigits.slice(3)}`
      } else {
        formatted = `(${limitedDigits.slice(0, 3)})-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
      }
    }
    
    setCompanyData(prev => ({
      ...prev,
      phone: formatted
    }))
    validatePhoneNumber(formatted)
  }


  useEffect(() => {
    const checkUser = async () => {


      
      try {
        // Check if this tab already has a validated session
        const tabId = getTabId()
        const validatedSession = validateTabSession(tabId)
        
        if (validatedSession) {
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
              setIsOwner(data.isOwner || false)
              setIsManager(data.isManager || false)
              setUserRoles(data.roles || [])
            } else {
              console.error('Failed to fetch user data, using session data')
              setUser(validatedSession.user)
              setIsAdmin(validatedSession.userData.isAdmin || false)
              setIsOwner(validatedSession.userData.isOwner || false)
              setIsManager(validatedSession.userData.roles?.includes('manager') || false)
              setUserRoles(validatedSession.userData.roles || [])
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            setUser(validatedSession.user)
            setIsAdmin(validatedSession.userData.isAdmin || false)
            setIsOwner(validatedSession.userData.isOwner || false)
            setIsManager(validatedSession.userData.roles?.includes('manager') || false)
            setUserRoles(validatedSession.userData.roles || [])
          }
          
          setLoading(false)
          
          // Load company data for this tab
          await loadCompanyData()
          
          return
        }

        // If no validated session, redirect to login
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

  const loadCompanyData = async () => {
    try {
      // Get the current tab-specific session token
      const tabId = getTabId()
      const validatedSession = validateTabSession(tabId)
      
      if (!validatedSession || !validatedSession.accessToken) {
        console.error('No valid session token found for loading company data.')
        return
      }

      const response = await fetch('/api/company/get', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })
      
      if (!response.ok) {
        console.error('API call failed:', response.status, response.statusText)
        return
      }
      
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
    // Don't trim on every keystroke - allow spaces while typing
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Only trim leading/trailing spaces when field loses focus
    // Don't trim numeric fields like depreciation_rate
    if (name !== 'depreciation_rate') {
      const trimmedValue = value.trim()
      setCompanyData(prev => ({
        ...prev,
        [name]: trimmedValue
      }))
    }
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

    // Validate all required fields
    const isStateValid = validateState(companyData.state)
    const isZipValid = validateZipCode(companyData.zip)
    const isPhoneValid = validatePhoneNumber(companyData.phone)
    
    if (!isStateValid || !isZipValid || !isPhoneValid) {
      setMessage('Please fix the validation errors below')
      return
    }


    setSubmitting(true)
    setMessage('')

    try {
      // Get the current tab-specific session token
      const tabId = getTabId()
      const validatedSession = validateTabSession(tabId)
      
      if (!validatedSession || !validatedSession.accessToken) {
        setMessage('No valid session found')
        return
      }


      const response = await fetch('/api/company/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify(companyData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Company information updated successfully! Redirecting back to profile...')
        await loadCompanyData() // Reload data to show updated values
        
        // Show success message for 2 seconds, then redirect back to profile with company tab active
        setTimeout(() => {
          window.location.href = '/profile#company'
        }, 2000)
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
                <span className="text-xs text-gray-700 truncate">Welcome, {getDisplayName()}</span>
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
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">Welcome, {getDisplayName()}</span>
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
                Back
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
                      Edit Company Information
                    </h1>
                    <p className="mt-2 text-gray-600">
                      Update your company details and settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Outside of form */}
              {canEditCompany() && (
                <div className="mb-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsEditing(false)
                      // Reload company data to reset any unsaved changes
                      loadCompanyData()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isEditing) {
                        // If in edit mode, submit the form
                        const form = document.querySelector('form')
                        if (form) {
                          form.requestSubmit()
                        }
                      } else {
                        // If in view mode, enter edit mode
                        setIsEditing(true)
                      }
                    }}
                    disabled={submitting}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEditing
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {submitting ? 'Saving...' : (isEditing ? 'Save' : 'Edit Company')}
                  </button>
                </div>
              )}

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
                    key={`name-${isEditing}`}
                    value={companyData.name}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
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
                        key={`street-${isEditing}`}
                        value={companyData.street}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
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
                          key={`city-${isEditing}`}
                          value={companyData.city}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
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
                          State *
                        </label>
                        <select
                          name="state"
                          id="state"
                          key={`state-${isEditing}`}
                          value={companyData.state}
                          onChange={(e) => handleStateChange(e.target.value)}
                          disabled={!isEditing || !canEditCompany()}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isEditing && canEditCompany()
                              ? stateError ? 'border-red-300' : 'border-gray-300'
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                        >
                          <option value="">Select a state</option>
                          {US_STATES.map((state) => (
                            <option key={state.code} value={state.code}>
                              {state.code} - {state.name}
                            </option>
                          ))}
                        </select>
                        {stateError && (
                          <p className="mt-1 text-sm text-red-600">{stateError}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-600">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          name="zip"
                          id="zip"
                          key={`zip-${isEditing}`}
                          value={companyData.zip}
                          onChange={(e) => handleZipChange(e.target.value)}
                          disabled={!isEditing || !canEditCompany()}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isEditing && canEditCompany()
                              ? zipError ? 'border-red-300' : 'border-gray-300'
                              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                          }`}
                          placeholder="12345"
                          maxLength={5}
                        />
                        {zipError && (
                          <p className="mt-1 text-sm text-red-600">{zipError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      key={`phone-${isEditing}`}
                      value={companyData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      disabled={!isEditing || !canEditCompany()}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isEditing && canEditCompany()
                          ? phoneError ? 'border-red-300' : 'border-gray-300'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                    {phoneError && (
                      <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      key={`email-${isEditing}`}
                      value={companyData.email}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
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
                      key={`depreciation_rate-${isEditing}`}
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

              </form>
            </div>
          </div>
        </div>
      </div>
      
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
