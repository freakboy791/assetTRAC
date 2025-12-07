import { useState, useEffect } from 'react'
import { Invitation } from '../../../../types'
import Link from 'next/link'
import { triggerInviteRefresh } from '../../../../lib/adminRefresh'

export default function InviteAcceptPage() {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // Debug: Log when component mounts
  console.log('AcceptInvitationPage mounted')

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        // Get token from URL
        const token = window.location.pathname.split('/').pop()
        
        console.log('Current URL:', window.location.href)
        console.log('Token from URL:', token)
        console.log('URL pathname:', window.location.pathname)
        
        if (!token) {
          setError('Invalid invitation link')
          setLoading(false)
          return
        }

        // Fetch invitation details via API
        const response = await fetch(`/api/invite/validate?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.message || 'Invalid invitation')
          setLoading(false)
          return
        }

        console.log('Invitation data received:', data.invitation)
        setInvitation(data.invitation)
        
        // Try both possible email field names
        const invitedEmail = data.invitation.invited_email || data.invitation.email
        console.log('Setting email to:', invitedEmail)
        console.log('Available email fields:', {
          invited_email: data.invitation.invited_email,
          email: data.invitation.email
        })
        
        if (invitedEmail) {
          setEmail(invitedEmail)
          console.log('Email state after setEmail:', invitedEmail)
        } else {
          console.error('No email found in invitation data')
        }
        setLoading(false)
      } catch (error) {
        setError('Failed to load invitation')
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [])

  // Debug email state changes
  useEffect(() => {
    console.log('Email state changed to:', email)
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const token = window.location.pathname.split('/').pop()
      
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Account created successfully! Redirecting...')
        
        // Trigger admin dashboard refresh for invite acceptance (client-side only)
        if (typeof window !== 'undefined') {
          triggerInviteRefresh.accepted()
        }
        
        // Store role information in session storage for dashboard use
        if (result.userRoles) {
          sessionStorage.setItem('userRoles', JSON.stringify(result.userRoles))
        }
        if (result.isAdmin !== undefined) {
          sessionStorage.setItem('isAdmin', result.isAdmin.toString())
        }
        if (result.isOwner !== undefined) {
          sessionStorage.setItem('isOwner', result.isOwner.toString())
        }
        if (result.hasCompany !== undefined) {
          sessionStorage.setItem('hasCompany', result.hasCompany.toString())
        }
        
        setTimeout(() => {
          // Check user role and redirect accordingly
          if (invitation?.role === 'owner') {
            window.location.href = '/company/create'
          } else {
            window.location.href = '/dashboard'
          }
        }, 2000)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  console.log('Current email state:', email)
  console.log('Current invitation state:', invitation)

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Invalid Invitation</h1>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6">
              <Link
                href="/"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">AT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            assetTRAC
          </h1>
          <p className="mt-2 text-sm text-gray-600">Complete Your Account Setup</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="mb-6">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Welcome to {invitation.company_name}!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You've been invited to join {invitation.company_name} on assetTRAC. 
              Please set up your password to complete your account.
            </p>
            {invitation.message && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Message from {invitation.created_by}:</strong><br />
                  {invitation.message}
                </p>
              </div>
            )}
          </div>
        
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-gray-100 cursor-not-allowed"
                  placeholder={email ? email : "Loading email..."}
                  value={email || ''}
                  readOnly
                  disabled
                  key={email} // Force re-render when email changes
                />
                {email && (
                  <p className="mt-1 text-xs text-gray-500">
                    Email from invitation (read-only): {email}
                  </p>
                )}
                {!email && !loading && (
                  <p className="mt-1 text-xs text-red-500">
                    No email loaded from invitation
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('error') || message.includes('Error')
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