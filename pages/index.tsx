import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [accountExists, setAccountExists] = useState(false)
  const [currentInvite, setCurrentInvite] = useState<any>(null)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [showResendButton, setShowResendButton] = useState(false)
  const [showEmailAdminButton, setShowEmailAdminButton] = useState(false)
  const [notifyingAdmin, setNotifyingAdmin] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      console.log('Home page: Checking if user is already logged in...')
      try {
        // Import the shared Supabase client
        const { supabase } = await import('../lib/supabaseClient')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Home page: Session check result:', error ? 'Error' : 'Success')
        console.log('Home page: Session data:', session ? 'Session found' : 'No session')
        
        if (session?.user) {
          console.log('Home page: User found, redirecting to dashboard')
          window.location.href = '/dashboard'
        } else {
          console.log('Home page: No user found, staying on home page')
        }
      } catch (error) {
        console.log('Home page: Error checking user:', error)
      }
    }
    checkUser()
  }, [])

  // Handle email confirmation redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        setMessage('Email confirmed successfully!<br>Set a password and log in.')
      }
      
      // Check for email parameter from invitation link
      const urlParams = new URLSearchParams(window.location.search)
      const emailParam = urlParams.get('email')
      
      if (emailParam) {
        setEmail(emailParam)
        setMessage('Email confirmed successfully!<br>Set a password and log in.')
        // Clear the email parameter from URL
        window.history.replaceState(null, '', '/')
        // Clear localStorage backup
        localStorage.removeItem('invitedEmail')
      } else {
        // Check localStorage as fallback
        const storedEmail = localStorage.getItem('invitedEmail')
        if (storedEmail) {
          setEmail(storedEmail)
          setMessage('Email confirmed successfully!<br>Set a password and log in.')
          // Clear localStorage
          localStorage.removeItem('invitedEmail')
        } else {
        }
      }
    }
  }, [])

  const handleLogIn = async () => {
    console.log('Login attempt started', { email, password: '***' })
    
    if (!email || !password) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')
    setShowResendButton(false)
    setShowEmailAdminButton(false)

    try {
      // First, check if there's a pending invitation for this email
      const inviteResponse = await fetch('/api/check-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (inviteResponse.ok) {
        const inviteData = await inviteResponse.json()
        if (inviteData.invitation) {
          setCurrentInvite(inviteData.invitation)
          if (inviteData.invitation.status === 'pending') {
            // User hasn't clicked the invite link yet
            setMessage('Account not activated. Please check your email and click the activation link to activate your account.')
            setShowResendButton(true)
            setLoading(false)
            return
          } else if (inviteData.invitation.status === 'email_confirmed' && !inviteData.invitation.admin_approved_at) {
            // User clicked invite but admin hasn't approved yet
            setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
            setShowResendButton(false)
            setShowEmailAdminButton(true)
            setLoading(false)
            return
          }
        }
      }

      // Try to sign in directly with Supabase client
      console.log('Attempting to sign in with Supabase client')
      
      // Import the shared Supabase client
      const { supabase } = await import('../lib/supabaseClient')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Sign in response:', error ? 'Error' : 'Success')
      console.log('Sign in result:', error ? error.message : 'User logged in')
      console.log('Full error object:', error)
      console.log('Full data object:', data)

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setMessage('Please check your email and click the confirmation link before logging in. If you need a new confirmation email, try registering again.')
        } else if (error.message.includes('Invalid login credentials')) {
          setAccountExists(true)
          setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below if you forgot your password.')
        } else if (error.message.includes('User not found') || error.message.includes('Invalid email')) {
          setAccountExists(false)
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
        } else {
          setAccountExists(false)
          setMessage(`Login error: ${error.message}`)
        }
      } else {
        // Successful login - redirect to dashboard
        console.log('Login successful! Redirecting to dashboard...')
        window.location.href = '/dashboard'
      }
    } catch (error) {
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!currentInvite) return

    setResendingConfirmation(true)
    setMessage('')

    try {
      // Resend the invitation email
      const invitationLink = `${window.location.origin}/invite/accept/${currentInvite.token}`
      
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentInvite.invited_email,
          companyName: currentInvite.company_name,
          invitationLink: invitationLink,
          message: currentInvite.message || null
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Activation email sent successfully! Please check your email and click the activation link.')
      } else {
        setMessage(`Error sending activation email: ${result.message}`)
      }
    } catch (error) {
      setMessage(`Error sending activation email: ${error}`)
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleEmailAdmin = async () => {
    if (!currentInvite) return

    setNotifyingAdmin(true)
    setMessage('')

    try {
      // TODO: Re-implement admin notification API
      // For now, just show a success message
      setMessage('Admin notification feature temporarily disabled. Please contact your administrator directly.')
    } catch (error) {
      setMessage(`Error contacting admin: ${error}`)
    } finally {
      setNotifyingAdmin(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogIn()
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(`Password reset error: ${result.message}`)
      } else {
        setMessage('If an account exists with that email, a password reset link has been sent. If you don\'t have an account, please contact your manager to request an invitation.')
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
                  className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    email && (window.location.search.includes('email=') || localStorage.getItem('invitedEmail')) 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : ''
                  }`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!(email && (window.location.search.includes('email=') || localStorage.getItem('invitedEmail')))}
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
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleLogIn}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              
              {accountExists && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Reset Password'}
                </button>
              )}
            </div>


            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('error') || message.includes('Error') || message.includes('contact your manager') || message.includes('contact your administrator') || message.includes('request an invitation') || message.includes('incorrect password') || message.includes('password you entered is incorrect') || message.includes('Please fill in all fields') || message.includes('Please enter both email and password') || message.includes('Account not activated') || message.includes('waiting for admin approval')
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : message.includes('successfully') || message.includes('confirmed')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : message.includes('already exists')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : message.includes('consider creating one instead')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: message }} />
                
                {/* Resend Activation Email Button */}
                {showResendButton && currentInvite && (
                  <div className="mt-3">
                    <button
                      onClick={handleResendActivation}
                      disabled={resendingConfirmation}
                      className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendingConfirmation ? 'Sending...' : 'Resend Activation Email'}
                    </button>
                  </div>
                )}
                
                {/* Email Admin Button */}
                {showEmailAdminButton && currentInvite && (
                  <div className="mt-3">
                    <button
                      onClick={handleEmailAdmin}
                      disabled={notifyingAdmin}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {notifyingAdmin ? 'Sending Request...' : 'Request Admin Approval'}
                    </button>
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