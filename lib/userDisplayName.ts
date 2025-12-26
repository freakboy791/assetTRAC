/**
 * Utility function to get consistent user display name across all pages
 * Always returns "First Name Last Name" format when both are available
 */
export const getUserDisplayName = (user: any): string => {
  if (!user) {
    return 'User'
  }

  // Helper to check if a value is a non-empty string
  const hasValue = (val: any): boolean => {
    return val && typeof val === 'string' && val.trim().length > 0
  }

  // Priority 1: first_name and last_name from profiles table (most reliable)
  if (hasValue(user.first_name) && hasValue(user.last_name)) {
    return `${user.first_name.trim()} ${user.last_name.trim()}`
  }

  // Priority 2: first_name only
  if (hasValue(user.first_name)) {
    return user.first_name.trim()
  }

  // Priority 3: last_name only
  if (hasValue(user.last_name)) {
    return user.last_name.trim()
  }

  // Priority 4: user_metadata (from auth, less reliable)
  if (hasValue(user.user_metadata?.first_name) && hasValue(user.user_metadata?.last_name)) {
    return `${user.user_metadata.first_name.trim()} ${user.user_metadata.last_name.trim()}`
  }

  if (hasValue(user.user_metadata?.first_name)) {
    return user.user_metadata.first_name.trim()
  }

  if (hasValue(user.user_metadata?.last_name)) {
    return user.user_metadata.last_name.trim()
  }

  // Priority 5: Check for full_name in user_metadata
  if (hasValue(user.user_metadata?.full_name)) {
    return user.user_metadata.full_name.trim()
  }

  // Priority 6: email as fallback
  if (user.email) {
    return user.email
  }

  return 'User'
}

