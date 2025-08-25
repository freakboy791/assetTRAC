'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is returning from email confirmation
    const hash = window.location.hash
    if (hash.includes('access_token') || hash.includes('refresh_token')) {
      setMessage('Account confirmed successfully! You can now log in.')
      // Clear the hash from URL
      window.history.replaceState(null, '', '/auth')
    }
  }, [])

  const handleSignUp = async () => {
    console.log('Sign up button clicked')
    console.log('Environment check:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
    
    if (!email || !password) {
      setMessage('Please enter both email and password')
      return
    }

    console.log('Starting sign up process for:', email)
    setLoading(true)
    setMessage('')

    try {
      console.log('Calling supabase.auth.signUp...')
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Production redirect URL - ensure this is deployed
          emailRedirectTo: `https://assettrac.vercel.app/auth`
        }
      })

      console.log('Sign up response:', { error })

      if (error) {
        setMessage(`Sign up error: ${error.message}`)
      } else {
        setMessage('Please check your email for a confirmation link')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      console.error('Unexpected error during sign up:', error)
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogIn = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setMessage(`Log in error: ${error.message}`)
      } else {
        setMessage('Successfully logged in!')
        // Redirect to dashboard or home page
        window.location.href = '/'
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://assettrac.vercel.app/auth/reset-password`
      })

      if (error) {
        setMessage(`Password reset error: ${error.message}`)
      } else {
        setMessage('Password reset email sent! Please check your email')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or create a new account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="rounded-md shadow-sm -space-y-px">
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
                suppressHydrationWarning
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                required
                suppressHydrationWarning
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              suppressHydrationWarning
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
            
            <button
              type="button"
              onClick={handleLogIn}
              disabled={loading}
              suppressHydrationWarning
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Log In'}
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
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('error') || message.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : message.includes('successfully') || message.includes('confirmed') || message.includes('check your email')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
