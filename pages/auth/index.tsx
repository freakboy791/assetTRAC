import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { Invitation } from '../../types'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorType, setErrorType] = useState<'none' | 'email_not_found' | 'bad_password' | 'email_not_confirmed' | 'admin_approval_pending' | 'generic'>('none')
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [notifyingAdmin, setNotifyingAdmin] = useState(false)
  const [isFromInvitation, setIsFromInvitation] = useState(false)
  const [resendingInvite, setResendingInvite] = useState(false)
  const [currentInvite, setCurrentInvite] = useState<any>(null)
  const [accountExists, setAccountExists] = useState(false)

  useEffect(() => {
    // Check if user is returning from email confirmation
    if (typeof window !== 'undefined') {
      
      const hash = window.location.hash
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        setMessage('Email confirmed successfully!<br>Set a password and log in.')
        // Clear the hash from URL
        window.history.replaceState(null, '', '/auth')
      }
      
      // Check for email parameter from invitation link
      const urlParams = new URLSearchParams(window.location.search)
      const emailParam = urlParams.get('email')
      
      if (emailParam) {
        setEmail(emailParam)
        setIsFromInvitation(true)
        setMessage('Email confirmed successfully!<br>Set a password to create your account.')
        // Clear the email parameter from URL
        window.history.replaceState(null, '', '/auth')
        // Clear localStorage backup
        localStorage.removeItem('invitedEmail')
      } else {
        // Check localStorage as fallback
        const storedEmail = localStorage.getItem('invitedEmail')
        if (storedEmail) {
          setEmail(storedEmail)
          setIsFromInvitation(true)
          setMessage('Email confirmed successfully!<br>Set a password to create your account.')
          // Clear localStorage
          localStorage.removeItem('invitedEmail')
        } else {
        }
      }
    }
  }, [])

  const handleLogIn = async () => {
    
    if (!email || !password) {
      setMessage('Please enter both email and password')
      setErrorType('generic')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorType('none')

    try {
      
      // First, check if there's a pending invitation for this email
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('invited_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()


      if (inviteData) {
        setCurrentInvite(inviteData)
        setAccountExists(false) // No account exists yet, just invitation
        
        if (inviteData.status === 'pending') {
          // User hasn't clicked the invite link yet
          setErrorType('email_not_confirmed')
          setMessage('Account not activated. Please check your email and click the activation link to activate your account.')
          setLoading(false)
          return
        } else if (inviteData.status === 'email_confirmed' && !inviteData.admin_approved_at) {
          // User clicked invite but admin hasn't approved yet
          setErrorType('admin_approval_pending')
          setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
          setLoading(false)
          return
        } else if (inviteData.status === 'completed') {
          // Invitation completed but no account - this shouldn't happen normally
          setErrorType('email_not_found')
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
          setLoading(false)
          return
        } else {
          // Other invitation status
          setErrorType('email_not_found')
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
          setLoading(false)
          return
        }
      } else if (inviteError && inviteError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected when no invitation exists
        setErrorType('generic')
        setMessage('Error checking invitation status. Please try again.')
        setLoading(false)
        return
      }

      // If no invitation found, try to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          setErrorType('email_not_confirmed')
          setMessage('Your email address has not been confirmed yet. Please check your email and click the confirmation link.')
        } else if (error.message.includes('Invalid login credentials')) {
          // Check if email exists in our system to determine if it's email not found vs bad password
          try {
            // Check if user exists in Supabase auth using our API
            const response = await fetch('/api/check-user-exists', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email }),
            })

            if (response.ok) {
              const { exists } = await response.json()
              
              if (exists) {
                // User exists, so it's a bad password
                setAccountExists(true)
                setErrorType('bad_password')
                setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below.')
              } else {
                // User doesn't exist
                setAccountExists(false)
                setErrorType('email_not_found')
                setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
              }
            } else {
              // Fallback to bad password if we can't check
              setAccountExists(true)
              setErrorType('bad_password')
              setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below.')
            }
          } catch (profileError) {
            // Fallback to bad password if we can't check
            setAccountExists(true)
            setErrorType('bad_password')
            setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below.')
          }
        } else if (error.message.includes('User not found') || error.message.includes('Invalid email')) {
          setAccountExists(false)
          setErrorType('email_not_found')
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
        } else {
          setAccountExists(false)
          setErrorType('generic')
          setMessage(`Log in error: ${error.message}`)
        }
        setLoading(false)
        return
      }

      // Login successful, now check for admin approval status
      setMessage('Successfully logged in! Checking your account status...')
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (currentUser) {
          // Check if user has pending invitations that need admin approval
          const { data: pendingInvitations } = await supabase
            .from('invites')
            .select('*')
            .eq('invited_email', email)
            .eq('status', 'email_confirmed')
            .is('admin_approved_at', null)

          if (pendingInvitations && pendingInvitations.length > 0) {
            setErrorType('admin_approval_pending')
            setMessage('Your account is waiting for admin approval. You will be notified once approved.')
            setLoading(false)
            return
          }

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
            window.location.href = '/dashboard'
          } else if (companyAssociations && companyAssociations.length > 0) {
            // User has company - redirect to dashboard
            window.location.href = '/dashboard'
          } else {
            // No company - redirect to company creation
            window.location.href = '/company/create'
          }
        } else {
          // Fallback to home page
          window.location.href = '/'
        }
      } catch (redirectError) {
        // Fallback to home page
        window.location.href = '/'
      }
    } catch (error) {
      setErrorType('generic')
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setMessage('Please fill in all fields')
      setErrorType('generic')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setErrorType('generic')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setErrorType('generic')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorType('none')

    try {
      if (isFromInvitation) {
        // Use API endpoint to update existing invited user's password
        const response = await fetch('/api/create-invited-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (response.ok) {
          const { success, message } = await response.json()
          if (success) {
            setMessage(message)
            
            // Try to log in the user automatically
            try {
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
              })
              
              if (signInError) {
                setMessage('Account updated successfully! Please log in to continue.')
                setIsFromInvitation(false)
                return
              }
              
              // Redirect to company creation page
              setTimeout(() => {
                window.location.href = '/company/create'
              }, 2000)
            } catch (loginError) {
              setMessage('Account updated successfully! Please log in to continue.')
              setIsFromInvitation(false)
            }
          } else {
            setErrorType('generic')
            setMessage('Account created successfully! Please log in to continue.')
            setIsFromInvitation(false)
          }
        } else {
          const { error: apiError } = await response.json()
          setErrorType('generic')
          setMessage(`Error creating account: ${apiError}`)
        }
      } else {
        // Regular signup flow
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`
          }
        })

        if (error) {
          setErrorType('generic')
          setMessage(`Error creating account: ${error.message}`)
        } else {
          setMessage('Account created successfully! You can now log in.')
        }
      }
      
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setErrorType('generic')
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isFromInvitation) {
        handleSignUp()
      } else {
        handleLogIn()
      }
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      setErrorType('generic')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorType('none')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        setErrorType('generic')
        setMessage(`Password reset error: ${error.message}`)
      } else {
        // Note: Supabase will send an email even if the account doesn't exist
        // This is a security feature to prevent email enumeration
        setErrorType('generic')
        setMessage('If an account exists with that email, a password reset link has been sent. If you don\'t have an account, please contact your manager to request an invitation.')
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      setErrorType('generic')
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      setErrorType('generic')
      return
    }

    setResendingConfirmation(true)
    setMessage('')
    setErrorType('none')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setErrorType('generic')
        setMessage(`Error resending confirmation: ${error.message}`)
      } else {
        setErrorType('email_not_confirmed')
        setMessage('A new confirmation email has been sent. Please check your email and click the confirmation link.')
      }
    } catch (error) {
      setErrorType('generic')
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleNotifyAdmin = async () => {
    if (!email) {
      setMessage('Please enter your email address')
      setErrorType('generic')
      return
    }

    setNotifyingAdmin(true)
    setMessage('')
    setErrorType('none')

    try {
      // Get the invitation details
      const { data: invitation } = await supabase
        .from('invites')
        .select('*')
        .eq('invited_email', email)
        .eq('status', 'email_confirmed')
        .is('admin_approved_at', null)
        .single()

      if (invitation) {
        // Get admin details
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single()

        if (adminData) {
          // Create a notification for the admin
          const { error: notificationError } = await supabase
            .from('admin_notifications')
            .insert({
              type: 'user_registration',
              user_id: adminData.user_id,
              message: `User ${email} is waiting for approval for company: ${invitation.company_name}`,
              is_read: false
            })

          if (notificationError) {
            setErrorType('generic')
            setMessage(`Error notifying admin: ${notificationError.message}`)
          } else {
            setErrorType('admin_approval_pending')
            setMessage('Admin has been notified of your pending approval. You will be notified once approved.')
          }
        } else {
          setErrorType('generic')
          setMessage('No admin found to notify. Please contact support.')
        }
      } else {
        setErrorType('generic')
        setMessage('No pending invitation found for this email.')
      }
    } catch (error) {
      setErrorType('generic')
      setMessage(`Unexpected error: ${error}`)
    } finally {
      setNotifyingAdmin(false)
    }
  }

  const handleResendInvite = async () => {
    if (!currentInvite) return

    setResendingInvite(true)
    setMessage('')

    try {
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentInvite.invited_email,
          role: currentInvite.role,
          companyName: currentInvite.company_name,
          personalMessage: currentInvite.message
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage('Invitation resent successfully! Please check your email.')
        setErrorType('none')
      } else {
        setMessage(`Error resending invitation: ${result.message}`)
        setErrorType('generic')
      }
    } catch (error) {
      setMessage(`Error resending invitation: ${error}`)
      setErrorType('generic')
    } finally {
      setResendingInvite(false)
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

  const handleContactAdmin = async () => {
    if (!currentInvite) return

    setNotifyingAdmin(true)
    setMessage('')

    try {
      // Use a hardcoded admin email for now
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@yourcompany.com'
      const subject = `Account Approval Request - ${currentInvite.invited_email}`
      const body = `Hello,\n\nI have activated my invitation for ${currentInvite.company_name} but my account is still pending admin approval.\n\nPlease approve my account so I can access the system.\n\nThank you,\n${currentInvite.invited_email}`
      
      const mailtoLink = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailtoLink)
      
      setMessage('Email client opened. Please send the message to request approval.')
    } catch (error) {
      setMessage(`Error contacting admin: ${error}`)
    } finally {
      setNotifyingAdmin(false)
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
                autoComplete={isFromInvitation ? "new-password" : "current-password"}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            
            {isFromInvitation && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (isFromInvitation) {
                  handleSignUp()
                } else {
                  handleLogIn()
                }
              }}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isFromInvitation ? 'Creating account...' : 'Signing in...') : (isFromInvitation ? 'Create Account' : 'Sign in')}
            </button>
            
            {!isFromInvitation && accountExists && (
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
              errorType === 'email_not_found' || errorType === 'bad_password' || errorType === 'generic'
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : errorType === 'email_not_confirmed' || errorType === 'admin_approval_pending'
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : message.includes('successfully') || message.includes('confirmed') || message.includes('check your email')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.includes('contact your manager') || message.includes('contact your administrator') || message.includes('request an invitation') || message.includes('Please fill in all fields') || message.includes('Please enter both email and password')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <div dangerouslySetInnerHTML={{ __html: message }} />
              
              {/* Action buttons based on error type */}
              {errorType === 'email_not_confirmed' && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={handleResendActivation}
                    disabled={resendingConfirmation}
                    className="block w-full bg-yellow-600 text-white px-3 py-2 rounded text-xs hover:bg-yellow-700 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendingConfirmation ? 'Sending...' : 'Resend Activation Email'}
                  </button>
                </div>
              )}
              
              {errorType === 'admin_approval_pending' && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={handleContactAdmin}
                    disabled={notifyingAdmin}
                    className="block w-full bg-yellow-600 text-white px-3 py-2 rounded text-xs hover:bg-yellow-700 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {notifyingAdmin ? 'Opening Email...' : 'Contact Admin for Approval'}
                  </button>
                </div>
              )}
              
              
              {errorType === 'bad_password' && accountExists && (
                <div className="mt-3">
                  <p className="text-xs text-red-600 mb-2">
                    Forgot your password? Use the "Reset Password" button above.
                  </p>
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
