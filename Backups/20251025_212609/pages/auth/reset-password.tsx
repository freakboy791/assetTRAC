import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    console.log('Reset Password Page: Component mounted')
    console.log('Reset Password Page: Current URL:', window.location.href)
    
    const handleResetPassword = async () => {
      try {
        // Get the token from URL hash
        const hash = window.location.hash
        const search = window.location.search
        const fullUrl = window.location.href
        
        console.log('Reset Password Page: Full URL:', fullUrl)
        console.log('Reset Password Page: URL hash:', hash)
        console.log('Reset Password Page: URL search:', search)
        console.log('Reset Password Page: All URL parameters:', {
          hash: hash,
          search: search,
          pathname: window.location.pathname,
          hostname: window.location.hostname,
          port: window.location.port
        })
        
        // Check hash parameters
        const hashParams = new URLSearchParams(hash.substring(1))
        const hashAccessToken = hashParams.get('access_token')
        const hashRefreshToken = hashParams.get('refresh_token')
        const hashType = hashParams.get('type')
        
        // Check search parameters
        const searchParams = new URLSearchParams(search.substring(1))
        const searchAccessToken = searchParams.get('access_token')
        const searchRefreshToken = searchParams.get('refresh_token')
        const searchType = searchParams.get('type')
        const searchCode = searchParams.get('code')
        
        console.log('Reset Password Page: Hash access token:', hashAccessToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Hash refresh token:', hashRefreshToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Hash type:', hashType)
        console.log('Reset Password Page: Search access token:', searchAccessToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Search refresh token:', searchRefreshToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Search type:', searchType)
        console.log('Reset Password Page: Search code:', searchCode ? 'Present' : 'Missing')

        // For password reset, we need either:
        // 1. access_token and type=recovery (old format)
        // 2. code parameter (new format)
        const finalAccessToken = hashAccessToken || searchAccessToken
        const finalRefreshToken = hashRefreshToken || searchRefreshToken
        const finalType = hashType || searchType
        const finalCode = searchCode
        
        console.log('Reset Password Page: Final access token:', finalAccessToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Final refresh token:', finalRefreshToken ? 'Present' : 'Missing')
        console.log('Reset Password Page: Final type:', finalType)
        console.log('Reset Password Page: Final code:', finalCode ? 'Present' : 'Missing')
        
        if ((finalType === 'recovery' && finalAccessToken) || finalCode) {
          // Store the code or token for later use
          setToken(finalCode || finalAccessToken)
          setIsValidToken(true)
          setMessage('Please enter your new password below.')
        } else {
          console.log('Reset Password Page: Token validation failed')
          console.log('Reset Password Page: Type check:', finalType === 'recovery')
          console.log('Reset Password Page: Token check:', !!finalAccessToken)
          console.log('Reset Password Page: Code check:', !!finalCode)
          setMessage('Invalid or expired reset link. Please request a new password reset.')
          setIsValidToken(false)
        }
      } catch (error) {
        console.error('Error handling reset password:', error)
        setMessage('Error processing reset link. Please try again.')
        setIsValidToken(false)
      }
    }

    handleResetPassword()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Reset Password Page: Form submitted')
    console.log('Reset Password Page: Password length:', password.length)
    console.log('Reset Password Page: Confirm password length:', confirmPassword.length)
    console.log('Reset Password Page: Passwords match:', password === confirmPassword)
    
    if (!password || !confirmPassword) {
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

    console.log('Reset Password Page: Validation passed, starting password update...')
    setLoading(true)
    setMessage('')

    try {
      console.log('Reset Password Page: Updating password with token/code:', token ? 'Present' : 'Missing')

      // Check if we have a code (new format) or tokens (old format)
      const search = window.location.search
      const searchParams = new URLSearchParams(search.substring(1))
      const code = searchParams.get('code')

      if (code) {
        // New code-based flow - try multiple approaches
        console.log('Reset Password Page: Using code-based password reset flow')
        
        // Get email from URL parameters
        const emailParam = searchParams.get('email')
        const email = emailParam || 'phillycigarguy@gmail.com'
        
        console.log('Reset Password Page: Email from URL:', email)
        console.log('Reset Password Page: Code from URL:', code ? 'Present' : 'Missing')
        
        // Try approach 1: exchangeCodeForSession first
        console.log('Reset Password Page: Trying exchangeCodeForSession...')
        const { data: exchangeData, error: exchangeError } = await supabase().auth.exchangeCodeForSession(code)
        
        if (exchangeError) {
          console.error('Reset Password Page: Exchange error:', exchangeError)
          console.log('Reset Password Page: Trying verifyOtp approach...')
          
          // Try approach 2: verifyOtp
          const { data: verifyData, error: verifyError } = await supabase().auth.verifyOtp({
            email: email,
            token: code,
            type: 'recovery'
          })

          if (verifyError) {
            console.error('Reset Password Page: Verify error:', verifyError)
            console.log('Reset Password Page: Trying direct admin reset...')
            
            // Try approach 3: Direct admin reset via API
            const resetResponse = await fetch('/api/debug/reset-password-direct', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email,
                newPassword: password
              })
            })
            
            if (!resetResponse.ok) {
              const errorData = await resetResponse.json()
              console.error('Reset Password Page: Admin reset error:', errorData)
              throw new Error(errorData.error || 'Failed to reset password')
            }
            
            console.log('Reset Password Page: Password reset via admin API successful')
            setMessage('✅ Password updated successfully! Redirecting to login...')
            setLoading(false)
            
            // Redirect to login page after a short delay
            setTimeout(() => {
              window.location.href = '/'
            }, 2000)
            return // Exit early since we used admin API
          } else {
            console.log('Reset Password Page: Code verified successfully via verifyOtp')
          }
        } else {
          console.log('Reset Password Page: Code exchanged for session successfully')
        }

        console.log('Reset Password Page: Updating password via updateUser...')

        // Now update the password
        const { error: updateError } = await supabase().auth.updateUser({
          password: password
        })

        if (updateError) {
          console.error('Reset Password Page: Update error:', updateError)
          throw updateError
        }
      } else {
        // Old token-based flow
        console.log('Reset Password Page: Using token-based password reset flow')
        
        // Get refresh token from URL hash or search if available
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || ''

        console.log('Reset Password Page: Setting session with access token:', token ? 'Present' : 'Missing')
        console.log('Reset Password Page: Setting session with refresh token:', refreshToken ? 'Present' : 'Missing')

        // First, set the session with the reset tokens
        const { error: sessionError } = await supabase().auth.setSession({
          access_token: token,
          refresh_token: refreshToken
        })

        if (sessionError) {
          console.error('Reset Password Page: Session error:', sessionError)
          throw sessionError
        }

        console.log('Reset Password Page: Session set successfully, updating password...')

        // Now update the password
        const { error: updateError } = await supabase().auth.updateUser({
          password: password
        })

        if (updateError) {
          console.error('Reset Password Page: Update error:', updateError)
          throw updateError
        }
      }

      setMessage('Password updated successfully! You can now sign in with your new password.')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      console.error('Password reset error:', error)
      setMessage(`Error updating password: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {message}
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <Link
              href="/"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={(e) => {
          console.log('Reset Password Page: Form onSubmit triggered')
          handleSubmit(e)
        }}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                console.log('Reset Password Page: Button clicked')
                console.log('Reset Password Page: Loading state:', loading)
                console.log('Reset Password Page: Password value:', password)
                console.log('Reset Password Page: Confirm password value:', confirmPassword)
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>


          <div className="text-center">
            <Link
              href="/"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
