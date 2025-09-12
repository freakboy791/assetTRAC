import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { Invitation } from '../../../../types'
import Link from 'next/link'

export default function InviteAcceptPage() {
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  // Removed unused state variables since we're redirecting immediately

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        // Extract token from URL
        const token = window.location.pathname.split('/').pop()
        
        if (!token) {
          setError('Invalid invitation link')
          setLoading(false)
          return
        }

        // Check if invitation exists and is valid
        const { data, error: fetchError } = await supabase
          .from('invites')
          .select('*')
          .eq('token', token)
          .single()

        if (fetchError || !data) {
          setError('Invitation not found or invalid')
          setLoading(false)
          return
        }

        // Set invitation data and email first
        setInvitation(data)
        setEmail(data.invited_email)
        console.log('Invitation data loaded:', data)
        console.log('Email set to:', data.invited_email)

        // Check if invitation is expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired')
          setLoading(false)
          return
        }

        // Check if invitation is already used
        if (data.used) {
          setError('This invitation has already been used')
          setLoading(false)
          return
        }

        // Check if invitation is completed
        if (data.status === 'completed') {
          setError('This invitation has already been completed')
          setLoading(false)
          return
        }

        // If invitation is pending, update it to email_confirmed since user clicked the link
        if (data.status === 'pending') {
          console.log('Invitation is pending, updating to email_confirmed')
          
          // Update invitation status to email_confirmed
          const { error: updateError } = await supabase
            .from('invites')
            .update({ 
              status: 'email_confirmed',
              email_confirmed_at: new Date().toISOString()
            })
            .eq('token', token)
          
          if (updateError) {
            console.error('Error updating invitation status:', updateError)
            setError('Error confirming email. Please try again.')
            setLoading(false)
            return
          }
          
          console.log('Invitation status updated to email_confirmed')
        }

        // If invitation is valid, redirect immediately to login with email
        console.log('Valid invitation found, redirecting to login with email:', data.invited_email)
        
        // Store email in localStorage as backup
        localStorage.setItem('invitedEmail', data.invited_email)
        
        // Check if we're on the correct port (3000) and redirect if needed
        const currentPort = window.location.port
        const currentHost = window.location.hostname
        console.log('Current port:', currentPort, 'Current host:', currentHost)
        
        if (currentPort !== '3000' && currentHost === 'localhost') {
          console.log('Redirecting to correct port 3000')
          const redirectUrl = `http://localhost:3000/auth?email=${encodeURIComponent(data.invited_email)}`
          window.location.href = redirectUrl
          return
        }
        
        const redirectUrl = `/auth?email=${encodeURIComponent(data.invited_email)}`
        console.log('Redirecting to:', redirectUrl)
        
        // Add a small delay to ensure the page has loaded
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 100)
      } catch (err) {
        setError('Error validating invitation')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    validateInvitation()
  }, [])

  // Removed handleSignup function since we're redirecting immediately

  if (loading) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <p className="mt-2 text-sm text-gray-600">Redirecting to login...</p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating invitation and redirecting...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
