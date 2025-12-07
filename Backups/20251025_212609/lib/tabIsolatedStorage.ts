// Tab-isolated storage using sessionStorage with unique tab identifiers
// This ensures each browser tab/window has completely isolated data

interface TabStorageData {
  [key: string]: any
}

// Generate a unique tab ID that persists for the tab's lifetime
function getTabId(): string {
  // Try to get existing tab ID from sessionStorage
  let tabId = sessionStorage.getItem('_tabId')
  
  if (!tabId) {
    // Generate a new unique tab ID
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('_tabId', tabId)
  }
  
  return tabId
}

// Get tab-specific storage key
function getTabKey(key: string): string {
  return `_tab_${getTabId()}_${key}`
}

// Store data specific to this tab
export function setTabStorage(key: string, value: any): void {
  try {
    const tabKey = getTabKey(key)
    sessionStorage.setItem(tabKey, JSON.stringify(value))
  } catch (error) {
    console.error('Error setting tab storage:', error)
  }
}

// Get data specific to this tab
export function getTabStorage(key: string): any {
  try {
    const tabKey = getTabKey(key)
    const value = sessionStorage.getItem(tabKey)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Error getting tab storage:', error)
    return null
  }
}

// Clear data specific to this tab
export function clearTabStorage(key: string): void {
  try {
    const tabKey = getTabKey(key)
    sessionStorage.removeItem(tabKey)
  } catch (error) {
    console.error('Error clearing tab storage:', error)
  }
}

// Clear all data for this tab
export function clearAllTabStorage(): void {
  try {
    const tabId = getTabId()
    const keysToRemove: string[] = []
    
    // Find all keys that belong to this tab
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(`_tab_${tabId}_`)) {
        keysToRemove.push(key)
      }
    }
    
    // Remove all tab-specific keys
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing all tab storage:', error)
  }
}

// Get current tab ID (for debugging)
export function getCurrentTabId(): string {
  return getTabId()
}

// Check if we're in a new tab (no existing tab ID)
export function isNewTab(): boolean {
  return !sessionStorage.getItem('_tabId')
}
