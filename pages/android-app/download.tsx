import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId } from '../../lib/sessionValidator'
import { validateAndRefreshSession, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'

export default function AndroidAppDownloadPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [hasAssetAccess, setHasAssetAccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)

  // Session timeout management
  const {
    showWarning,
    timeRemainingFormatted,
    extendSession,
    dismissWarning
  } = useSessionTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    enabled: !loading && !!user
  })

  useEffect(() => {
    // Detect if user is on Android device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const android = /android/i.test(userAgent)
    setIsAndroid(android)

    const checkUser = async () => {
      try {
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError) {
          handleSessionError(sessionError)
          return
        }
        
        if (validatedSession) {
          try {
            const response = await fetch('/api/auth/getUser', {
              headers: {
                'Authorization': `Bearer ${validatedSession.accessToken}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              setUser(data.user)
              setIsAdmin(data.isAdmin || false)
              setIsOwner(data.isOwner || false)
              setUserRoles(data.roles || [])
              
              // Check if user has asset management access
              const hasAccess = data.isAdmin || 
                               data.isOwner || 
                               (data.roles || []).some((role: string) => 
                                 role === 'tech' || 
                                 role === 'manager-asset' || 
                                 role === 'manager-both' || 
                                 role === 'viewer-asset' || 
                                 role === 'viewer-both'
                               )
              setHasAssetAccess(hasAccess)
              
              // Auto-generate token for users with asset access
              if (hasAccess) {
                generateDownloadToken(validatedSession.accessToken)
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
          }
        } else {
          window.location.href = '/'
          return
        }
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const getDisplayName = () => {
    return getUserDisplayName(user)
  }

  const generateDownloadToken = async (accessToken: string): Promise<string | null> => {
    try {
      setGeneratingToken(true)
      const response = await fetch('/api/admin/generate-download-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresInDays: 1, // Short expiration for auto-generated tokens
          singleUse: false // Allow multiple downloads with same token
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setToken(data.token)
        return data.token
      } else {
        console.error('Failed to generate token:', data.error)
        return null
      }
    } catch (error) {
      console.error('Error generating token:', error)
      return null
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const tabId = getTabId()
      clearTabSession(tabId)
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/'
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadComplete(false)

    try {
      // If we have a token, use it. Otherwise, generate one first
      let downloadToken = token
      if (!downloadToken && hasAssetAccess) {
        const tabId = getTabId()
        const { session: validatedSession } = await validateAndRefreshSession(tabId)
        if (validatedSession?.accessToken) {
          downloadToken = await generateDownloadToken(validatedSession.accessToken)
        }
      }

      // Get the APK file URL with token
      const apkUrl = downloadToken 
        ? `/api/android-app/download?token=${downloadToken}`
        : '/api/android-app/download'
      
      // First, check if the file exists by making a HEAD request
      const checkResponse = await fetch(apkUrl, { method: 'HEAD' })
      
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => ({ message: 'APK file not available' }))
        alert(`APK file not available: ${errorData.message || 'The Android app has not been built yet. Please contact your administrator.'}`)
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

      // If on Android, try to trigger installation intent
      if (isAndroid) {
        // Try to open the file with Android's package installer
        // Note: This will still require user approval, but it opens the installer
        try {
          // For Android, we can try to use a file:// URL or intent
          // However, due to browser security, we can't directly trigger installation
          // The user will need to tap the downloaded file in their notification
          console.log('Download started. Please tap the notification to install.')
        } catch (error) {
          console.error('Error triggering installation:', error)
        }
      }

      setDownloadComplete(true)
      setDownloading(false)
    } catch (error) {
      console.error('Error downloading APK:', error)
      alert('Failed to download APK. The APK file may not be available yet. Please contact your administrator.')
      setDownloading(false)
    }
  }

  if (loading) {
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow">
        <div className="max-w-[95%] 2xl:max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
          {/* Mobile Layout */}
          <div className="block sm:hidden py-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AT</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-gray-700 truncate">Welcome, {getDisplayName()}</span>
              {userRoles.length > 0 && (
                <span className="text-xs text-gray-500 truncate">Role: {userRoles.join(', ')}</span>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-bold text-white">AT</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">assetTRAC</h1>
              </div>
              <nav className="flex space-x-1">
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  Dashboard
                </Link>
                <Link href="/assets" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  Assets
                </Link>
                <Link href="/financials" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">
                  Financials
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {getDisplayName()}</span>
              {userRoles.length > 0 && (
                <span className="text-xs text-gray-500">({userRoles.join(', ')})</span>
              )}
              <button
                onClick={() => window.location.href = '/profile'}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
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

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link></li>
              <li>/</li>
              <li className="text-gray-900">Android App Download</li>
            </ol>
          </nav>

          {/* Download Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="mx-auto h-20 w-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AssetTRAC Check-in App</h1>
              <p className="text-gray-600">Download and install the Android app for automatic device check-ins</p>
            </div>

            {/* Download Button */}
            <div className="text-center mb-8">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className={`inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg transition-all ${
                  downloading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download & Install APK
                  </>
                )}
              </button>
            </div>

            {downloadComplete && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-800 font-medium">Download complete!</p>
                </div>
                {isAndroid && (
                  <p className="text-green-700 text-sm mt-2 ml-7">
                    Tap the notification in your device's notification bar to install the app.
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Instructions</h2>
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">1</span>
                  <div>
                    <p className="font-medium">Enable Installation from Unknown Sources</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Go to Settings → Security → Enable "Install from Unknown Sources" or "Install unknown apps"
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">2</span>
                  <div>
                    <p className="font-medium">Download the APK</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Click the download button above. The APK file will be downloaded to your device.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">3</span>
                  <div>
                    <p className="font-medium">Install the App</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {isAndroid 
                        ? "Tap the download notification, then tap 'Install' when prompted."
                        : "Open the downloaded APK file and follow the installation prompts."
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">4</span>
                  <div>
                    <p className="font-medium">Register Your Device</p>
                    <p className="text-sm text-gray-600 mt-1">
                      After installation, get your Android ID and register it in AssetTRAC. See instructions below.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Android ID */}
            <div className="border-t mt-6 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Your Android ID</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  After installing the app, you need to register your device in AssetTRAC. To do this, you'll need your device's Android ID:
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-sm text-gray-900">Option 1: Using ADB (Recommended for IT)</p>
                    <code className="block mt-1 p-2 bg-gray-800 text-green-400 rounded text-xs">
                      adb shell settings get secure android_id
                    </code>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Option 2: Check Logcat</p>
                    <code className="block mt-1 p-2 bg-gray-800 text-green-400 rounded text-xs">
                      adb logcat | grep CheckInWorker
                    </code>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Once you have the Android ID, create a new asset in AssetTRAC and enter the Android ID in the <strong>Serial Number</strong> field.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="border-t mt-6 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">App Features</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Automatic check-ins every 15-30 minutes</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No permissions required - works immediately</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Runs silently in the background</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Auto-starts on device boot</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        show={showWarning}
        timeRemaining={timeRemainingFormatted}
        onExtend={extendSession}
        onDismiss={dismissWarning}
      />
    </div>
  )
}
