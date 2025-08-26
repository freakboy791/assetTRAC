'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Clear any invalid sessions first
        await supabase.auth.signOut()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.log('Auth check error:', error)
        // Force clear any invalid auth state
        await supabase.auth.signOut()
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

  const handleLogIn = async () => {
    if (!email || !password) {
      setMessage('Please fill in all fields')
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
        if (error.message.includes('Email not confirmed')) {
          setMessage('Please check your email and click the confirmation link before logging in. If you need a new confirmation email, try registering again.')
        } else if (error.message.includes('Invalid login credentials')) {
          setMessage('Invalid email or password. Please check your credentials or use the "Reset Password" button below if you forgot your password.')
        } else {
          setMessage(`Login error: ${error.message}`)
        }
      } else {
        // Successful login - redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error}`)
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
        redirectTo: `https://assettrac.vercel.app/auth/reset-password`
      })

      if (error) {
        setMessage(`Password reset error: ${error.message}`)
      } else {
        setMessage('If an account exists with that email, a password reset link has been sent. If you don\'t have an account, consider creating one instead.')
        setEmail(''); setPassword('');
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
                type="button"
                onClick={handleLogIn}
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
            </div>

            <div className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Create your account
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
                  : message.includes('consider creating one instead')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {message}
                {message.includes('consider creating one instead') && (
                  <div className="mt-3">
                    <Link
                      href="/auth/register"
                      className="block w-full bg-indigo-600 text-white px-3 py-2 rounded text-xs hover:bg-indigo-700 transition-colors text-center"
                    >
                      Create Account
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
