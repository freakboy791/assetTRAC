import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CompanyManagePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [company, setCompany] = useState<any>(null)
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
        
        // Get role information from session storage
        const storedIsOwner = sessionStorage.getItem('isOwner')
        const isOwnerRole = storedIsOwner === 'true'
        setIsOwner(isOwnerRole)
        
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
      const response = await fetch('/api/company/get')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isOwner) {
      setMessage('Only company owners can update company information')
      return
    }

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
      } else {
        setMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex mb-2" aria-label="Breadcrumb">
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
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-gray-700 transition-colors self-start w-fit"
              >
                Back to Dashboard
              </button>
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
              </div>
              <button
                onClick={() => window.location.href = '/dashboard'}
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

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-4 text-sm font-medium text-gray-500">Company Information</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  {isOwner ? 'Manage Company Information' : 'Company Information'}
                </h1>
                <p className="mt-2 text-gray-600">
                  {isOwner 
                    ? 'Update your company details and settings' 
                    : 'View your company information'
                  }
                </p>
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
                    disabled={!isOwner}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                      isOwner 
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
                        disabled={!isOwner}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                          isOwner 
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
                          disabled={!isOwner}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isOwner 
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
                          disabled={!isOwner}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isOwner 
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
                          disabled={!isOwner}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                            isOwner 
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
                      disabled={!isOwner}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isOwner 
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
                      disabled={!isOwner}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-800 ${
                        isOwner 
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
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Set the default depreciation rate for company assets
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                  
                  {isOwner && (
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
