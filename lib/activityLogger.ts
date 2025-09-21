// Utility function to log activities
export const logActivity = async (activity: {
  user_id?: string
  user_email: string
  company_id?: string
  action: string
  description: string
  metadata?: any
}) => {
  try {
    const response = await fetch('/api/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity)
    })

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text())
    }
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

// Predefined activity types
export const ActivityTypes = {
  USER_APPROVED: 'user_approved',
  USER_LOGIN: 'user_login',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_ACCEPTED: 'invitation_accepted',
  INVITATION_COMPLETED: 'invitation_completed',
  COMPANY_CREATED: 'company_created',
  USER_CREATED: 'user_created'
} as const

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes]
