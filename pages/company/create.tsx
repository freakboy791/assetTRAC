import { useState, useEffect } from 'react'
import Link from 'next/link'

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

export default function CreateCompanyPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [companyName, setCompanyName] = useState('')
  const [companyStreet, setCompanyStreet] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [depreciationRate, setDepreciationRate] = useState(7.5)
  const [hasCompany, setHasCompany] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [stateError, setStateError] = useState('')
  const [zipError, setZipError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')

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

  const handleStateChange = (value: string) => {
    setCompanyState(value.toUpperCase())
    validateState(value.toUpperCase())
  }

  const handleZipChange = (value: string) => {
    // Only allow digits, limit to 5 digits
    const digitsOnly = value.replace(/\D/g, '')
    const limitedDigits = digitsOnly.slice(0, 5)
    setCompanyZip(limitedDigits)
    validateZipCode(limitedDigits)
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

  const validateName = (name: string, fieldName: string) => {
    if (!name.trim()) {
      return `${fieldName} is required`
    }
    if (name.trim().length < 2) {
      return `${fieldName} must be at least 2 characters long`
    }
    if (name.trim().length > 50) {
      return `${fieldName} must be less than 50 characters long`
    }
    return ''
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
    
    setCompanyPhone(formatted)
    validatePhoneNumber(formatted)
  }

  const handleFirstNameChange = (value: string) => {
    setFirstName(value)
    const error = validateName(value, 'First name')
    setFirstNameError(error)
  }

  const handleLastNameChange = (value: string) => {
    setLastName(value)
    const error = validateName(value, 'Last name')
    setLastNameError(error)
  }

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
        
        // Check if user has invitation metadata
        const invitationData = session.user.user_metadata
        console.log('User metadata:', invitationData)
        
        if (invitationData?.company_name) {
          console.log('Setting company name from metadata:', invitationData.company_name)
          setCompanyName(invitationData.company_name)
        }
        if (invitationData?.invited_email) {
          console.log('Setting company email from metadata:', invitationData.invited_email)
          setCompanyEmail(invitationData.invited_email)
        } else {
          console.log('No invited_email found in metadata, using user email:', session.user.email)
          setCompanyEmail(session.user.email)
        }

        // For now, set default values since we don't have the other APIs yet
        setUserRoles(['owner']) // Assume owner for company creation
        setIsOwner(true)
        setHasCompany(false) // This is a create company page, so assume no company yet

        setLoading(false)
      } catch (error) {
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!companyName.trim()) {
      setMessage('Company name is required')
      return
    }

    // Validate all required fields
    const isStateValid = validateState(companyState)
    const isZipValid = validateZipCode(companyZip)
    const isPhoneValid = validatePhoneNumber(companyPhone)
    const firstNameErrorMsg = validateName(firstName, 'First name')
    const lastNameErrorMsg = validateName(lastName, 'Last name')
    
    setFirstNameError(firstNameErrorMsg)
    setLastNameError(lastNameErrorMsg)
    
    if (!isStateValid || !isZipValid || !isPhoneValid || firstNameErrorMsg || lastNameErrorMsg) {
      setMessage('Please fix the validation errors below')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      // Get the user's access token for authentication
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setMessage('Error: No valid session found. Please log in again.')
        return
      }

      const response = await fetch('/api/company/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: companyName,
          street: companyStreet,
          city: companyCity,
          state: companyState,
          zip: companyZip,
          phone: companyPhone,
          email: companyEmail,
          depreciation_rate: depreciationRate,
          first_name: firstName,
          last_name: lastName
        })
      })

      const result = await response.json()
      console.log('Company creation response:', { status: response.status, result })

      if (response.ok) {
        setMessage('Company created successfully! Checking admin approval...')
        console.log('Company created successfully, checking admin approval...')
        
        // Update session storage to reflect that user now has a company
        sessionStorage.setItem('hasCompany', 'true')
        console.log('Updated hasCompany flag in session storage')
        
        // Check if user is approved by admin
        try {
          const approvalResponse = await fetch('/api/auth/getUser', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          const approvalData = await approvalResponse.json()
          console.log('Admin approval check result:', approvalData)
          
          if (approvalData.isApproved || approvalData.isAdmin) {
            setMessage('Company created successfully! Redirecting to dashboard...')
            setTimeout(() => {
              console.log('User approved or admin, redirecting to dashboard...')
              window.location.href = '/dashboard'
            }, 2000)
          } else {
            setMessage('Company created successfully! However, your account is waiting for admin approval. You will be redirected to login.')
            setTimeout(async () => {
              console.log('User not approved, signing out and redirecting to login...')
              // Sign out the user from Supabase
              try {
                const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
                const supabase = getSupabaseClient()
                await supabase.auth.signOut()
              } catch (error) {
                console.error('Error signing out:', error)
              }
              
              // Clear all storage
              sessionStorage.clear()
              localStorage.clear()
              
              // Redirect to login
              window.location.href = '/auth?message=Your account is waiting for admin approval. Please contact your administrator to approve your account.'
            }, 3000)
          }
        } catch (approvalError) {
          console.error('Error checking admin approval:', approvalError)
          // If we can't check approval, assume not approved for safety
          setMessage('Company created successfully! However, your account is waiting for admin approval. You will be redirected to login.')
          setTimeout(async () => {
            console.log('Approval check failed, signing out and redirecting to login...')
            // Sign out the user from Supabase
            try {
              const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
              const supabase = getSupabaseClient()
              await supabase.auth.signOut()
            } catch (error) {
              console.error('Error signing out:', error)
            }
            
            // Clear all storage
            sessionStorage.clear()
            localStorage.clear()
            
            // Redirect to login
            window.location.href = '/auth?message=Your account is waiting for admin approval. Please contact your administrator to approve your account.'
          }, 3000)
        }
      } else {
        console.error('Company creation failed:', result)
        setMessage(`Error: ${result.message || result.error || 'Failed to create company'}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setSubmitting(false)
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

  if (hasCompany) {
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
                    <span className="ml-4 text-sm font-medium text-gray-500">Create Company</span>
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
                  <h2 className="text-lg font-medium text-gray-900">Company Already Exists</h2>
                </div>
                <div className="px-6 py-6">
                  <p className="text-gray-600 mb-4">{message}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Go to Dashboard
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow">
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
                className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-red-700 transition-colors"
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
                  <span className="ml-4 text-sm font-medium text-gray-500">Create Company</span>
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
                <h2 className="text-lg font-medium text-gray-900">Create Company</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Set up your company profile to get started with assetTRAC
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      user?.user_metadata?.company_name ? 'bg-green-50 border-green-300 cursor-not-allowed' : ''
                    }`}
                    placeholder="Your Company Name"
                    required
                    readOnly={!!user?.user_metadata?.company_name}
                    disabled={!!user?.user_metadata?.company_name}
                  />
                </div>

                {/* Personal Information Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Personal Information
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-600">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                          firstNameError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="John"
                        required
                      />
                      {firstNameError && (
                        <p className="mt-1 text-sm text-red-600">{firstNameError}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-600">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                          lastNameError ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Doe"
                        required
                      />
                      {lastNameError && (
                        <p className="mt-1 text-sm text-red-600">{lastNameError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Address
                  </label>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="companyStreet" className="block text-sm font-medium text-gray-600">
                        Street Address
                      </label>
                      <input
                        type="text"
                        id="companyStreet"
                        value={companyStreet}
                        onChange={(e) => setCompanyStreet(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="companyCity" className="block text-sm font-medium text-gray-600">
                          City
                        </label>
                        <input
                          type="text"
                          id="companyCity"
                          value={companyCity}
                          onChange={(e) => setCompanyCity(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
                          placeholder="New York"
                        />
                      </div>

                      <div>
                        <label htmlFor="companyState" className="block text-sm font-medium text-gray-600">
                          State *
                        </label>
                        <select
                          id="companyState"
                          value={companyState}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            stateError ? 'border-red-300' : 'border-gray-300'
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
                        <label htmlFor="companyZip" className="block text-sm font-medium text-gray-600">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          id="companyZip"
                          value={companyZip}
                          onChange={(e) => handleZipChange(e.target.value)}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            zipError ? 'border-red-300' : 'border-gray-300'
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      id="companyPhone"
                      value={companyPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        phoneError ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                    {phoneError && (
                      <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      id="companyEmail"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        user?.user_metadata?.invited_email ? 'bg-green-50 border-green-300 cursor-not-allowed' : ''
                      }`}
                      placeholder="contact@yourcompany.com"
                      readOnly={!!user?.user_metadata?.invited_email}
                      disabled={!!user?.user_metadata?.invited_email}
                    />
                  </div>

                  <div>
                    <label htmlFor="depreciationRate" className="block text-sm font-medium text-gray-700">
                      Depreciation Rate (%)
                    </label>
                    <input
                      type="number"
                      id="depreciationRate"
                      value={depreciationRate}
                      onChange={(e) => setDepreciationRate(parseFloat(e.target.value) || 0)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="7.5"
                    />
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-md ${
                    message.includes('Error') || message.includes('error')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}