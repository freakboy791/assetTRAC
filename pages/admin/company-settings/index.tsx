import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CompanySettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
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
        const { supabase: getSupabaseClient } = await import('../../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          window.location.href = '/'
          return
        }

        setUser(session.user)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/company/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyData }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Company updated successfully!')
        setCompany(data.company)
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
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your company information and settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </Link>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
              <p className="mt-1 text-sm text-gray-500">Update your company details and settings</p>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
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
                    type="text"
                    name="name"
                    id="name"
                    value={companyData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

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
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

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
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  id="street"
                  value={companyData.street}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={companyData.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    value={companyData.state}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="zip"
                    id="zip"
                    value={companyData.zip}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => window.location.href = '/dashboard'}
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
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}