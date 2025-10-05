import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, storeTabSession, clearTabSession, getCurrentTabId as getTabId, validateSessionWithServer } from '../lib/sessionValidator'

export default function HomePage() {
  // Component rendering - debug log removed
  
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

  // Check if user is already logged in with tab isolation
  useEffect(() => {
    const checkUser = async () => {
      // Checking if user is already logged in
      
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        // Check if this tab already has a validated session
        const tabId = getTabId()
        // Checking for validated session
        const validatedSession = validateTabSession(tabId)
        
        if (validatedSession) {
          console.log('Home page: Found validated tab session, redirecting...', {
            userEmail: validatedSession.user.email,
            isAdmin: validatedSession.userData.isAdmin,
            isOwner: validatedSession.userData.isOwner,
            hasCompany: validatedSession.userData.hasCompany
          })
          if (validatedSession.userData.isAdmin) {
            console.log('Home page: Existing admin session, redirecting to admin dashboard')
            window.location.href = '/admin/dashboard'
          } else {
            console.log('Home page: Existing user session, redirecting to regular dashboard')
            window.location.href = '/dashboard'
          }
          return
        }
        
        // No validated session found, clear any existing data and stay on login page
        console.log('Home page: No validated session found, staying on login page')
        clearTabSession(tabId)
        
        // Force clear any Supabase session to prevent cross-tab contamination
        await supabase.auth.signOut()
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
        // This is a Supabase magic link - check if it's an invitation
        const urlParams = new URLSearchParams(hash.substring(1))
        const accessToken = urlParams.get('access_token')
        
        if (accessToken) {
          try {
            // Decode the JWT token to get user metadata
            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            console.log('Magic link payload:', payload)
            
            if (payload.user_metadata?.invitation_link) {
              // This is an invitation magic link - redirect to our custom page
              const invitationLink = payload.user_metadata.invitation_link
              console.log('Redirecting to invitation link:', invitationLink)
              window.location.href = invitationLink
              return
            }
          } catch (error) {
            console.error('Error decoding magic link token:', error)
          }
        }
        
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
    console.log('Home page: handleLogIn called')
    console.log('Login attempt started', { email, password: '***' })
    
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      console.log('Home page: Missing email or password')
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

      // First, check if user exists in our custom tables
      console.log('Checking if user exists in our system...')
      
      try {
        const inviteResponse = await fetch('/api/check-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        const inviteData = await inviteResponse.json()
        console.log('Invitation check result:', inviteData)

        if (!inviteData.invitation) {
          // No invitation found - check if this might be an admin account
          console.log('No invitation found - checking if this is an admin account...')
          
          // Try to authenticate with Supabase to see if it's an admin account
          try {
            const { supabase: getSupabaseClient } = await import('../lib/supabaseClient')
            const supabase = getSupabaseClient()
            
            console.log('About to make API call to /api/auth/signin')
            console.log('Request body:', { email, password: '***' })
            
            // Use our custom API instead of direct Supabase call
            let response
            try {
              response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
              })
              console.log('API call completed, response status:', response.status)
              console.log('Response ok:', response.ok)
            } catch (fetchError) {
              console.error('Fetch error:', fetchError)
              setMessage(`Network error: ${fetchError.message}. Please check your connection and try again.`)
              return
            }
            
            let result
            try {
              result = await response.json()
              console.log('Login response:', { ok: response.ok, status: response.status, result })
            } catch (jsonError) {
              console.error('JSON parse error:', jsonError)
              setMessage(`Server error: Unable to parse response. Please try again.`)
              return
            }

            // Convert API response to match expected format
            const data = result.user ? { user: result.user, session: result.session } : null
            const error = !response.ok ? { message: result.message } : null

            if (error) {
              console.log('Login error:', error)
              console.log('Login error message:', error.message)
              
              // Use the specific error message from our API
              if (error.message === 'No account exists for this email address') {
                setAccountExists(false)
                setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
              } else if (error.message === 'Invalid password') {
                setAccountExists(true)
                setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below if you forgot your password.')
              } else if (error.message.includes('Email not confirmed')) {
                setAccountExists(true)
                setMessage('Please check your email and click the confirmation link before logging in. If you need a new confirmation email, try registering again.')
              } else if (error.message.includes('waiting for admin approval')) {
                console.log('Login: Detected waiting for admin approval message')
                setAccountExists(true)
                setMessage(error.message)
                // Try to get invitation data to show the button
                try {
                  console.log('Login: Fetching invitation data for email:', email)
                  const inviteResponse = await fetch('/api/check-invitation', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                  })
                  
                  console.log('Login: Invitation response status:', inviteResponse.status)
                  if (inviteResponse.ok) {
                    const inviteData = await inviteResponse.json()
                    console.log('Login: Invitation data received:', inviteData)
                    if (inviteData.invitation) {
                      console.log('Login: Setting invitation data and showing button')
                      console.log('Login: Invitation data:', inviteData.invitation)
                      setCurrentInvite(inviteData.invitation)
                      setShowEmailAdminButton(true)
                      console.log('Login: Button state set to true')
                    } else {
                      console.log('Login: No invitation data found')
                    }
                  } else {
                    console.log('Login: Invitation fetch failed:', inviteResponse.status)
                  }
                } catch (inviteError) {
                  console.error('Error fetching invitation data:', inviteError)
                }
              } else {
                setAccountExists(true)
                setMessage(error.message || 'Invalid email or password. Please check your credentials and try again.')
              }
              return
            } else {
              // Successful login - set session in Supabase client
              console.log('Login successful, setting session and redirecting to dashboard')
              
              // Set the session in the Supabase client
              const { data: { session } } = await supabase.auth.setSession({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token
              })
              
              if (session) {
                console.log('Session set successfully, redirecting to dashboard')
                
                // Store session in tab-specific validation system
                const tabId = getTabId()
                const userData = {
                  isAdmin: result.isAdmin || false,
                  isOwner: result.isOwner || false,
                  hasCompany: result.hasCompany || false,
                  roles: result.userRoles || []
                }
                
                console.log('Home page: Storing validated session for tab:', tabId, 'User:', session.user.email)
                storeTabSession(tabId, session.user, userData, session.access_token)
                console.log('Home page: Session stored successfully for tab:', tabId)
                
                // Redirect based on user role
                if (result.isAdmin) {
                  console.log('User is admin, redirecting to admin dashboard')
                  window.location.href = '/admin/dashboard'
                } else {
                  console.log('User is not admin, redirecting to regular dashboard')
                  window.location.href = '/dashboard'
                }
              } else {
                console.error('Failed to set session')
                setMessage('Login successful but session setup failed. Please try again.')
              }
              return
            }
          } catch (authError) {
            console.error('Error checking Supabase Auth:', authError)
            console.error('Auth error details:', {
              name: authError.name,
              message: authError.message,
              stack: authError.stack
            })
            setAccountExists(false)
            setMessage(`Authentication error: ${authError.message}. Please contact your manager or the assetTRAC Admin to request an invitation.`)
            return
          }
        }

        console.log('User found in our system, checking invitation status...')
        
        // Check invitation status and provide appropriate message
        if (inviteData.invitation.status === 'pending') {
          setMessage('You have a pending invitation. Please check your email and click the invitation link to activate your account.')
          return
        } else if (inviteData.invitation.status === 'email_confirmed' && !inviteData.invitation.admin_approved_at) {
          setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
          setCurrentInvite(inviteData.invitation)
          setShowEmailAdminButton(true)
          setLoading(false)
          return
        } else if (inviteData.invitation.status === 'admin_approved') {
          // User has been approved by admin, now try to authenticate with Supabase
          console.log('User has been approved by admin, attempting Supabase authentication...')
          
          // Import the shared Supabase client
          const { supabase: getSupabaseClient } = await import('../lib/supabaseClient')
          const supabase = getSupabaseClient()
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          })

          console.log('Sign in response:', error ? 'Error' : 'Success')
          console.log('Sign in result:', error ? error.message : 'User logged in')

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
            // Successful login - set session storage and redirect to dashboard
            console.log('Login successful! Setting session storage and redirecting to dashboard...')
            
            // Note: Invitation completion is now handled by the signin API
            // No need to update status here as it's done automatically during signin
            
            // Store session in tab-specific validation system
            const tabId = getTabId()
            
            // Get actual user data from the API instead of hardcoding
            try {
              const userResponse = await fetch('/api/auth/getUser', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${data.session.access_token}`
                }
              })
              
              if (userResponse.ok) {
                const userData = await userResponse.json()
                storeTabSession(tabId, data.user, userData, data.session.access_token)
              } else {
                // Fallback to hardcoded values if API fails
                const userData = {
                  isAdmin: false,
                  isOwner: true,
                  hasCompany: true,
                  roles: ['owner']
                }
                storeTabSession(tabId, data.user, userData, data.session.access_token)
              }
            } catch (error) {
              console.error('Error getting user data, using fallback:', error)
              // Fallback to hardcoded values if API fails
              const userData = {
                isAdmin: false,
                isOwner: true,
                hasCompany: true,
                roles: ['owner']
              }
              storeTabSession(tabId, data.user, userData, data.session.access_token)
            }
            
            window.location.href = '/dashboard'
          }
          return
        } else if (inviteData.invitation.status === 'completed') {
          // User has completed the invitation process, now try to authenticate with Supabase
          console.log('User has completed invitation, attempting Supabase authentication...')
          
          // Import the shared Supabase client
          const { supabase: getSupabaseClient } = await import('../lib/supabaseClient')
          const supabase = getSupabaseClient()
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
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
            // Successful login - set session storage and redirect to dashboard
            console.log('Login successful! Setting session storage and redirecting to dashboard...')
            
            // Don't update invitation status here - let the signin API handle it properly
            // The signin API will only mark invitations as 'completed' after admin approval
            
            // Store session in tab-specific validation system
            const tabId = getTabId()
            const userData = {
              isAdmin: false,
              isOwner: true,
              hasCompany: true,
              roles: ['owner']
            }
            
            console.log('Home page: Storing validated session for tab:', tabId, 'User:', data.user.email)
            storeTabSession(tabId, data.user, userData, data.session.access_token)
            console.log('Home page: Session stored successfully for tab:', tabId)
            
            window.location.href = '/dashboard'
          }
        } else {
          // Other invitation status
          setMessage('Your account status is unclear. Please contact your administrator for assistance.')
        }
      } catch (systemError) {
        console.error('Error checking user in our system:', systemError)
        setAccountExists(false)
        setMessage('Unable to verify account. Please contact your manager or the assetTRAC Admin to request an invitation.')
      }
    } catch (error) {
      console.error('Unexpected error in handleLogIn:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      setMessage(`Unexpected error: ${error.message || error}. Please try again or contact support if the problem persists.`)
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
      
      const response = await fetch('/api/resend-invite-email', {
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
      const response = await fetch('/api/admin/notify-approval-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: currentInvite.invited_email,
          userName: currentInvite.invited_email.split('@')[0],
          companyName: currentInvite.company_name || 'Unknown Company'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Admin notification sent successfully! The administrator has been notified of your approval request and will receive an email with a direct link to approve your account.')
      } else {
        setMessage(`Error: ${result.message || 'Failed to send notification'}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
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
                onClick={(e) => {
                  console.log('Home page: Login button clicked')
                  e.preventDefault()
                  handleLogIn()
                }}
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
                message.includes('error') || message.includes('Error') || message.includes('contact your manager') || message.includes('contact your administrator') || message.includes('request an invitation') || message.includes('incorrect password') || message.includes('password you entered is incorrect') || message.includes('Invalid email or password') || message.includes('Please check your credentials') || message.includes('Please fill in all fields') || message.includes('Please enter both email and password') || message.includes('Account not activated') || message.includes('waiting for admin approval')
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
                {console.log('Login: Button render check - showEmailAdminButton:', showEmailAdminButton, 'currentInvite:', !!currentInvite)}
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