// Session timeout management utility
// Handles inactivity-based session expiration and automatic logout

interface SessionTimeoutConfig {
  timeoutMinutes: number
  warningMinutes: number
  checkIntervalMs: number
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  timeoutMinutes: 30, // 30 minutes of inactivity
  warningMinutes: 5,  // Show warning 5 minutes before timeout
  checkIntervalMs: 30000 // Check every 30 seconds
}

class SessionTimeoutManager {
  private config: SessionTimeoutConfig
  private lastActivity: number
  private warningShown: boolean
  private timeoutId: NodeJS.Timeout | null
  private warningTimeoutId: NodeJS.Timeout | null
  private checkIntervalId: NodeJS.Timeout | null
  private onTimeout: (() => void) | null
  private onWarning: (() => void) | null | undefined

  constructor(config: Partial<SessionTimeoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.lastActivity = Date.now()
    this.warningShown = false
    this.timeoutId = null
    this.warningTimeoutId = null
    this.checkIntervalId = null
    this.onTimeout = null
    this.onWarning = null
  }

  // Start monitoring user activity
  start(onTimeout: () => void, onWarning?: () => void) {
    this.onTimeout = onTimeout
    this.onWarning = onWarning
    this.lastActivity = Date.now()
    this.warningShown = false

    // Clear any existing timeouts
    this.clearTimeouts()

    // Set up activity listeners
    this.setupActivityListeners()

    // Start the timeout check interval
    this.startTimeoutCheck()

    // Set initial timeout
    this.setTimeout()
  }

  // Stop monitoring
  stop() {
    this.clearTimeouts()
    this.removeActivityListeners()
  }

  // Reset the timeout (call when user is active)
  reset() {
    this.lastActivity = Date.now()
    this.warningShown = false
    this.clearTimeouts()
    this.setTimeout()
  }

  // Get time remaining until timeout (in milliseconds)
  getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000
    return Math.max(0, timeoutMs - elapsed)
  }

  // Get time remaining until warning (in milliseconds)
  getWarningTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity
    const warningMs = (this.config.timeoutMinutes - this.config.warningMinutes) * 60 * 1000
    return Math.max(0, warningMs - elapsed)
  }

  private setupActivityListeners() {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ]

    const activityHandler = () => {
      this.reset()
    }

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true)
    })

    // Store the handler for cleanup
    ;(this as any).activityHandler = activityHandler
  }

  private removeActivityListeners() {
    const activityHandler = (this as any).activityHandler
    if (activityHandler) {
      const events = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
      ]
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true)
      })
      ;(this as any).activityHandler = null
    }
  }

  private setTimeout() {
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000
    const warningMs = (this.config.timeoutMinutes - this.config.warningMinutes) * 60 * 1000

    // Set warning timeout
    this.warningTimeoutId = setTimeout(() => {
      if (this.onWarning && !this.warningShown) {
        this.warningShown = true
        this.onWarning()
      }
    }, warningMs)

    // Set main timeout
    this.timeoutId = setTimeout(() => {
      if (this.onTimeout) {
        this.onTimeout()
      }
    }, timeoutMs)
  }

  private startTimeoutCheck() {
    this.checkIntervalId = setInterval(() => {
      const timeRemaining = this.getTimeRemaining()
      if (timeRemaining <= 0) {
        this.clearTimeouts()
        if (this.onTimeout) {
          this.onTimeout()
        }
      }
    }, this.config.checkIntervalMs)
  }

  private clearTimeouts() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId)
      this.warningTimeoutId = null
    }
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
    }
  }
}

// Global session timeout manager instance
let sessionTimeoutManager: SessionTimeoutManager | null = null

// Initialize session timeout for a tab
export function initializeSessionTimeout(
  onTimeout: () => void, 
  onWarning?: () => void,
  config?: Partial<SessionTimeoutConfig>
) {
  // Clean up existing manager
  if (sessionTimeoutManager) {
    sessionTimeoutManager.stop()
  }

  // Create new manager
  sessionTimeoutManager = new SessionTimeoutManager(config)
  sessionTimeoutManager.start(onTimeout, onWarning)
}

// Stop session timeout monitoring
export function stopSessionTimeout() {
  if (sessionTimeoutManager) {
    sessionTimeoutManager.stop()
    sessionTimeoutManager = null
  }
}

// Reset session timeout (call when user is active)
export function resetSessionTimeout() {
  if (sessionTimeoutManager) {
    sessionTimeoutManager.reset()
  }
}

// Get time remaining until timeout
export function getSessionTimeRemaining(): number {
  if (sessionTimeoutManager) {
    return sessionTimeoutManager.getTimeRemaining()
  }
  return 0
}

// Get time remaining until warning
export function getSessionWarningTimeRemaining(): number {
  if (sessionTimeoutManager) {
    return sessionTimeoutManager.getWarningTimeRemaining()
  }
  return 0
}

// Check if session is about to expire (within warning period)
export function isSessionExpiringSoon(): boolean {
  if (sessionTimeoutManager) {
    return sessionTimeoutManager.getWarningTimeRemaining() <= 0 && 
           sessionTimeoutManager.getTimeRemaining() > 0
  }
  return false
}

// Format time remaining as human-readable string
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}
