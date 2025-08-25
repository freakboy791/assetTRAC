'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://assettrac.vercel.app/auth`
        }
      })

      if (error) {
        // Handle specific error cases
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.message.includes('User already registered') ||
            error.message.includes('duplicate key') ||
            error.message.includes('already been registered') ||
            error.message.includes('already signed up')) {
          setMessage('An account associated with that email address already exists. Please login or reset password.')
        } else {
          setMessage(`Registration error: ${error.message}`)
        }
      } else {
        // Check if this is a duplicate sign-up (user already exists)
        if (data?.user && !data?.session) {
          // User exists but no session - this means they're already registered
          setMessage('An account associated with that email address already exists. Please login or reset password.')
        } else {
          setMessage('Please check your email for a confirmation link')
          setEmail('')
          setPassword('')
        }
      }
    } catch (error) {
      console.error('Unexpected error during registration:', error)
      setMessage(`Unexpected error: ${error}`)
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
              Please Register
            </h2>
          </div>
        
          <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
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
                suppressHydrationWarning
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                autoComplete="new-password"
                required
                suppressHydrationWarning
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              suppressHydrationWarning
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth" className="font-medium text-indigo-600 hover:text-indigo-500">
              Login
            </Link>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('error') || message.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : message.includes('successfully') || message.includes('confirmed') || message.includes('check your email')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.includes('already exists')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
              {message.includes('already exists') && (
                <div className="mt-3 space-y-2">
                  <Link
                    href="/auth"
                    className="block w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors text-center"
                  >
                    Go to Login
                  </Link>
                  <Link
                    href="/auth/reset-password"
                    className="block w-full bg-gray-600 text-white px-3 py-2 rounded text-xs hover:bg-gray-700 transition-colors text-center"
                  >
                    Reset Password
                  </Link>
                </div>
              )}
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  )
}
