import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

export default function CreateCompanyPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [hasCompany, setHasCompany] = useState(false)

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          window.location.href = '/'
          return
        }

        setUser(user)

        // Check if user is owner
        const { data: userRoleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .single()

        if (userRoleData && userRoleData.role === 'owner') {
          setIsOwner(true)
          
          // Check if owner already has a company
          const { data: companyData } = await supabase
            .from('company_users')
            .select('company_id, companies(*)')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single()

          if (companyData) {
            setHasCompany(true)
            setMessage('You already have a company set up. Redirecting to dashboard...')
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 2000)
          } else {
            // Check if user has admin approval
            const { data: inviteData, error: inviteError } = await supabase
              .from('invites')
              .select('company_name, invited_email, status, admin_approved_at')
              .eq('invited_email', user.email)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (inviteData) {
              // Check if email activation is required and not done
              if (inviteData.status === 'pending') {
                setMessage('You must first activate your account by clicking the activation link in your email before you can create a company.')
                setLoading(false)
                return
              }

              // Check if admin approval is required and not given
              if (inviteData.status === 'email_confirmed' && !inviteData.admin_approved_at) {
                setMessage('Your account is waiting for admin approval. You cannot create a company until an administrator approves your invitation.')
                setLoading(false)
                return
              }

              // Check if both email activation and admin approval are complete
              if (inviteData.status === 'admin_approved' || inviteData.admin_approved_at || inviteData.status === 'completed') {
                setFormData(prev => ({
                  ...prev,
                  name: inviteData.company_name || '',
                  email: inviteData.invited_email || ''
                }))
              } else {
                setMessage('Your invitation is not ready for company creation. Please ensure you have activated your account and received admin approval.')
                setLoading(false)
                return
              }
            }
          }
        } else {
          // Not an owner, redirect to dashboard
          window.location.href = '/dashboard'
        }
      } catch (error) {
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setMessage('Company name is required')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      // Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: formData.name.trim(),
          depreciation_rate: formData.depreciation_rate ? parseFloat(formData.depreciation_rate) : null,
          street: formData.street.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip: formData.zip.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          note: formData.note.trim() || null
        }])
        .select()
        .single()

      if (companyError) {
        throw companyError
      }

      // Add user as owner of the company
      const { error: userCompanyError } = await supabase
        .from('company_users')
        .insert([{
          company_id: companyData.id,
          user_id: user.id,
          role: 'owner'
        }])

      if (userCompanyError) {
        throw userCompanyError
      }

      // Update invitation status to completed (only after admin approval)
      const { data: inviteData } = await supabase
        .from('invites')
        .select('*')
        .eq('invited_email', user.email)
        .or('status.eq.admin_approved,admin_approved_at.not.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (inviteData) {
        await supabase
          .from('invites')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            accepted: true,
            used: true
          })
          .eq('id', inviteData.id)
      }

      setMessage('Company created successfully! Redirecting to dashboard...')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)

    } catch (error) {
      setMessage(`Error creating company: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Company Already Set Up</h1>
          <p className="mt-2 text-gray-600">{message}</p>
        </div>
      </div>
    )
  }

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
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
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

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Create Your Company
              </h2>
              <p className="text-lg text-gray-600">
                Set up your company profile to start managing assets
              </p>
            </div>

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
                  value={formData.name}
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
                  value={formData.depreciation_rate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., 10.5"
                />
              </div>

              {/* Address Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.street}
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
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="New York"
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
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="NY"
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
                    value={formData.zip}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="10001"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                    placeholder="contact@company.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">This email is set from your invitation</p>
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
                  value={formData.note}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Any additional information about your company..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating Company...' : 'Create Company'}
                </button>
              </div>
            </form>

            {/* Message */}
            {message && (
              <div className={`mt-6 p-4 rounded-md text-sm ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
