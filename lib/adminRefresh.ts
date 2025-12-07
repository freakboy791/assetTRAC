/**
 * Admin Dashboard Refresh Utility
 * 
 * This utility provides functions to trigger admin dashboard refreshes
 * for specific events and actions throughout the application.
 */

export type AdminAction = 
  | 'invite_sent'
  | 'invite_accepted' 
  | 'company_created'
  | 'user_approved'
  | 'user_denied'
  | 'user_first_login'
  | 'navigation_back'
  | 'manual_refresh'

/**
 * Triggers a refresh of the admin dashboard
 * @param action - The action that triggered the refresh
 * @param details - Optional additional details about the action
 */
export const triggerAdminRefresh = (action: AdminAction, details?: any) => {
  // Only run on client side and when window is available
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return
  }
  
  console.log('Admin Refresh: Triggering refresh for action:', action, details)
  
  // Add a small delay to ensure database operations are committed
  setTimeout(() => {
    try {
      // Dispatch a custom event that the admin dashboard will listen for
      const event = new CustomEvent('adminAction', {
        detail: {
          action,
          details,
          timestamp: new Date().toISOString()
        }
      })
      
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Admin Refresh: Error dispatching event:', error)
    }
  }, 500) // 500ms delay to ensure database operations are committed
}

/**
 * Triggers admin refresh for invite-related actions
 */
export const triggerInviteRefresh = {
  sent: () => triggerAdminRefresh('invite_sent'),
  accepted: () => triggerAdminRefresh('invite_accepted'),
}

/**
 * Triggers admin refresh for company-related actions
 */
export const triggerCompanyRefresh = {
  created: () => triggerAdminRefresh('company_created'),
}

/**
 * Triggers admin refresh for user-related actions
 */
export const triggerUserRefresh = {
  approved: () => triggerAdminRefresh('user_approved'),
  denied: () => triggerAdminRefresh('user_denied'),
  firstLogin: () => triggerAdminRefresh('user_first_login'),
}

/**
 * Triggers admin refresh for navigation actions
 */
export const triggerNavigationRefresh = {
  back: () => triggerAdminRefresh('navigation_back'),
}

/**
 * Triggers admin refresh for manual actions
 */
export const triggerManualRefresh = () => triggerAdminRefresh('manual_refresh')
