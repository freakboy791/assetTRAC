import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Public Android App Installation Page
 * Requires a valid download token for security
 * Route: /android-app/install?token=XXXXX
 */
export default function AndroidAppInstallPage() {
  const router = useRouter()
  const [token, setToken] = useState<string>('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Get token from URL query parameter
    const { token: urlToken } = router.query
    if (urlToken && typeof urlToken === 'string') {
      setToken(urlToken)
      validateToken(urlToken)
    }

    // Detect if user is on Android device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const android = /android/i.test(userAgent)
    setIsAndroid(android)
  }, [router.query])

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`/api/android-app/validate-token?token=${tokenToValidate}`)
      const data = await response.json()
      
      if (response.ok && data.valid) {
        setTokenValid(true)
        setError('')
      } else {
        setTokenValid(false)
        setError(data.message || 'Invalid or expired download token')
      }
    } catch (error) {
      setTokenValid(false)
      setError('Failed to validate token. Please try again.')
    }
  }

  const handleDownload = async () => {
    if (!token || !tokenValid) {
      setError('Please enter a valid download token')
      return
    }

    setDownloading(true)
    setDownloadComplete(false)
    setError('')

    try {
      // Get the APK file URL with token
      const apkUrl = `/api/android-app/download?token=${token}`
      
      // First, check if the file exists by making a HEAD request
      const checkResponse = await fetch(apkUrl, { method: 'HEAD' })
      
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => ({ message: 'APK file not available' }))
        setError(`APK file not available: ${errorData.message || 'The Android app has not been built yet. Please contact your administrator.'}`)
        setDownloading(false)
        return
      }
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = apkUrl
      link.download = 'assettrac-checkin.apk'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Wait a moment for download to start
      await new Promise(resolve => setTimeout(resolve, 1000))

      setDownloadComplete(true)
      setDownloading(false)
    } catch (error) {
      console.error('Error downloading APK:', error)
      setError('Failed to download APK. Please try again or contact your administrator.')
      setDownloading(false)
    }
  }

  // Show token input form if no token in URL
  if (!token && router.isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">AT</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AssetTRAC</h1>
            <p className="text-gray-600">Android App Download</p>
          </div>

          <div className="mb-6">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Download Token
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token provided by administrator"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Contact your IT administrator to obtain a download token
            </p>
          </div>

          <button
            onClick={() => validateToken(token)}
            disabled={!token.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Validate Token
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show loading while validating
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating token...</p>
        </div>
      </div>
    )
  }

  // Show error if token invalid
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Token</h1>
            <p className="text-gray-600 mb-4">{error || 'The download token is invalid or has expired.'}</p>
          </div>
          <button
            onClick={() => {
              setToken('')
              setTokenValid(null)
              router.push('/android-app/install')
            }}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show download page if token is valid
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Simple Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg font-bold text-white">AT</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AssetTRAC</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mx-auto h-24 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Device Check-in App</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Download and install the Android app to enable automatic device check-ins for asset tracking
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-8">
          {/* Download Button */}
          <div className="text-center mb-8">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`inline-flex items-center px-10 py-5 text-xl font-semibold rounded-xl transition-all transform ${
                downloading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-2xl hover:scale-105'
              }`}
            >
              {downloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download & Install
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {downloadComplete && (
            <div className="mb-8 p-5 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-green-800 font-semibold text-lg">Download complete!</p>
                  {isAndroid && (
                    <p className="text-green-700 text-sm mt-1">
                      Tap the notification in your device's notification bar to install the app.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Instructions */}
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Setup Guide</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold mr-4">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Enable Installation</h3>
                  <p className="text-sm text-gray-600">
                    Go to <strong>Settings → Security</strong> and enable <strong>"Install from Unknown Sources"</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold mr-4">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Download & Install</h3>
                  <p className="text-sm text-gray-600">
                    {isAndroid 
                      ? "Tap the download button above, then tap the notification when download completes to install."
                      : "Click the download button, transfer the APK to your Android device, then open and install it."
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold mr-4">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Get Your Device ID</h3>
                  <p className="text-sm text-gray-600">
                    After installation, contact your IT administrator with your device's Android ID to register it.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold mr-4">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Automatic Check-ins</h3>
                  <p className="text-sm text-gray-600">
                    Once registered, the app will automatically check in every 15-30 minutes. No permissions required!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
