import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Invitation } from '../../types'

// Window-specific storage utility using localStorage with unique window ID
const getWindowId = () => {
  let windowId = localStorage.getItem('windowId')
  if (!windowId) {
    // Create a unique window identifier using performance.now() for better uniqueness
    windowId = `win_${Date.now()}_${performance.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('windowId', windowId)
  }
  return windowId
}

const setTabStorage = (key: string, value: string) => {
  const windowId = getWindowId()
  localStorage.setItem(`${windowId}_${key}`, value)
}

const getTabStorage = (key: string) => {
  const windowId = getWindowId()
  return localStorage.getItem(`${windowId}_${key}`)
}

const clearTabStorage = () => {
  const windowId = getWindowId()
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(`${windowId}_`)) {
      localStorage.removeItem(key)
    }
  })
  localStorage.removeItem('windowId')
}

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
    const checkUser = async () => {
      try {
        // Import the shared Supabase client
        const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
        const supabase = getSupabaseClient()
        
        // Clear any existing session to force fresh authentication
        await supabase.auth.signOut()
        
        // Check if there's a valid session after clearing
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Check if user is admin and redirect accordingly
          const isAdmin = getTabStorage('isAdmin') === 'true'
          if (isAdmin) {
            window.location.href = '/admin/dashboard'
          } else {
            window.location.href = '/dashboard'
          }
        }
      } catch (error) {
        // Silently handle errors
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
      const messageParam = urlParams.get('message')
      
      if (messageParam) {
        setMessage(messageParam)
        setErrorType('admin_approval_pending')
        // Clear the message parameter from URL
        window.history.replaceState(null, '', '/auth')
      } else if (emailParam) {
        setEmail(emailParam)
        setMessage('Email confirmed successfully!<br>Set a password and log in.')
        setIsFromInvitation(true)
        // Clear the email parameter from URL
        window.history.replaceState(null, '', '/auth')
        // Clear localStorage backup
        localStorage.removeItem('invitedEmail')
      } else {
        // Check localStorage as fallback
        const storedEmail = localStorage.getItem('invitedEmail')
        if (storedEmail) {
          setEmail(storedEmail)
          setMessage('Email confirmed successfully!<br>Set a password and log in.')
          setIsFromInvitation(true)
          // Clear localStorage
          localStorage.removeItem('invitedEmail')
        }
      }
    }
  }, [])

  const handleLogIn = async () => {
    console.log('Login form: handleLogIn called with email:', email)
    
    if (!email || !password) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorType('none')

    try {
      console.log('Login form: Making API call to /api/auth/signin')
      // Try to sign in via API
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()
      console.log('Login response:', { ok: response.ok, status: response.status, result })

      if (!response.ok) {
        if (result.message.includes('No account exists for this email address')) {
          setErrorType('email_not_found')
          setAccountExists(false)
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
        } else if (result.message.includes('Account not activated')) {
          setErrorType('admin_approval_pending')
          setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
        } else if (result.message.includes('Email not confirmed')) {
          setErrorType('email_not_confirmed')
          setMessage('Please check your email and click the confirmation link before logging in. If you need a new confirmation email, try registering again.')
        } else if (result.message.includes('Invalid login credentials')) {
          // Check if email exists in our system
          try {
            const userCheckResponse = await fetch('/api/check-user-exists', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email }),
            })

            if (userCheckResponse.ok) {
              const { exists } = await userCheckResponse.json()
              
              if (exists) {
                setErrorType('bad_password')
                setAccountExists(true)
                setMessage('The password you entered is incorrect. Please try again or use the "Reset Password" button below if you forgot your password.')
                return
              }
            }

            // Check if there's a pending invitation
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
                setAccountExists(false)
                if (inviteData.invitation.status === 'pending') {
                  setErrorType('email_not_confirmed')
                  setMessage('You have a pending invitation. Please check your email and click the invitation link to activate your account.')
                } else if (inviteData.invitation.status === 'email_confirmed' && !inviteData.invitation.admin_approved_at) {
                  setErrorType('admin_approval_pending')
                  setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
                } else {
                  setErrorType('email_not_found')
                  setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
                }
              } else {
                setErrorType('email_not_found')
                setAccountExists(false)
                setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
              }
            } else {
              setErrorType('email_not_found')
              setAccountExists(false)
              setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
            }
          } catch (profileError) {
            setErrorType('generic')
            setAccountExists(true)
            setMessage('Invalid email or password. Please check your credentials or use the "Reset Password" button below if you forgot your password.')
          }
        } else if (result.message.includes('User not found') || result.message.includes('Invalid email')) {
          setErrorType('email_not_found')
          setAccountExists(false)
          setMessage('No account exists for this email address. Please contact your manager or the assetTRAC Admin to request an invitation.')
        } else {
          setErrorType('generic')
          setAccountExists(false)
          setMessage(`Login error: ${result.message}`)
        }
      } else {
        // Successful login - check user role and redirect accordingly
        console.log('Auth: Login successful, result:', result)
        console.log('Auth: isAdmin:', result.isAdmin)
        console.log('Auth: userRoles:', result.userRoles)
        
        if (result.isAdmin) {
          // Store admin status in tab-specific session storage
          console.log('Auth: User is admin, redirecting to admin dashboard')
          setTabStorage('isAdmin', 'true')
          setTabStorage('userRoles', JSON.stringify(result.userRoles || []))
          window.location.href = '/admin/dashboard'
        } else {
          // Store user role information in tab-specific session storage
          console.log('Auth: User is not admin, redirecting to regular dashboard')
          setTabStorage('isAdmin', 'false')
          setTabStorage('isOwner', result.isOwner ? 'true' : 'false')
          setTabStorage('hasCompany', result.hasCompany ? 'true' : 'false')
          setTabStorage('userRoles', JSON.stringify(result.userRoles || []))
          window.location.href = '/dashboard'
        }
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
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')
    setErrorType('none')

    try {
      // Check if there's a pending invitation for this email
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
            setErrorType('email_not_confirmed')
            setMessage('You have a pending invitation. Please check your email and click the invitation link to activate your account.')
            setLoading(false)
            return
          } else if (inviteData.invitation.status === 'email_confirmed' && !inviteData.invitation.admin_approved_at) {
            setErrorType('admin_approval_pending')
            setMessage('Your account is waiting for admin approval. Please contact your administrator to approve your account.')
            setLoading(false)
            return
          }
        }
      }

      // Try to sign up via API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.message.includes('User already registered')) {
          setErrorType('email_not_found')
          setMessage('An account with this email already exists. Please try logging in instead.')
        } else {
          setErrorType('generic')
          setMessage(`Registration error: ${result.message}`)
        }
      } else {
        setMessage('Registration successful! Please check your email and click the confirmation link to activate your account.')
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
      setMessage('Please enter your email address first')
      return
    }

    setResendingConfirmation(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Confirmation email sent successfully! Please check your email and click the confirmation link.')
      } else {
        setMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleResendInvite = async () => {
    if (!currentInvite) return

    setResendingInvite(true)
    setMessage('')

    try {
      // Use the correct join URL pattern
      const invitationLink = `${window.location.origin}/join/${currentInvite.token}`
      
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
        setMessage('Invitation email sent successfully! Please check your email and click the invitation link.')
      } else {
        setMessage(`Error: ${result.message}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setResendingInvite(false)
    }
  }

  const handleNotifyAdmin = async () => {
    if (!email) return

    setNotifyingAdmin(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/notify-approval-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: email,
          userName: email.split('@')[0], // Use email prefix as name
          companyName: currentInvite?.company_name || 'Unknown Company'
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

      if (response.ok) {
        setMessage('If an account exists with that email, a password reset link has been sent. If you don\'t have an account, please contact your manager to request an invitation.')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      } else {
        setMessage(`Password reset error: ${result.message}`)
      }
    } catch (error) {
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
              {isFromInvitation ? 'Complete Your Registration' : 'Please sign in'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isFromInvitation 
                ? 'You\'ve been invited to join assetTRAC. Please set up your password to complete your account.'
                : 'Enter your credentials to access your account'
              }
            </p>
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
                    email && isFromInvitation 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : ''
                  }`}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!(email && isFromInvitation)}
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
                  console.log('Login button clicked, isFromInvitation:', isFromInvitation)
                  if (isFromInvitation) {
                    handleSignUp()
                  } else {
                    handleLogIn()
                  }
                }}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isFromInvitation ? 'Creating Account...' : 'Signing in...') : (isFromInvitation ? 'Create Account' : 'Sign in')}
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
                
                {/* Resend Confirmation Email Button */}
                {errorType === 'email_not_confirmed' && !isFromInvitation && (
                  <div className="mt-3">
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendingConfirmation}
                      className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendingConfirmation ? 'Sending...' : 'Resend Confirmation Email'}
                    </button>
                  </div>
                )}
                
                {/* Resend Invitation Email Button */}
                {errorType === 'email_not_confirmed' && isFromInvitation && currentInvite && (
                  <div className="mt-3">
                    <button
                      onClick={handleResendInvite}
                      disabled={resendingInvite}
                      className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendingInvite ? 'Sending...' : 'Resend Invitation Email'}
                    </button>
                  </div>
                )}
                
                {/* Notify Admin Button */}
                {errorType === 'admin_approval_pending' && currentInvite && (
                  <div className="mt-3">
                    <button
                      onClick={handleNotifyAdmin}
                      disabled={notifyingAdmin}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {notifyingAdmin ? 'Sending Request...' : 'Request Admin Approval'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isFromInvitation && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Contact your administrator for an invitation
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}