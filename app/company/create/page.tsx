'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function CreateCompanyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()

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

  const checkForInvitationData = useCallback(() => {
    // Check if we have invitation data in localStorage (from the invite acceptance flow)
    try {
      const invitationData = localStorage.getItem('invitationData')
      if (invitationData) {
        const parsed = JSON.parse(invitationData)
        setCompanyData(prev => ({
          ...prev,
          name: parsed.company_name || '',
          email: parsed.invited_email || ''
        }))
        // Clear the data after using it
        localStorage.removeItem('invitationData')
      }
    } catch (error) {
      console.log('No invitation data found or error parsing:', error)
    }
  }, [])

  const checkAuth = useCallback(async () => {
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
        return
      }

      setUser(currentUser)

      // Pre-fill the email field with the user's email if not already set
      setCompanyData(prev => ({ 
        ...prev, 
        email: prev.email || currentUser.email || '' 
      }))

      // Check user role FIRST before checking company
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single()

      console.log('User role check:', { userRoleData, roleError, currentUser: currentUser.id })

      if (roleError || !userRoleData) {
        // No role found - assume owner (first time user)
        console.log('No role found, assuming owner')
        setUserRole('owner')
      } else if (userRoleData.role === 'admin') {
        // Admin users cannot create companies - redirect to admin dashboard
        console.log('Admin user detected, redirecting to dashboard')
        router.push('/dashboard')
        return
      } else {
        // Set the user's role
        console.log('User role set to:', userRoleData.role)
        setUserRole(userRoleData.role)
      }

      // Only check for existing company if user is not admin
      if (userRoleData && userRoleData.role !== 'admin') {
        const { data: existingCompany, error: companyError } = await supabase
          .from('company_users')
          .select('*')
          .eq('user_id', currentUser.id)

        if (companyError) {
          console.error('Error checking existing company:', companyError)
          return
        }

        if (existingCompany && existingCompany.length > 0) {
          // User already has a company, redirect to dashboard
          router.push('/dashboard')
          return
        }
      }

    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    checkAuth()
    checkForInvitationData()
  }, [checkAuth, checkForInvitationData])

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

    // Only owners can create companies
    if (userRole !== 'owner') {
      setMessage('Only company owners can create companies')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Insert company into companies table
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name.trim(),
          depreciation_rate: companyData.depreciation_rate ? parseFloat(companyData.depreciation_rate) : null,
          street: companyData.street.trim() || null,
          city: companyData.city.trim() || null,
          state: companyData.state.trim() || null,
          zip: companyData.zip.trim() || null,
          phone: companyData.phone.trim() || null,
          email: companyData.email.trim() || null,
          note: companyData.note.trim() || null
        }])
        .select()
        .single()

      if (companyError) {
        setMessage(`Error creating company: ${companyError.message}`)
        return
      }

      // Create user-company association with owner role
      const { error: associationError } = await supabase
        .from('company_users')
        .insert([{
          user_id: user!.id, // user is guaranteed to exist here due to checkAuth
          company_id: company.id,
          role: 'owner' // Default role for company creator
        }])

      if (associationError) {
        setMessage(`Error creating user-company association: ${associationError.message}`)
        return
      }

      // Success - redirect to dashboard
      setMessage('Company created successfully! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Error creating company:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null // Will redirect to login
  }

  // Show error message if user cannot create company
  if (userRole === 'admin') {
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
            <p className="mt-2 text-sm text-gray-600">Admin users cannot create companies</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-6">You are logged in as an admin user. Admin users cannot create companies.</p>
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
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Create Your Company</h2>
          <p className="mt-2 text-sm text-gray-600">Set up your company profile to get started</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name - Required */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name * {companyData.name && <span className="text-xs text-gray-500">(from invitation)</span>}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={companyData.name}
                onChange={handleInputChange}
                readOnly={!!companyData.name}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  companyData.name ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder={companyData.name ? companyData.name : "Enter company name from your invitation"}
              />
              {companyData.name ? (
                <p className="mt-1 text-xs text-gray-500">Company name pre-filled from your invitation</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">This should match the company name from your invitation</p>
              )}
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
                  Email {companyData.email && <span className="text-xs text-gray-500">(from invitation)</span>}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={companyData.email}
                  readOnly={!!companyData.email}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    companyData.email ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
                  }`}
                  placeholder={companyData.email || "company@example.com"}
                />
                {companyData.email ? (
                  <p className="mt-1 text-xs text-gray-500">This email is pre-filled from your invitation and cannot be changed</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">Enter the company email address</p>
                )}
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
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Company'}
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

