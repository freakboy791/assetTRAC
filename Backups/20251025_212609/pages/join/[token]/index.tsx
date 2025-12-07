import { useState, useEffect, useRef } from 'react'
import { Invitation } from '../../../types'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function JoinPage() {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Debug: Log when component mounts
  console.log('JoinPage mounted - URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        // Get token from URL
        const token = window.location.pathname.split('/').pop()
        
        if (!token) {
          setError('Invalid invitation link')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/invite/validate?token=${token}`)
        
        if (!response.ok) {
          setError('Failed to validate invitation')
          setLoading(false)
          return
        }

        const data = await response.json()
        
        if (data.invitation) {
          setInvitation(data.invitation)
          setEmail(data.invitation.invited_email)
        } else {
          setError('Invalid invitation')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching invitation:', error)
        setError('Failed to load invitation')
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      // For owners, accept invitation first, then redirect to company setup
      if (invitation && invitation.role === 'owner') {
        setMessage('Accepting invitation and redirecting to company setup...')
        
        // Accept the invitation first
        const response = await fetch('/api/invite/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: window.location.pathname.split('/').pop(),
            password: password,
          }),
        })

        const data = await response.json()
        console.log('Invitation acceptance response:', data)

        if (response.ok) {
          // Store invitation data in session storage for company setup
          const invitationData = {
            email: invitation.invited_email,
            companyName: invitation.company_name,
            role: invitation.role,
            token: window.location.pathname.split('/').pop(),
            password: password // Store password for later use
          }
          
          console.log('Join page: Storing invitation data:', invitationData)
          sessionStorage.setItem('invitationData', JSON.stringify(invitationData))
          
          // Verify it was stored
          const storedData = sessionStorage.getItem('invitationData')
          console.log('Join page: Verification - stored data:', storedData)
          
          // Redirect to company setup for owners
          setTimeout(() => {
            console.log('Join page: Redirecting to company creation page...')
            window.location.href = '/company/create'
          }, 2000)
        } else {
          setMessage(data.message || 'Failed to accept invitation')
        }
      } else {
        // For non-owners, use the original flow
        const response = await fetch('/api/invite/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: window.location.pathname.split('/').pop(),
            password: password,
          }),
        })

        const data = await response.json()
        console.log('Invitation acceptance response:', data)

        if (response.ok) {
          setMessage('Account created successfully! Redirecting to dashboard...')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 2000)
        } else {
          console.error('Account creation failed:', data.message)
          setMessage(data.message || 'Failed to create account')
        }
      }
    } catch (error) {
      console.error('Error processing invitation:', error)
      setMessage('Failed to process invitation. Please try again.')
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to home
          </Link>
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
          <p className="mt-2 text-sm text-gray-600">Asset Tracking & Management</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="mb-6">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Complete Your Registration
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome to assetTRAC!<br />
              You've been invited by {invitation?.company_name}<br />
              Please enter a new password to complete your account.
            </p>
          </div>
        
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                  className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    email 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : ''
                  }`}
                  placeholder="Email address"
                  value={email || ''}
                  readOnly={!!email}
                  disabled={!!email}
                />
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

            <div className="space-y-3">
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
                <div dangerouslySetInnerHTML={{ __html: message }} />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}