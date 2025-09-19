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
          console.log('Invitation data received:', data.invitation)
          setInvitation(data.invitation)
          
          const invitedEmail = data.invitation.invited_email || data.invitation.email
          console.log('Extracted email:', invitedEmail)
          
          if (invitedEmail) {
            console.log('Setting email to:', invitedEmail)
            setEmail(invitedEmail)
            
            // Force set the input value immediately
            setTimeout(() => {
              if (emailInputRef.current) {
                console.log('Force setting input value to:', invitedEmail)
                emailInputRef.current.value = invitedEmail
                emailInputRef.current.setAttribute('value', invitedEmail)
              }
            }, 100)
          } else {
            console.log('No email found in invitation data')
          }
        } else {
          console.log('No invitation data in response')
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

  // Debug email state changes and force input value
  useEffect(() => {
    console.log('Email state changed to:', email)
    if (email && emailInputRef.current) {
      console.log('Setting input value to:', email)
      emailInputRef.current.value = email
    }
  }, [email])

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
        setMessage('Account created successfully! Signing you in...')
        
        // Sign in the user with the credentials they just created
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          })

          if (signInError) {
            console.error('Sign in error:', signInError)
            setMessage('Account created but sign in failed. Please try logging in manually.')
            return
          }

          console.log('User signed in successfully:', signInData.user?.email)
          
          // Store role information in session storage
          if (data.userRoles) {
            sessionStorage.setItem('userRoles', JSON.stringify(data.userRoles))
          }
          if (data.isAdmin !== undefined) {
            sessionStorage.setItem('isAdmin', data.isAdmin.toString())
          }
          if (data.isOwner !== undefined) {
            sessionStorage.setItem('isOwner', data.isOwner.toString())
          }
          if (data.hasCompany !== undefined) {
            sessionStorage.setItem('hasCompany', data.hasCompany.toString())
          }

          console.log('Role data stored:', {
            userRoles: data.userRoles,
            isAdmin: data.isAdmin,
            isOwner: data.isOwner,
            hasCompany: data.hasCompany
          })

          // Redirect based on role
          console.log('About to redirect...')
          
          if (data.isOwner === true) {
            console.log('Redirecting to company creation page...')
            window.location.href = '/company/create'
          } else {
            console.log('Redirecting to dashboard...')
            window.location.href = '/dashboard'
          }
        } catch (signInError) {
          console.error('Sign in error:', signInError)
          setMessage('Account created but sign in failed. Please try logging in manually.')
        }
      } else {
        console.error('Account creation failed:', data.message)
        setMessage(data.message || 'Failed to create account')
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setMessage('Failed to create account. Please try again.')
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
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You've been invited to join {invitation?.company_name}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Debug Panel */}
            {email && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Debug:</strong> Email loaded: {email}
                </p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                ref={emailInputRef}
                key={`email-${email}-${Date.now()}`}
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
              />
              {email && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Email pre-populated: {email}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}