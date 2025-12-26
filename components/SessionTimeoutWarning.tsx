// Session timeout warning component
import { useState, useEffect } from 'react'

interface SessionTimeoutWarningProps {
  show: boolean
  timeRemaining: string
  onExtend: () => void
  onDismiss: () => void
}

export default function SessionTimeoutWarning({ 
  show, 
  timeRemaining, 
  onExtend, 
  onDismiss 
}: SessionTimeoutWarningProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
    } else {
      // Add fade out animation
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${
      show ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Session Timeout Warning
          </h3>
        </div>
        
        <div className="px-6 py-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">
                Your session will expire in <span className="font-semibold text-yellow-600" key={timeRemaining}>{timeRemaining}</span> due to inactivity.
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Click "Stay Logged In" to extend your session, or you will be automatically logged out.
          </p>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Dismiss
          </button>
          <button
            onClick={onExtend}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}
