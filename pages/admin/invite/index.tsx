import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Invitation } from '../../../types'

export default function AdminInvitePage() {
  const [invitedEmail, setInvitedEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          window.location.href = '/'
          return
        }

        setUser(user)

        // Check if user is admin
        const { data: userRoleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single()

        if (!userRoleData || userRoleData.role !== 'admin') {
          window.location.href = '/dashboard'
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      }
    }

    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitedEmail || !companyName) {
      setStatusMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setStatusMessage('')

    try {
      // Generate a unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      // Set expiration date to 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Insert invitation into database
      const { error: insertError } = await supabase
        .from('invites')
        .insert({
          invited_email: invitedEmail,
          company_name: companyName,
          message: personalMessage || null,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_by: user.id,
          role: 'owner',
          status: 'pending',
          email_confirmed_at: null,
          admin_approved_at: null,
          admin_approved_by: null,
          completed_at: null
        })

      if (insertError) {
        setStatusMessage(`Error creating invitation: ${insertError.message}`)
        return
      }

      // Send invitation email using Edge Function
      const invitationLink = `${window.location.origin}/invite/accept/${token}`
      console.log('Generated invitation link:', invitationLink)
      console.log('Window location origin:', window.location.origin)
      
      const emailResponse = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitedEmail,
          companyName: companyName,
          invitationLink: invitationLink,
          message: personalMessage || null
        })
      })

      const emailResult = await emailResponse.json()

      if (!emailResponse.ok) {
        setStatusMessage(`Error sending invitation email: ${emailResult.message}`)
        return
      }

      setStatusMessage(emailResult.message || 'Invitation sent successfully! The user will receive an email with instructions to join.')
      
      // Clear form fields after successful invitation
      setInvitedEmail('')
      setCompanyName('')
      setPersonalMessage('')
      
      // Redirect to admin dashboard after successful invitation
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 2000)
    } catch (error) {
      setStatusMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!isAdmin) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Main Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC Admin - Send Invitation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Main Dashboard
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-500 text-sm">Send Invitation</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Owner Invitation</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="invitedEmail" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="invitedEmail"
                  value={invitedEmail}
                  onChange={(e) => setInvitedEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="owner@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Personal Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Welcome to our team! Please set up your account to get started."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => window.location.href = '/admin/dashboard'}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>

            {statusMessage && (
              <div className={`mt-6 p-4 rounded-md ${
                statusMessage.includes('successfully') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
