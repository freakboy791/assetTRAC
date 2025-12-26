import { useState, useEffect } from 'react'

/**
 * Public Android App Installation Page
 * No authentication required - accessible to anyone via URL or QR code
 * Route: /android-app/install
 */
export default function AndroidAppInstallPage() {
  const [downloading, setDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    // Detect if user is on Android device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const android = /android/i.test(userAgent)
    setIsAndroid(android)
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadComplete(false)

    try {
      // Get the APK file URL
      const apkUrl = '/api/android-app/download'
      
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
      alert('Failed to download APK. Please try again.')
      setDownloading(false)
    }
  }

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
                    Go to <strong>Settings → Security</strong> and enable <strong>"Install from Unknown Sources"</strong> or <strong>"Install unknown apps"</strong>
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
                    After installation, contact your IT administrator with your device's Android ID to register it in the system.
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

        {/* Features Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">App Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">No Permissions Required</h3>
                <p className="text-sm text-gray-600">Works immediately after installation - no user approval needed</p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Automatic Check-ins</h3>
                <p className="text-sm text-gray-600">Runs silently in the background, checking in every 15-30 minutes</p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Auto-start on Boot</h3>
                <p className="text-sm text-gray-600">Automatically starts when your device powers on</p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Zero User Interaction</h3>
                <p className="text-sm text-gray-600">Completely silent operation - no notifications or interruptions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-indigo-50 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Need Help?</h3>
          <p className="text-gray-700 mb-4">
            Contact your IT administrator for assistance with device registration or if you encounter any issues during installation.
          </p>
          <p className="text-sm text-gray-600">
            After installation, your device will need to be registered in the AssetTRAC system before check-ins begin.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} AssetTRAC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
