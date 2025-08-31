'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'

interface Invitation {
  id: string
  invited_email: string
  company_name: string
  message: string
  expires_at: string
}

export default function AcceptInvitationPage() {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'loading' | 'invitation' | 'signup' | 'company' | 'success'>('loading')
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
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
  const [message, setMessage] = useState('')
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const validateInvitation = useCallback(async () => {
    try {
      // Fetch invitation details
      const { data: invitationData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single()

      if (inviteError || !invitationData) {
        setError('Invalid or expired invitation')
        setStep('loading')
        return
      }

      // Check if invitation is expired
      if (new Date(invitationData.expires_at) < new Date()) {
        setError('This invitation has expired')
        setStep('loading')
        return
      }

      setInvitation(invitationData)
      setSignupData(prev => ({ ...prev, email: invitationData.invited_email }))
      setCompanyData(prev => ({ ...prev, name: invitationData.company_name }))
      
      // Store invitation data in localStorage for potential use in company creation page
      localStorage.setItem('invitationData', JSON.stringify({
        company_name: invitationData.company_name,
        invited_email: invitationData.invited_email,
        message: invitationData.message
      }))
      
      setStep('invitation')
    } catch (error) {
      console.error('Error validating invitation:', error)
      setError('An error occurred while validating the invitation')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    validateInvitation()
  }, [token, validateInvitation])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signupData.password !== signupData.confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (signupData.password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email: signupData.email,
        password: signupData.password
      })

      if (existingUser.user) {
        // User already exists - sign them in and proceed to company creation
        console.log('Existing user signed in:', existingUser.user.email)
        
        // Mark invitation as used
        await supabase
          .from('invites')
          .update({ used: true })
          .eq('token', token)

        setStep('company')
        return
      }

      // User doesn't exist - create new account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password
      })

      if (authError) {
        setMessage(`Error creating account: ${authError.message}`)
        return
      }

      if (authData.user) {
        // Mark invitation as used
        await supabase
          .from('invites')
          .update({ used: true })
          .eq('token', token)

        setStep('company')
      }
    } catch (error) {
      console.error('Error during signup:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!companyData.name.trim()) {
      setMessage('Company name is required')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('User not authenticated')
        return
      }

      // Check if user already has a company
      const { data: existingCompany, error: companyCheckError } = await supabase
        .from('company_users')
        .select('*')
        .eq('user_id', user.id)

      if (companyCheckError) {
        console.error('Error checking existing company:', companyCheckError)
      }

      let companyId: string

      if (existingCompany && existingCompany.length > 0) {
        // User already has a company - use the existing one
        companyId = existingCompany[0].company_id
        console.log('User already has company, using existing:', companyId)
      } else {
        // Create new company
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

        companyId = company.id
      }

      // Check if user-company association already exists
      const { data: existingAssociation, error: associationCheckError } = await supabase
        .from('company_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)

      if (associationCheckError) {
        console.error('Error checking existing association:', associationCheckError)
      }

      if (!existingAssociation || existingAssociation.length === 0) {
        // Create user-company association with owner role
        const { error: associationError } = await supabase
          .from('company_users')
          .insert([{
            user_id: user.id,
            company_id: companyId,
            role: 'owner'
          }])

        if (associationError) {
          setMessage(`Error creating user-company association: ${associationError.message}`)
          return
        }
      } else {
        // Association already exists - update role to owner if needed
        if (existingAssociation[0].role !== 'owner') {
          const { error: updateError } = await supabase
            .from('company_users')
            .update({ role: 'owner' })
            .eq('user_id', user.id)
            .eq('company_id', companyId)

          if (updateError) {
            console.error('Error updating role to owner:', updateError)
          }
        }
      }

      // Success - show success message and redirect
      setStep('success')
      setMessage('Company setup completed successfully! Redirecting to dashboard...')
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (error) {
      console.error('Error during company setup:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name in signupData) {
      setSignupData(prev => ({ ...prev, [name]: value }))
    } else {
      setCompanyData(prev => ({ ...prev, [name]: value }))
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Invitation Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-6">Please contact the administrator for a new invitation.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'invitation') {
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Welcome to assetTRAC!</h2>
            <p className="mt-2 text-sm text-gray-600">You&apos;ve been invited to join {invitation?.company_name}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Details</h3>
              <div className="bg-gray-50 rounded-md p-4 space-y-2">
                <p><span className="font-medium">Company:</span> {invitation?.company_name}</p>
                <p><span className="font-medium">Email:</span> {invitation?.invited_email}</p>
                {invitation?.message && (
                  <p><span className="font-medium">Message:</span> {invitation.message}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep('signup')}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
            >
              Accept Invitation & Create Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'signup') {
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Create Your Account</h2>
            <p className="mt-2 text-sm text-gray-600">Set up your account to get started with {invitation?.company_name}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 sm:p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={signupData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">Email address is pre-filled from your invitation</p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={signupData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Create a password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={signupData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

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

  if (step === 'company') {
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Set Up Your Company</h2>
            <p className="mt-2 text-sm text-gray-600">Complete your company profile to get started</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 sm:p-8">
            <form onSubmit={handleCompanyCreate} className="space-y-6">
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
                    Company Email
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Company...' : 'Create Company'}
              </button>

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

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Welcome to assetTRAC!</h1>
            <p className="mt-2 text-sm text-gray-600">Your account and company have been created successfully</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center">
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
