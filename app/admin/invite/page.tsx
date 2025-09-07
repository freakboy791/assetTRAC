'use client'

import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function AdminInvitePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [inviteData, setInviteData] = useState({
    email: '',
    companyName: '',
    message: ''
  })
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [showInvitationLink, setShowInvitationLink] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successDetails, setSuccessDetails] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      // Check if user has an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('No active session, redirecting to login')
        router.push('/')
        return
      }

      const currentUser = session.user
      if (!currentUser) {
        console.log('No user in session, redirecting to login')
        router.push('/')
        return
      }

      setUser(currentUser)

      // Check if user is admin
      console.log('Checking admin role for user:', currentUser.id)
      const { data: userRoleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single()

      console.log('Admin role check result:', { userRoleData, roleError })

      if (roleError || !userRoleData) {
        console.log('No role found, but allowing access to invite page. Role data:', userRoleData, 'Error:', roleError)
        // No role found, but allow access to invite functionality
      } else if (userRoleData.role !== 'admin') {
        console.log('Not admin, redirecting to dashboard. Role data:', userRoleData, 'Error:', roleError)
        // Not admin - redirect to dashboard
        router.push('/dashboard')
        return
      }

      console.log('Admin role confirmed, staying on invite page')

    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setInviteData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Invitation link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
      setMessage('Failed to copy to clipboard. Please copy manually.')
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteData.email.trim() || !inviteData.companyName.trim()) {
      setMessage('Email and company name are required')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Generate unique token and expiration (7 days from now)
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create invitation in database using admin client to bypass RLS
      console.log('Admin client available:', !!supabaseAdmin)
      console.log('User ID:', user!.id)
      console.log('Attempting to create invitation...')
      console.log('Invitation data:', {
        invited_email: inviteData.email.trim(),
        company_name: inviteData.companyName.trim(),
        message: inviteData.message.trim() || null,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_by: user!.id,
        role: 'owner'
      })
      
      let result
      if (supabaseAdmin) {
        console.log('Using admin client...')
        result = await supabaseAdmin
          .from('invites')
          .insert([{
            invited_email: inviteData.email.trim(),
            company_name: inviteData.companyName.trim(),
            message: inviteData.message.trim() || null,
            token: token,
            expires_at: expiresAt.toISOString(),
            used: false,
            created_by: user!.id,
            role: 'owner'  // Add the missing role field
          }])
          .select()
          .single()
      } else {
        console.log('Using regular client...')
        result = await supabase
          .from('invites')
          .insert([{
            invited_email: inviteData.email.trim(),
            company_name: inviteData.companyName.trim(),
            message: inviteData.message.trim() || null,
            token: token,
            expires_at: expiresAt.toISOString(),
            used: false,
            created_by: user!.id,
            role: 'owner'  // Add the missing role field
          }])
          .select()
          .single()
      }

      const { data: createdInvite, error: inviteError } = result

      console.log('Supabase response:', { data: createdInvite, error: inviteError })

      if (inviteError) {
        console.error('Supabase error details:', inviteError)
        console.error('Error object type:', typeof inviteError)
        console.error('Error object keys:', Object.keys(inviteError))
        console.error('Error message:', inviteError.message)
        console.error('Error code:', inviteError.code)
        console.error('Error details:', inviteError.details)
        console.error('Error hint:', inviteError.hint)
        console.error('Full error object:', JSON.stringify(inviteError, null, 2))
        
        // Handle different error formats
        const errorMessage = inviteError.message || 'Unknown error occurred'
        setMessage(`Error creating invitation: ${errorMessage}`)
        return
      }

      console.log('Invitation created successfully:', createdInvite)

      // Success - show invitation link
      const invitationLink = `${window.location.origin}/invite/accept/${token}`
      
      // Send invitation email via Supabase Edge Function
      console.log('📧 Sending invitation email via Edge Function...')
      setMessage('Invitation created successfully! Sending email...')
      
      try {
        console.log('📧 Calling email API with data:', {
          email: inviteData.email.trim(),
          companyName: inviteData.companyName.trim(),
          invitationLink: invitationLink,
          message: inviteData.message.trim() || null
        })
        
        const response = await fetch('/api/send-invite-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inviteData.email.trim(),
            companyName: inviteData.companyName.trim(),
            invitationLink: invitationLink,
            message: inviteData.message.trim() || null
          })
        })

        console.log('📧 Email API response status:', response.status)
        const result = await response.json()
        console.log('📧 Email API response:', result)

        if (response.ok && result.success) {
          if (result.userExists) {
            // User already exists - show success message and invitation link
            setSuccessDetails(result.message || `Invitation created successfully! User with email ${inviteData.email.trim()} already exists.`)
            setInvitationLink(invitationLink)
            setShowInvitationLink(true)
            setShowSuccessMessage(true)
          } else {
            // New user - email sent successfully
            setSuccessDetails(result.message || `Invitation created and email sent successfully to ${inviteData.email.trim()}!`)
            setShowInvitationLink(false)
            setInvitationLink(null)
            setShowSuccessMessage(true)
          }
          
          // Reset form on success
          setInviteData({
            email: '',
            companyName: '',
            message: ''
          })
        } else {
          console.error('Edge Function error:', result.error)
          setMessage(`Invitation created but email sending failed: ${result.error}. Please try again.`)
        }
      } catch (error) {
        console.error('Error calling Edge Function:', error)
        setMessage(`Invitation created but email sending failed. Please send this link manually: ${invitationLink}`)
      }
      
      console.log('Invitation link:', invitationLink)

    } catch (error) {
      console.error('Error sending invitation:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }



  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">AT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            assetTRAC
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Invite Company Owner</h2>
          <p className="mt-2 text-sm text-gray-600">Send invitations to company owners to register and use assetTRAC</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                required
                value={inviteData.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter company name"
              />
            </div>

            {/* Owner Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Owner Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={inviteData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="owner@company.com"
              />
            </div>

            {/* Custom Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={inviteData.message}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add a personal message to your invitation..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Invitation...' : 'Create Invitation'}
              </button>
            </div>

            {/* Message Display */}
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

        {/* Success Message Overlay */}
        {showSuccessMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Sent Successfully!</h3>
              <p className="text-sm text-gray-600 mb-6">{successDetails}</p>
              <button
                onClick={() => {
                  setShowSuccessMessage(false)
                  setShowInvitationLink(false)
                  setInvitationLink(null)
                  router.push('/dashboard')
                }}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Invitation Link Display for Existing Users */}
        {showInvitationLink && invitationLink && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">
              📧 Invitation Link for Existing User
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Since this user already has an account, you can send them this invitation link to join the company:
            </p>
            <div className="bg-white border border-blue-300 rounded-md p-3 mb-4">
              <code className="text-sm text-blue-800 break-all">{invitationLink}</code>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => copyToClipboard(invitationLink)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                📋 Copy Link
              </button>
              <button
                onClick={() => {
                  setShowInvitationLink(false)
                  setInvitationLink(null)
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
