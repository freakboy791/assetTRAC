'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Company } from '@/types'

export default function UpdateCompanyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  // Form fields
  const [companyData, setCompanyData] = useState({
    name: '',
    depreciation_rate: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    note: ''
  })

  const loadCompanyData = useCallback(async () => {
    try {
      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        setMessage(`Error loading company: ${companyError.message}`)
        return
      }

      if (!company) {
        setMessage('Company not found')
        return
      }

      setCompany(company)

      // Pre-fill form with existing data
      setCompanyData({
        name: company.name || '',
        depreciation_rate: company.depreciation_rate?.toString() || '',
        street: company.street || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        phone: company.phone || '',
        email: company.email || '',
        note: company.note || ''
      })
    } catch (error) {
      console.error('Error loading company:', error)
      setMessage('An unexpected error occurred while loading company data')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const checkAuthAndLoadCompany = useCallback(async () => {
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

      // Check user's role for this company
      const { data: companyUser, error: companyUserError } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('company_id', companyId)
        .single()

      if (companyUserError || !companyUser) {
        setMessage('You do not have access to this company')
        return
      }

      // Only owners can update company information
      if (companyUser.role !== 'owner') {
        setMessage('Only company owners can update company information')
        return
      }

      setUserRole(companyUser.role)

      // Load company data
      await loadCompanyData()
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    }
  }, [companyId, router, loadCompanyData])



  useEffect(() => {
    checkAuthAndLoadCompany()
  }, [companyId, checkAuthAndLoadCompany])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!companyData.name.trim()) {
      setMessage('Company name is required')
      return
    }

    // Double-check that user is owner
    if (userRole !== 'owner') {
      setMessage('Only company owners can update company information')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      // Update company in database
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name: companyData.name.trim(),
          depreciation_rate: companyData.depreciation_rate ? parseFloat(companyData.depreciation_rate) : null,
          street: companyData.street.trim() || null,
          city: companyData.city.trim() || null,
          state: companyData.state.trim() || null,
          zip: companyData.zip.trim() || null,
          phone: companyData.phone.trim() || null,
          email: companyData.email.trim() || null,
          note: companyData.note.trim() || null
        })
        .eq('id', companyId)

      if (updateError) {
        setMessage(`Error updating company: ${updateError.message}`)
        return
      }

      // Success - redirect to dashboard
      setMessage('Company updated successfully! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Error updating company:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading company data...</p>
        </div>
      </div>
    )
  }

  if (!user || !company) {
    return null // Will redirect to login or show error
  }

  // Show error message if user cannot update company
  if (userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">AT</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              assetTRAC
            </h1>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-600">Only company owners can update company information</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-6">You do not have permission to update company information. Only company owners can make changes.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">AT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            assetTRAC
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Update Company</h2>
          <p className="mt-2 text-sm text-gray-600">Edit your company profile information</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name - Required */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={companyData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter company name"
              />
            </div>

            {/* Depreciation Rate */}
            <div>
              <label htmlFor="depreciation_rate" className="block text-sm font-medium text-gray-700 mb-2">
                Depreciation Rate (%)
              </label>
              <input
                type="number"
                id="depreciation_rate"
                name="depreciation_rate"
                step="0.01"
                min="0"
                max="100"
                value={companyData.depreciation_rate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 15.5"
              />
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={companyData.street}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={companyData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={companyData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={companyData.zip}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="12345"
                />
              </div>
            </div>

            {/* Contact Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={companyData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={companyData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="company@example.com"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                value={companyData.note}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Additional notes about your company..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Company'}
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('Error') || message.includes('error')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
