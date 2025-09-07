'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFromInvitation, setIsFromInvitation] = useState(false)
  const router = useRouter()

  // Utility function to clear auth data
  const clearAuthData = () => {
    if (typeof window !== 'undefined') {
      try {
        // Clear all Supabase-related storage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.')) {
            localStorage.removeItem(key)
          }
        })
        
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('supabase.auth.')) {
            sessionStorage.removeItem(key)
          }
        })
        
        console.log('Auth data cleared')
      } catch (error) {
        console.error('Error clearing auth data:', error)
      }
    }
  }

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.log('Auth check error:', error)
          // Only sign out if there's a specific error that requires it
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token Not Found')) {
            await supabase.auth.signOut()
          }
          return
        }
        
        if (user) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.log('Unexpected auth check error:', error)
      }
    }
    checkUser()
  }, [router])

  // Handle email confirmation redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        setMessage('Email confirmed successfully! You can now log in.')
      }
    }
  }, [])

  // Handle invitation redirect with pre-filled email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const invitationEmail = urlParams.get('email')
      const invitationToken = urlParams.get('token')
      
      if (invitationEmail && invitationToken) {
        setEmail(invitationEmail)
        setIsFromInvitation(true)
        setMessage('Please enter your password to complete your account setup.')
        
        // Focus on password field since email is pre-filled
        setTimeout(() => {
          const passwordInput = document.getElementById('password-input')
          if (passwordInput) {
            passwordInput.focus()
          }
        }, 100)
      }
    }
  }, [])

  const handleLogIn = async () => {
    if (!email || !password) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // First check if a user with this email exists in profiles table
      let userExists = false
      let pendingInvitation = null
      let invitationStatus = null
      
      try {
        // Check profiles table
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        userExists = !profileError && !!existingProfile
        console.log('Profile check result:', { userExists, profileError })
        
        // If no profile exists, check for pending invitations
        if (!userExists) {
          try {
            const { data: invitation, error: inviteError } = await supabase
              .from('invites')
              .select('*')
              .eq('invited_email', email)
              .eq('used', false)
              .maybeSingle()
            
            if (!inviteError && invitation) {
              pendingInvitation = invitation
              if (invitation.accepted) {
                invitationStatus = 'approved'
              } else if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
                invitationStatus = 'expired'
              } else {
                invitationStatus = 'pending'
              }
              console.log('Invitation found:', { invitation, invitationStatus })
            } else {
              console.log('No invitation found or error:', { inviteError })
            }
          } catch (inviteCheckError) {
            console.log('Error checking invitations:', inviteCheckError)
            // Continue without invitation check
          }
        }
      } catch (profileCheckError) {
        console.error('Error checking profile:', profileCheckError)
        // If we can't check profile, assume user doesn't exist for security
        userExists = false
      }

      // Attempt login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error && error.message) {
        // Log error details for debugging but don't expose to user
        console.log('Login attempt failed for:', email)
        
        // Handle refresh token errors specifically
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
          console.log('Refresh token error detected, clearing session...')
          try {
            await supabase.auth.signOut()
            setMessage('Session expired. Please try logging in again.')
          } catch (signOutError) {
            console.log('Error clearing session:', signOutError)
            setMessage('Please refresh the page and try logging in again.')
          }
          return
        }
        
        if (error.message.includes('Email not confirmed')) {
          setMessage('Please check your email and click the confirmation link before logging in. If you need a new confirmation email, try registering again.')
        } else if (error.message.includes('Invalid login credentials')) {
          if (userExists) {
            // User exists but wrong password
            setMessage('Incorrect password. Please check your password or use the "Reset Password" button below.')
          } else if (pendingInvitation) {
            // User has a pending invitation
            if (invitationStatus === 'expired') {
              setMessage('Your invitation has expired. Please contact your manager to request a new invitation.')
            } else if (invitationStatus === 'pending') {
              setMessage('Your account is pending admin approval. Please wait for approval or contact your manager.')
            } else if (invitationStatus === 'approved') {
              setMessage('Your invitation has been approved but you need to complete the signup process. Please check your email for the invitation link.')
            }
          } else {
            // User doesn't exist and no invitation
            setMessage('No account found with this email address. Please contact your manager to request access to the system.')
          }
        } else if (error.message.includes('Too many requests')) {
          setMessage('Too many login attempts. Please wait a moment before trying again.')
        } else {
          setMessage('Unable to sign in. Please check your credentials and try again.')
        }
      } else if (error) {
        // Error exists but no message property
        console.log('Login attempt failed for:', email)
        setMessage('Unable to sign in. Please check your credentials and try again.')
      } else {
        // Successful login - redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Unexpected login error:', error)
      
      // Handle specific network errors without exposing technical details
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setMessage('Network error: Unable to connect to authentication service. Please check your internet connection and try again.')
      } else {
        // Generic error message - don't expose technical details to users
        setMessage('Unable to sign in at this time. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address first')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error && error.message) {
        // Provide user-friendly error messages
        if (error.message.includes('Too many requests')) {
          setMessage('Too many password reset attempts. Please wait a moment before trying again.')
        } else {
          setMessage('Unable to send password reset email. Please try again later.')
        }
      } else if (error) {
        // Error exists but no message property
        setMessage('Unable to send password reset email. Please try again later.')
      } else {
        setMessage('If an account exists with that email, a password reset link has been sent.')
        setEmail(''); setPassword('');
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setMessage('Unable to process password reset request. Please try again later.')
    } finally {
      setLoading(false)
    }
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
              Please sign in
            </h2>
          </div>
        
          <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogIn(); }}>
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
                  disabled={isFromInvitation}
                  suppressHydrationWarning
                  className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    isFromInvitation ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isFromInvitation && (
                  <p className="mt-1 text-sm text-indigo-600">
                    ✓ Email confirmed from invitation
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  suppressHydrationWarning
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                suppressHydrationWarning
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                suppressHydrationWarning
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Reset Password'}
              </button>
              
              <button
                type="button"
                onClick={clearAuthData}
                disabled={loading}
                suppressHydrationWarning
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Clear Session (Fix Auth Issues)
              </button>
            </div>



            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('No account found')
                  ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                  : message.includes('Invalid email or password') || message.includes('Unable to sign in')
                  ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                  : message.includes('error') || message.includes('Error') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : message.includes('successfully') || message.includes('confirmed') || message.includes('check your email')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : message.includes('already exists')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : message.includes('consider creating one instead')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {message.includes('No account found') ? (
                  <div>
                    <div className="mb-2">No account found with this email address.</div>
                    <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 text-center">
                      💡 <strong>Need access?</strong> Contact your manager to request an invitation to the system.
                    </div>
                  </div>
                ) : (
                  message
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
