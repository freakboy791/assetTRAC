/**
 * Utility function to get consistent user display name across all pages
 * Always returns "First Name Last Name" format when both are available
 */
export const getUserDisplayName = (user: any): string => {
  if (!user) {
    return 'User'
  }

  // Priority 1: first_name and last_name from profiles table (most reliable)
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }

  // Priority 2: first_name only
  if (user.first_name) {
    return user.first_name
  }

  // Priority 3: last_name only
  if (user.last_name) {
    return user.last_name
  }

  // Priority 4: user_metadata (from auth, less reliable)
  if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
    return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
  }

  if (user.user_metadata?.first_name) {
    return user.user_metadata.first_name
  }

  // Priority 5: email as fallback
  if (user.email) {
    return user.email
  }

  return 'User'
}

