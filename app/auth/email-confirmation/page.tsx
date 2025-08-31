'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function EmailConfirmationPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleEmailConfirmation = useCallback(async () => {
    try {
      // Get the session from the URL hash
      const hash = window.location.hash
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        // User has confirmed email - check their status and redirect appropriately
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (currentUser) {
          // Check if user has company associations
          const { data: companyAssociations } = await supabase
            .from('company_users')
            .select('*')
            .eq('user_id', currentUser.id)

          // Check if user has admin role
          const { data: userRoleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .eq('role', 'admin')
            .single()

          if (userRoleData && userRoleData.role === 'admin') {
            // Admin user - redirect to dashboard
            setMessage('Email confirmed! Redirecting to admin dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          } else if (companyAssociations && companyAssociations.length > 0) {
            // User has company - redirect to dashboard
            setMessage('Email confirmed! Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          } else {
            // No company - redirect to company creation
            setMessage('Email confirmed! Redirecting to company creation...')
            setTimeout(() => {
              router.push('/company/create')
            }, 2000)
          }
        } else {
          setMessage('Email confirmed! Please log in to continue.')
          setTimeout(() => {
            router.push('/auth')
          }, 2000)
        }
      } else {
        setMessage('Invalid confirmation link. Please check your email or contact support.')
        setTimeout(() => {
          router.push('/auth')
        }, 3000)
      }
    } catch (error) {
      console.error('Error handling email confirmation:', error)
      setMessage('An error occurred during confirmation. Please try logging in.')
      setTimeout(() => {
        router.push('/auth')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    handleEmailConfirmation()
  }, [handleEmailConfirmation])

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
          <p className="mt-2 text-sm text-gray-600">Email Confirmation</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center">
            {loading ? (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Confirming your email...</p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-medium text-gray-900 mb-4">
                  {message}
                </h2>
                <p className="text-sm text-gray-600">
                  You will be redirected automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
