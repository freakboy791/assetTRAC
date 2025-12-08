import { useState, useEffect } from 'react'
import Link from 'next/link'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId } from '../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'

interface Asset {
  id: string
  name: string
  type: string | null
  make: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  cost: number | null
  depreciated_value: number | null
  note: string | null
  status: string | null
  container_id: string | null
  assigned_to: string | null
  company_id: string
  created_at: string
  updated_at: string
}

interface AssetContainer {
  id: string
  name: string
  description: string | null
  company_id: string
  created_by: string
  created_at: string
  updated_at: string
  parent_container_id: string | null
  user_id: string | null
}

interface ContainerGroup {
  container: AssetContainer | null // null for default/unassigned container
  assets: Asset[]
  userGroups?: UserAssetGroup[] // Nested user groups within container
}

interface UserAssetGroup {
  user: {
    id: string
    display_name: string
    email: string
  }
  assets: Asset[]
}

export default function AssetsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [containers, setContainers] = useState<AssetContainer[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [filterByUser, setFilterByUser] = useState<string>('')
  const [filterByContainer, setFilterByContainer] = useState<string>('')
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set())
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [showCreateContainer, setShowCreateContainer] = useState(false)
  const [newContainerName, setNewContainerName] = useState('')
  const [newContainerDescription, setNewContainerDescription] = useState('')
  const [newContainerParentId, setNewContainerParentId] = useState('')
  const [newContainerUserId, setNewContainerUserId] = useState('')
  const [isViewer, setIsViewer] = useState(false)
  const [editingContainer, setEditingContainer] = useState<string | null>(null)
  const [editContainerName, setEditContainerName] = useState('')
  const [editContainerDescription, setEditContainerDescription] = useState('')
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAssetForm, setEditAssetForm] = useState({
    name: '',
    type: '',
    make: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    cost: '',
    depreciated_value: '',
    note: '',
    status: 'active'
  })

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
              // Always use the user data from API which includes profile data (first_name, last_name)
              setUser(data.user)
              setIsAdmin(data.isAdmin || false)
              setIsOwner(data.isOwner || false)
              setUserRoles(data.roles || [])
              setIsViewer(data.roles?.some((role: string) => role.startsWith('viewer')) || false)
            } else {
              // If API fails, retry once or use session data
              console.warn('getUser API failed, retrying...')
              const retryResponse = await fetch('/api/auth/getUser', {
                headers: {
                  'Authorization': `Bearer ${validatedSession.accessToken}`
                }
              })
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                setUser(retryData.user)
                setIsAdmin(retryData.isAdmin || false)
                setIsOwner(retryData.isOwner || false)
                setUserRoles(retryData.roles || [])
                setIsViewer(retryData.roles?.some((role: string) => role.startsWith('viewer')) || false)
              } else {
                // Fallback to session user (will show email if no profile data)
                setUser(validatedSession.user)
                setIsAdmin(validatedSession.userData.isAdmin || false)
                setIsOwner(validatedSession.userData.isOwner || false)
                setUserRoles(validatedSession.userData.roles || [])
                setIsViewer(validatedSession.userData.roles?.some((role: string) => role.startsWith('viewer')) || false)
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
            // Retry once on error
            try {
              const retryResponse = await fetch('/api/auth/getUser', {
                headers: {
                  'Authorization': `Bearer ${validatedSession.accessToken}`
                }
              })
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                setUser(retryData.user)
                setIsAdmin(retryData.isAdmin || false)
                setIsOwner(retryData.isOwner || false)
                setUserRoles(retryData.roles || [])
                setIsViewer(retryData.roles?.some((role: string) => role.startsWith('viewer')) || false)
              } else {
                setUser(validatedSession.user)
                setIsAdmin(validatedSession.userData.isAdmin || false)
                setIsOwner(validatedSession.userData.isOwner || false)
                setUserRoles(validatedSession.userData.roles || [])
                setIsViewer(validatedSession.userData.roles?.some((role: string) => role.startsWith('viewer')) || false)
              }
            } catch (retryError) {
              setUser(validatedSession.user)
              setIsAdmin(validatedSession.userData.isAdmin || false)
              setIsOwner(validatedSession.userData.isOwner || false)
              setUserRoles(validatedSession.userData.roles || [])
              setIsViewer(validatedSession.userData.roles?.some((role: string) => role.startsWith('viewer')) || false)
            }
          }
          
          setLoading(false)
          
          const { success, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {
            handleSessionError(activityError)
            return
          }
          
          await loadContainers(validatedSession.accessToken)
          await loadAssets(validatedSession.accessToken)
          await loadCompanyUsers(validatedSession.accessToken)
          
          return
        }

        window.location.href = '/'
        return
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const loadContainers = async (accessToken: string) => {
    try {
      const response = await fetch('/api/assets/containers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const loadedContainers = data.containers || []
        
        // Find all containers with "unassigned" in the name (case-insensitive)
        const unassignedContainers = loadedContainers.filter((c: AssetContainer) => 
          c.name.trim().toLowerCase().includes('unassigned')
        )
        
        // Find the one with exact name "Unassigned Assets" or use the first one
        let defaultContainer = unassignedContainers.find((c: AssetContainer) => 
          c.name.trim().toLowerCase() === 'unassigned assets'
        )
        
        // If we have multiple unassigned containers (including exact matches), merge them
        if (unassignedContainers.length > 1) {
          // If no exact match, use the first one and rename it
          if (!defaultContainer) {
            defaultContainer = unassignedContainers[0]
            // Rename it to "Unassigned Assets" and set description
            const renameResponse = await fetch('/api/assets/containers', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                id: defaultContainer.id,
                name: 'Unassigned Assets',
                description: 'Default container for assets without a specific user'
              })
            })
            if (!renameResponse.ok) {
              console.error('Failed to rename default container')
            }
          } else {
            // Ensure the description is set correctly for the existing container
            const correctDescription = 'Default container for assets without a specific user'
            if (!defaultContainer.description || defaultContainer.description !== correctDescription) {
              const updateResponse = await fetch('/api/assets/containers', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                  id: defaultContainer.id,
                  description: correctDescription
                })
              })
              if (updateResponse.ok) {
                // Update the local container object
                defaultContainer.description = correctDescription
              }
            }
          }
          
          // Merge all other unassigned containers into the default
          const duplicates = unassignedContainers.filter((c: AssetContainer) => 
            c.id !== defaultContainer.id
          )
          
          if (duplicates.length > 0) {
            console.warn('Found duplicate unassigned containers, merging...', duplicates)
            // Move assets from duplicates to default container, then delete duplicates
            for (const dup of duplicates) {
              await mergeContainerIntoDefault(accessToken, dup.id, defaultContainer.id)
            }
            // Reload containers after merging
            const reloadResponse = await fetch('/api/assets/containers', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            })
            if (reloadResponse.ok) {
              const reloadData = await reloadResponse.json()
              setContainers(reloadData.containers || [])
              return // Exit early since we reloaded
            }
          }
        } else {
          // Don't create container here - let the API create it when assets are created
          // This prevents duplicate containers from being created
          // Filter out duplicate "unassigned" containers - keep only the exact "Unassigned Assets"
          // Also ensure we only have ONE "Unassigned Assets" container
          const unassignedContainers = loadedContainers.filter((c: AssetContainer) => 
            c.name.trim().toLowerCase() === 'unassigned assets'
          )
          
          // If we have multiple "Unassigned Assets" containers, keep only the first one
          let defaultContainer: AssetContainer | null = null
          if (unassignedContainers.length > 0) {
            defaultContainer = unassignedContainers[0]
            // Ensure the description is set correctly
            if (defaultContainer) {
              const correctDescription = 'Default container for assets without a specific user'
              if (!defaultContainer.description || defaultContainer.description !== correctDescription) {
                const updateResponse = await fetch('/api/assets/containers', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  body: JSON.stringify({
                    id: defaultContainer.id,
                    description: correctDescription
                  })
                })
                if (updateResponse.ok) {
                  // Update the local container object
                  defaultContainer.description = correctDescription
                }
              }
            }
            // Delete the rest
            if (defaultContainer) {
              for (let i = 1; i < unassignedContainers.length; i++) {
                const dup = unassignedContainers[i]
                // Move assets from duplicate to the first one
                const assetsResponse = await fetch('/api/assets', {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (assetsResponse.ok) {
                  const assetsData = await assetsResponse.json()
                  const assetsToMove = (assetsData.assets || []).filter((asset: Asset) => 
                    asset.container_id === dup.id
                  )
                  for (const asset of assetsToMove) {
                    await fetch(`/api/assets/${asset.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                      },
                      body: JSON.stringify({ container_id: defaultContainer.id })
                    })
                  }
                }
              }
            }
              // Delete the duplicate
              await fetch('/api/assets/containers', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ id: dup.id })
              })
            }
            // Reload after cleanup
            const reloadResponse = await fetch('/api/assets/containers', {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (reloadResponse.ok) {
              const reloadData = await reloadResponse.json()
              const reloadedContainers = reloadData.containers || []
              const filtered = reloadedContainers.filter((c: AssetContainer) => {
                const nameLower = c.name.trim().toLowerCase()
                if (nameLower === 'unassigned assets') return true
                if (nameLower.includes('unassigned')) return false
                return true
              })
              setContainers(filtered)
              return
            }
          }
          
          const filteredContainers = loadedContainers.filter((c: AssetContainer) => {
            const nameLower = c.name.trim().toLowerCase()
            // Keep the exact "Unassigned Assets" container
            if (nameLower === 'unassigned assets') return true
            // Remove any other containers with "unassigned" in the name
            if (nameLower.includes('unassigned')) return false
            // Keep all other containers
            return true
          })
          
          // Ensure "Unassigned Assets" container has the correct description
          const unassignedContainer = filteredContainers.find((c: AssetContainer) => 
            c.name.trim().toLowerCase() === 'unassigned assets'
          )
          if (unassignedContainer) {
            const correctDescription = 'Default container for assets without a specific user'
            if (!unassignedContainer.description || unassignedContainer.description !== correctDescription) {
              // Update the description
              const updateResponse = await fetch('/api/assets/containers', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                  id: unassignedContainer.id,
                  description: correctDescription
                })
              })
              if (updateResponse.ok) {
                // Update the local container object
                unassignedContainer.description = correctDescription
              }
            }
          }
          
          setContainers(filteredContainers)
        }
      }
    } catch (error) {
      console.error('Error loading containers:', error)
    }
  }

  const createDefaultContainer = async (accessToken: string) => {
    try {
      const response = await fetch('/api/assets/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: 'Unassigned Assets',
          description: 'Default container for assets without a specific user'
        })
      })
      return response.ok
    } catch (error) {
      console.error('Error creating default container:', error)
      return false
    }
  }

  const mergeContainerIntoDefault = async (accessToken: string, sourceContainerId: string, targetContainerId: string) => {
    try {
      // Move all assets from source container to target container
      const assetsResponse = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        const assetsToMove = (assetsData.assets || []).filter((asset: Asset) => 
          asset.container_id === sourceContainerId
        )
        
        // Move each asset to the default container
        for (const asset of assetsToMove) {
          const moveResponse = await fetch(`/api/assets/${asset.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              container_id: targetContainerId
            })
          })
          if (!moveResponse.ok) {
            console.error(`Failed to move asset ${asset.id}`)
          }
        }
        
        // Delete the duplicate container
        const deleteResponse = await fetch('/api/assets/containers', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            id: sourceContainerId
          })
        })
        
        if (!deleteResponse.ok) {
          console.error(`Failed to delete duplicate container ${sourceContainerId}`)
          const errorData = await deleteResponse.json()
          console.error('Delete error:', errorData)
        }
      }
    } catch (error) {
      console.error('Error merging container:', error)
    }
  }

  const deleteAllContainers = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL containers and move all assets to unassigned status. This action cannot be undone.\n\nAre you sure you want to continue?')) {
      return
    }

    if (!confirm('This is your final warning. All containers will be permanently deleted. Continue?')) {
      return
    }

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      // Get all containers
      const response = await fetch('/api/assets/containers', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (!response.ok) {
        alert('Failed to load containers')
        return
      }

      const data = await response.json()
      const allContainers = data.containers || []

      if (allContainers.length === 0) {
        alert('No containers to delete')
        return
      }

      // First, move all assets to unassigned (container_id = null)
      const assetsResponse = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        const allAssets = assetsData.assets || []
        
        // Move all assets with containers to unassigned
        const assetsToUnassign = allAssets.filter((asset: Asset) => asset.container_id !== null)
        
        for (const asset of assetsToUnassign) {
          await fetch(`/api/assets/${asset.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${validatedSession.accessToken}`
            },
            body: JSON.stringify({
              container_id: null
            })
          })
        }
      }

      // Now delete all containers
      let deletedCount = 0
      let errorCount = 0

      for (const container of allContainers) {
        try {
          const deleteResponse = await fetch('/api/assets/containers', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${validatedSession.accessToken}`
            },
            body: JSON.stringify({
              id: container.id
            })
          })

          if (deleteResponse.ok) {
            deletedCount++
          } else {
            errorCount++
            console.error(`Failed to delete container ${container.id}`)
          }
        } catch (error) {
          errorCount++
          console.error(`Error deleting container ${container.id}:`, error)
        }
      }

      // Reload containers and assets
      await loadContainers(validatedSession.accessToken)
      await loadAssets(validatedSession.accessToken)

      if (errorCount > 0) {
        alert(`Deleted ${deletedCount} container(s), but ${errorCount} failed. Check console for details.`)
      } else {
        alert(`Successfully deleted all ${deletedCount} container(s). All assets are now unassigned.`)
      }
    } catch (error) {
      console.error('Error deleting all containers:', error)
      alert(`Failed to delete containers: ${error}`)
    }
  }

  const cleanupDuplicateContainers = async () => {
    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      // Get all containers directly from API (not filtered)
      const response = await fetch('/api/assets/containers', {
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (!response.ok) {
        alert('Failed to load containers')
        return
      }

      const data = await response.json()
      const allContainers = data.containers || []

      console.log('All containers from API:', allContainers)

      // Find all containers with "unassigned" in the name (case-insensitive, trimmed)
      const unassignedContainers = allContainers.filter((c: AssetContainer) => {
        const nameLower = c.name.trim().toLowerCase()
        const matches = nameLower.includes('unassigned')
        if (matches) {
          console.log(`Found unassigned container: "${c.name}" (id: ${c.id})`)
        }
        return matches
      })

      console.log(`Total unassigned containers found: ${unassignedContainers.length}`)
      console.log('Unassigned containers:', unassignedContainers.map(c => ({ id: c.id, name: c.name })))

      if (unassignedContainers.length <= 1) {
        alert(`No duplicate containers found. Found ${unassignedContainers.length} container(s) with "unassigned" in the name.\n\nAll containers: ${allContainers.length}\nUnassigned containers: ${unassignedContainers.length}`)
        return
      }

      // Find the one with exact name "Unassigned Assets" or use the first one
      let defaultContainer = unassignedContainers.find((c: AssetContainer) => 
        c.name.trim().toLowerCase() === 'unassigned assets'
      )

      if (!defaultContainer) {
        // If no exact match, use the first one and rename it
        defaultContainer = unassignedContainers[0]
        console.log('Renaming container to "Unassigned Assets":', defaultContainer)
        // Rename it to "Unassigned Assets"
        const renameResponse = await fetch('/api/assets/containers', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validatedSession.accessToken}`
          },
          body: JSON.stringify({
            id: defaultContainer.id,
            name: 'Unassigned Assets',
            description: 'Default container for assets without a specific user'
          })
        })
        if (!renameResponse.ok) {
          const errorData = await renameResponse.json()
          console.error('Failed to rename default container:', errorData)
          alert(`Failed to rename container: ${errorData.error || 'Unknown error'}`)
          return
        }
      }

      // Merge all other unassigned containers into the default
      const duplicates = unassignedContainers.filter((c: AssetContainer) => 
        c.id !== defaultContainer.id
      )

      console.log('Duplicates to merge:', duplicates)

      if (duplicates.length === 0) {
        alert('No duplicates to merge')
        return
      }

      let mergedCount = 0
      let errorCount = 0
      for (const dup of duplicates) {
        try {
          await mergeContainerIntoDefault(validatedSession.accessToken, dup.id, defaultContainer.id)
          mergedCount++
        } catch (error) {
          console.error(`Error merging container ${dup.id}:`, error)
          errorCount++
        }
      }

      // Reload containers
      await loadContainers(validatedSession.accessToken)
      await loadAssets(validatedSession.accessToken)

      if (errorCount > 0) {
        alert(`Merged ${mergedCount} duplicate container(s), but ${errorCount} failed. Check console for details.`)
      } else {
        alert(`Successfully merged ${mergedCount} duplicate container(s) into "Unassigned Assets"`)
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error)
      alert(`Failed to clean up duplicate containers: ${error}`)
    }
  }

  const loadCompanyUsers = async (accessToken: string) => {
    try {
      console.log('Loading company users...')
      const response = await fetch('/api/users/company', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Company users loaded:', data.users?.length || 0, 'users')
        console.log('Users:', data.users?.map((u: any) => u.display_name || u.email))
        setCompanyUsers(data.users || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to load company users:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error loading company users:', error)
    }
  }

  const loadAssets = async (accessToken: string, userFilter?: string, containerFilter?: string) => {
    try {
      // Use provided filters or fall back to state
      const userFilterToUse = userFilter !== undefined ? userFilter : filterByUser
      const containerFilterToUse = containerFilter !== undefined ? containerFilter : filterByContainer
      
      // Build query parameters
      const params = new URLSearchParams()
      if (userFilterToUse && userFilterToUse !== '') {
        params.append('assigned_to', userFilterToUse)
      }
      if (containerFilterToUse && containerFilterToUse !== '') {
        params.append('container_id', containerFilterToUse)
      }
      
      const url = params.toString() ? `/api/assets?${params.toString()}` : '/api/assets'
      
      console.log('Loading assets from:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Assets loaded:', data.assets?.length || 0, 'assets')
        console.log('Asset details:', data.assets?.map((a: Asset) => ({
          id: a.id,
          name: a.name,
          container_id: a.container_id,
          assigned_to: a.assigned_to
        })))
        
        // Additional logging when filtering by "Unassigned Assets"
        const containerFilterToLog = containerFilterToUse || filterByContainer
        if (containerFilterToLog) {
          const container = containers.find(c => c.id === containerFilterToLog)
          if (container && container.name.trim().toLowerCase() === 'unassigned assets') {
            console.log('=== FILTERING BY UNASSIGNED ASSETS ===')
            console.log('Container ID:', containerFilterToLog)
            console.log('API returned', data.assets?.length || 0, 'assets')
            console.log('Full API response:', JSON.stringify(data, null, 2))
            if (data.assets && data.assets.length > 0) {
              console.log('Assets returned:', data.assets.map((a: Asset) => ({
                id: a.id,
                name: a.name,
                assigned_to: a.assigned_to,
                container_id: a.container_id
              })))
            } else {
              console.log('No assets returned - checking all assets in state...')
              console.log('All assets in state:', assets.map((a: Asset) => ({
                id: a.id,
                name: a.name,
                assigned_to: a.assigned_to,
                container_id: a.container_id
              })))
            }
            console.log('=== END UNASSIGNED ASSETS FILTER ===')
          }
        }
        
        setAssets(data.assets || [])
      } else {
        const errorText = await response.text()
        console.error('Failed to load assets:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error loading assets:', error)
    }
  }

  const createContainer = async () => {
    if (!newContainerName.trim()) {
      alert('Container name is required')
      return
    }

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch('/api/assets/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          name: newContainerName.trim(),
          description: newContainerDescription.trim() || null,
          parent_container_id: newContainerParentId || null,
          user_id: newContainerUserId || null
        })
      })

      if (response.ok) {
        setNewContainerName('')
        setNewContainerDescription('')
        setNewContainerParentId('')
        setNewContainerUserId('')
        setShowCreateContainer(false)
        await loadContainers(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to create container'
        console.error('Error creating container:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error creating container:', error)
      alert('Failed to create container')
    }
  }

  const startEditContainer = (container: AssetContainer | null, containerId?: string) => {
    if (container) {
      setEditingContainer(container.id)
      setEditContainerName(container.name)
      setEditContainerDescription(container.description || '')
    } else if (containerId) {
      // Editing the default/unassigned container
      setEditingContainer(containerId)
      setEditContainerName('Unassigned Assets')
      setEditContainerDescription('')
    }
  }

  const cancelEditContainer = () => {
    setEditingContainer(null)
    setEditContainerName('')
    setEditContainerDescription('')
  }

  const saveContainer = async (containerId: string) => {
    if (!editContainerName.trim()) {
      alert('Container name is required')
      return
    }

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      // If editing default container (no container object), use special ID
      const actualContainerId = (containerId === defaultContainerId || !containerId) 
        ? 'default' 
        : containerId

      const response = await fetch('/api/assets/containers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          id: actualContainerId,
          name: editContainerName.trim(),
          description: editContainerDescription.trim() || null
        })
      })

      if (response.ok) {
        setEditingContainer(null)
        setEditContainerName('')
        setEditContainerDescription('')
        await loadContainers(validatedSession.accessToken)
        await loadAssets(validatedSession.accessToken)
      } else {
        const data = await response.json()
        alert(data.error || data.details || 'Failed to update container')
      }
    } catch (error) {
      console.error('Error updating container:', error)
      alert('Failed to update container')
    }
  }

  const deleteContainer = async (containerId: string, containerName: string) => {
    // Prevent deletion of "Unassigned Assets" container
    if (containerName.trim().toLowerCase() === 'unassigned assets') {
      alert('The "Unassigned Assets" container cannot be deleted. It is the default container for unassigned assets.')
      return
    }

    if (!confirm(`Are you sure you want to delete the container "${containerName}"? All assets in this container will be moved to Unassigned Assets.`)) {
      return
    }

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch('/api/assets/containers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          id: containerId
        })
      })

      if (response.ok) {
        await loadContainers(validatedSession.accessToken)
        await loadAssets(validatedSession.accessToken)
      } else {
        const data = await response.json()
        alert(data.error || data.details || 'Failed to delete container')
      }
    } catch (error) {
      console.error('Error deleting container:', error)
      alert('Failed to delete container')
    }
  }

  const assignAssetToUser = async (assetId: string, userId: string | null) => {
    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          assigned_to: userId
        })
      })

      if (response.ok) {
        // Reload both containers and assets since user containers may have been created/deleted
        await loadContainers(validatedSession.accessToken)
        await loadAssets(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to assign asset'
        console.error('Error assigning asset:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error assigning asset:', error)
      alert('Failed to assign asset')
    }
  }

  const assignUserContainerToParent = async (userContainerId: string | undefined, parentContainerId: string | null) => {
    if (!userContainerId) return
    
    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch(`/api/assets/containers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          id: userContainerId,
          parent_container_id: parentContainerId
        })
      })

      if (response.ok) {
        // Reload containers to reflect the change
        await loadContainers(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to assign user container to group'
        console.error('Error assigning user container:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error assigning user container:', error)
      alert('Failed to assign user container to group')
    }
  }

  const moveAssetToContainer = async (assetId: string, containerId: string | null) => {
    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify({
          container_id: containerId
        })
      })

      if (response.ok) {
        await loadAssets(validatedSession.accessToken)
        await loadContainers(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to move asset'
        console.error('Error moving asset:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error moving asset:', error)
      alert('Failed to move asset')
    }
  }

  const handleDeleteAsset = (asset: Asset) => {
    setAssetToDelete(asset)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const response = await fetch(`/api/assets/${assetToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${validatedSession.accessToken}`
        }
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        setAssetToDelete(null)
        await loadAssets(validatedSession.accessToken)
        await loadContainers(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to delete asset'
        console.error('Error deleting asset:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
      alert('Failed to delete asset')
    }
  }

  const cancelDeleteAsset = () => {
    setShowDeleteConfirm(false)
    setAssetToDelete(null)
  }

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setEditAssetForm({
      name: asset.name || '',
      type: asset.type || '',
      make: asset.make || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      cost: asset.cost?.toString() || '',
      depreciated_value: asset.depreciated_value?.toString() || '',
      note: asset.note || '',
      status: asset.status || 'active'
    })
    setShowEditModal(true)
  }

  const cancelEditAsset = () => {
    setShowEditModal(false)
    setEditingAsset(null)
    setEditAssetForm({
      name: '',
      type: '',
      make: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      cost: '',
      depreciated_value: '',
      note: '',
      status: 'active'
    })
  }

  const saveAsset = async () => {
    if (!editingAsset) return

    try {
      const tabId = getTabId()
      const { session: validatedSession } = await validateAndRefreshSession(tabId)
      
      if (!validatedSession) return

      const updateData: any = {
        name: editAssetForm.name.trim() || null,
        type: editAssetForm.type.trim() || null,
        make: editAssetForm.make.trim() || null,
        model: editAssetForm.model.trim() || null,
        serial_number: editAssetForm.serial_number.trim() || null,
        purchase_date: editAssetForm.purchase_date || null,
        cost: editAssetForm.cost ? parseFloat(editAssetForm.cost) : null,
        depreciated_value: editAssetForm.depreciated_value ? parseFloat(editAssetForm.depreciated_value) : null,
        note: editAssetForm.note.trim() || null,
        status: editAssetForm.status
      }

      const response = await fetch(`/api/assets/${editingAsset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedSession.accessToken}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingAsset(null)
        await loadAssets(validatedSession.accessToken)
        await loadContainers(validatedSession.accessToken)
      } else {
        const data = await response.json()
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}` 
          : data.error || 'Failed to update asset'
        console.error('Error updating asset:', data)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error updating asset:', error)
      alert('Failed to update asset')
    }
  }

  const toggleContainer = (containerId: string) => {
    setExpandedContainers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(containerId)) {
        newSet.delete(containerId)
      } else {
        newSet.add(containerId)
      }
      return newSet
    })
  }

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  // Group assets by nested container structure: Department Container -> User Container -> Assets
  const groupAssetsByContainer = (): ContainerGroup[] => {
    // Early return if data isn't loaded yet (containers and assets are required)
    // companyUsers can be empty, but we still want to process if containers/assets exist
    if (!containers || containers.length === 0) {
      // If we have assets but no containers, still try to group them
      if (!assets || assets.length === 0) {
        return []
      }
    }
    
    const groups: ContainerGroup[] = []
    
    // Log companyUsers state for debugging
    console.log('=== groupAssetsByContainer DEBUG ===')
    console.log('companyUsers length:', companyUsers.length)
    console.log('companyUsers IDs:', companyUsers.map(u => u.id))
    console.log('companyUsers details:', companyUsers.map(u => ({ id: u.id, display_name: u.display_name, email: u.email })))
    
    // STEP 1: Identify and filter to only ONE "Unassigned Assets" container
    const unassignedContainers = containers.filter(c => {
      const nameLower = c.name.trim().toLowerCase()
      return nameLower === 'unassigned assets' && !c.parent_container_id && !c.user_id
    })
    
    // Keep only the first "Unassigned Assets" container, filter out all others
    const primaryUnassignedId = unassignedContainers.length > 0 ? unassignedContainers[0].id : null
    
    // Filter containers to exclude duplicate "Unassigned Assets" containers
    let filteredContainers = containers.filter(c => {
      const nameLower = c.name.trim().toLowerCase()
      const isUnassigned = nameLower === 'unassigned assets' && !c.parent_container_id && !c.user_id
      if (isUnassigned) {
        // Only keep the primary one
        return c.id === primaryUnassignedId
      }
      return true
    })
    
    // If filtering by container, only show that container and its children
    if (filterByContainer) {
      const targetContainer = filteredContainers.find(c => c.id === filterByContainer)
      if (targetContainer) {
        // Include the target container and all its child containers (user containers)
        filteredContainers = filteredContainers.filter(c => 
          c.id === filterByContainer || c.parent_container_id === filterByContainer
        )
      }
    }
    
    // If filtering by user, we'll handle this later after we know which user containers exist
    // For now, don't filter containers here - we'll filter in the grouping logic
    
    // STEP 2: Group assets by assigned_to (user_id)
    // Assets are only assigned to users, so we group by assigned_to
    // Users are assigned to containers via user containers
    const assetsByUser = new Map<string, Asset[]>() // Map of user_id -> assets
    const unassignedAssets: Asset[] = [] // Assets with assigned_to = null
    
    console.log('=== GROUPING ASSETS ===')
    console.log('Total assets loaded:', assets.length)
    console.log('Filter by user:', filterByUser || 'none')
    console.log('Filter by container:', filterByContainer || 'none')
    console.log('Total containers:', containers.length)
    console.log('Filtered containers:', filteredContainers.length)
    
    // Group assets by assigned_to (user_id)
    // This is the primary relationship: Assets → Users
    // Handle type mismatches by normalizing user IDs to strings
    assets.forEach(asset => {
      if (asset.assigned_to) {
        // Normalize user ID to string for consistent matching
        const userId = String(asset.assigned_to)
        if (!assetsByUser.has(userId)) {
          assetsByUser.set(userId, [])
        }
        assetsByUser.get(userId)!.push(asset)
      } else {
        // Unassigned assets (assigned_to is null)
        unassignedAssets.push(asset)
      }
    })
    
    console.log('Assets grouped by user:', Array.from(assetsByUser.entries()).map(([userId, assets]) => ({
      userId,
      count: assets.length,
      assetNames: assets.map(a => a.name)
    })))
    console.log('Unassigned assets:', unassignedAssets.length)
    console.log('Current filters - filterByUser:', filterByUser, 'filterByContainer:', filterByContainer)
    console.log('Total assets in state:', assets.length)
    console.log('Total containers in state:', containers.length)
    
    // Removed assetsByContainer - assets are now grouped by assigned_to (user_id) only
    
    // STEP 3: Separate containers into departments and user containers
    // IMPORTANT: Use ALL containers (not filtered) to find user containers, then filter appropriately
    let departmentContainers = filteredContainers.filter(c => !c.parent_container_id && !c.user_id)
    let userContainers = filteredContainers.filter(c => c.parent_container_id !== null || c.user_id !== null)
    
    console.log('All containers:', containers.map(c => ({
      id: c.id,
      name: c.name,
      parent_container_id: c.parent_container_id,
      user_id: c.user_id
    })))
    console.log('Department containers:', departmentContainers.map(c => ({ id: c.id, name: c.name })))
    console.log('User containers:', userContainers.map(c => ({
      id: c.id,
      name: c.name,
      parent_container_id: c.parent_container_id,
      user_id: c.user_id
    })))
    
    // If filtering by user, ONLY include that user's containers and their parent containers
    // We need to check ALL containers (not just filtered) to find user containers
    if (filterByUser && filterByUser !== 'unassigned') {
      // Find all user containers for this user (from ALL containers, not just filtered)
      // Include both containers with parents and standalone containers
      const userContainersForUser = containers.filter(c => 
        c.user_id === filterByUser
      )
      
      console.log(`Found ${userContainersForUser.length} user containers for user ${filterByUser}`)
      
      // Collect parent container IDs for this user
      const parentContainerIds = new Set<string>()
      
      // Add user containers and collect their parents
      userContainers = [] // Reset to only include this user's containers
      userContainersForUser.forEach(uc => {
        userContainers.push(uc)
        console.log(`Added user container: ${uc.id} (${uc.name}), parent: ${uc.parent_container_id || 'none'}`)
        // Collect parent department container ID (if exists)
        if (uc.parent_container_id) {
          parentContainerIds.add(uc.parent_container_id)
        }
      })
      
      // Filter department containers to ONLY include parents of this user's containers
      // If user has no parent containers (standalone), departmentContainers will be empty
      departmentContainers = departmentContainers.filter(dept => 
        parentContainerIds.has(dept.id)
      )
      
      // Also ensure parents are in filteredContainers for consistency
      departmentContainers.forEach(parent => {
        if (!filteredContainers.find(c => c.id === parent.id)) {
          filteredContainers.push(parent)
        }
      })
      
      console.log(`Filtered to ${departmentContainers.length} department container(s) containing user ${filterByUser}`)
    }
    
    console.log(`Department containers: ${departmentContainers.length}, User containers: ${userContainers.length}`)

    // STEP 4: Process each department container
    departmentContainers.forEach(deptContainer => {
      // Skip "Unassigned Assets" here - we'll handle it separately
      if (deptContainer.id === primaryUnassignedId) {
        return
      }
      
      // If filtering by a specific user, check if this department contains that user FIRST
      // If not, skip this entire department container
      if (filterByUser && filterByUser !== 'unassigned') {
        // Check if this department contains the user's container
        const userContainerInThisDept = containers.find(c => 
          c.user_id === filterByUser && c.parent_container_id === deptContainer.id
        )
        
        if (!userContainerInThisDept) {
          // User is not in this department - skip it entirely
          console.log(`Skipping department ${deptContainer.name} - user ${filterByUser} is not in this department`)
          return
        }
      }
      
      // Find user containers within this department
      // When "All Users" is selected, use ALL containers to find user containers
      // When filtering by a specific user, only include that user's container
      let deptUserContainers: AssetContainer[] = []
      if (filterByUser && filterByUser !== 'unassigned') {
        // Filtering by specific user - only include this user's container in this department
        deptUserContainers = containers.filter(uc => 
          uc.parent_container_id === deptContainer.id && 
          uc.user_id === filterByUser
        )
        console.log(`Department ${deptContainer.name}: Found ${deptUserContainers.length} user container(s) for filtered user`)
      } else {
        // "All Users" selected - use ALL containers to ensure we get all user containers
        // This ensures we don't miss any users when container filter is set
        deptUserContainers = containers.filter(uc => 
          uc.parent_container_id === deptContainer.id && uc.user_id !== null
        )
        console.log(`Department ${deptContainer.name}: Found ${deptUserContainers.length} user containers from ALL containers`)
        console.log(`  User container details:`, deptUserContainers.map(uc => ({
          id: uc.id,
          name: uc.name,
          user_id: uc.user_id,
          parent_container_id: uc.parent_container_id
        })))
      }
      
      console.log(`Department ${deptContainer.name} (${deptContainer.id}) has ${deptUserContainers.length} user containers`)
      console.log(`User containers for this dept:`, deptUserContainers.map(uc => ({
        id: uc.id,
        name: uc.name,
        user_id: uc.user_id,
        parent_container_id: uc.parent_container_id
      })))

      // Group assets by user within this department
      // Assets are assigned to users (via assigned_to), users are assigned to containers (via user containers)
      // So: Find user containers in this department, then get assets assigned to those users
      const userGroups: UserAssetGroup[] = []
      const userGroupsByUserId = new Map<string, { userContainer: AssetContainer, assets: Asset[] }>()
      
      deptUserContainers.forEach(userContainer => {
        if (!userContainer.user_id) return
        
        // If filtering by user, only include containers for that user
        // Use string comparison to handle UUID type mismatches
        if (filterByUser && filterByUser !== 'unassigned') {
          const containerUserId = String(userContainer.user_id)
          const filterUserId = String(filterByUser)
          if (containerUserId !== filterUserId && userContainer.user_id !== filterByUser) {
            return
          }
        }
        
        // Get assets assigned to this user (assets.assigned_to = userContainer.user_id)
        // This is the primary relationship: Assets → Users
        // Normalize user ID to string for consistent matching (since assetsByUser uses string keys)
        const userId = String(userContainer.user_id)
        const originalUserId = userContainer.user_id
        
        // Try multiple lookup strategies to handle type mismatches
        let userAssets = assetsByUser.get(userId) || []
        
        // If not found, try with the original user_id (in case it's a different type)
        if (userAssets.length === 0 && originalUserId !== userId) {
          userAssets = assetsByUser.get(String(originalUserId)) || []
        }
        
        // If still no assets found, try direct lookup from assets array as fallback
        if (userAssets.length === 0) {
          const directAssets = assets.filter(a => {
            if (!a.assigned_to) return false
            const assignedToStr = String(a.assigned_to)
            return assignedToStr === userId || 
                   assignedToStr === String(originalUserId) ||
                   a.assigned_to === originalUserId ||
                   String(a.assigned_to) === String(originalUserId)
          })
          if (directAssets.length > 0) {
            userAssets = directAssets
            console.log(`Found assets for user ${userId} from direct filter: ${directAssets.length} assets`)
            // Update the map for future lookups in this grouping pass
            assetsByUser.set(userId, directAssets)
          }
        }
        
        console.log(`User container ${userContainer.name} (user_id: ${userId}, original: ${originalUserId}) has ${userAssets.length} assets`)
        if (userAssets.length === 0) {
          console.log(`  WARNING: No assets found for user ${userId} (${userContainer.name})`)
          console.log(`  Available user IDs in assetsByUser:`, Array.from(assetsByUser.keys()).slice(0, 10))
          console.log(`  Total assets loaded:`, assets.length)
          const matchingAssets = assets.filter(a => {
            if (!a.assigned_to) return false
            const assignedToStr = String(a.assigned_to)
            return assignedToStr === userId || 
                   assignedToStr === String(originalUserId) ||
                   a.assigned_to === originalUserId ||
                   String(a.assigned_to) === String(originalUserId)
          })
          console.log(`  Assets with assigned_to matching this user:`, matchingAssets.length)
          if (matchingAssets.length > 0) {
            console.log(`  Matching asset IDs:`, matchingAssets.map(a => ({ id: a.id, name: a.name, assigned_to: a.assigned_to })))
          }
        }
        
        // Merge with existing user group for this user, or create new one
        // Use normalized userId for consistent key matching
        if (userGroupsByUserId.has(userId)) {
          const existing = userGroupsByUserId.get(userId)!
          // Merge assets, avoiding duplicates
          const existingAssetIds = new Set(existing.assets.map(a => a.id))
          userAssets.forEach(asset => {
            if (!existingAssetIds.has(asset.id)) {
              existing.assets.push(asset)
            }
          })
          // Use the container that's in this department (or keep the first one if this one isn't)
          if (userContainer.parent_container_id === deptContainer.id) {
            existing.userContainer = userContainer
          }
        } else {
          userGroupsByUserId.set(userId, {
            userContainer: userContainer,
            assets: userAssets
          })
        }
      })
      
      // Now create user groups from the merged data
      userGroupsByUserId.forEach(({ userContainer, assets: userAssets }) => {
        const user = companyUsers.find(u => {
          const match = u.id === userContainer.user_id
          if (!match && u.id && userContainer.user_id) {
            return String(u.id) === String(userContainer.user_id)
          }
          return match
        })
        
        if (user) {
          // Show user if they have assets OR if filtering by that specific user OR if showing "All Users" with container filter
          const shouldShowUser = userAssets.length > 0 || 
                                (filterByUser && (String(filterByUser) === String(userContainer.user_id) || filterByUser === userContainer.user_id)) ||
                                (!filterByUser && filterByContainer)
          if (shouldShowUser) {
            console.log(`  - Adding user group for ${user.display_name} with ${userAssets.length} assets (shouldShowUser: ${shouldShowUser})`)
            userGroups.push({
              user: {
                id: user.id,
                display_name: user.display_name,
                email: user.email
              },
              assets: userAssets,
              userContainer: userContainer
            })
          }
        } else {
          if (userAssets.length > 0) {
            console.log(`  - Adding user group WITHOUT user info (assets exist but user lookup failed)`)
            userGroups.push({
              user: {
                id: userContainer.user_id,
                display_name: userContainer.name || 'Unknown User',
                email: ''
              },
              assets: userAssets,
              userContainer: userContainer
            })
          }
        }
      })

      // Get assets directly assigned to department container (if any)
      // Department containers don't have direct assets
      // Assets are only assigned to users, and users are assigned to containers via user containers
      // So department containers only show user containers with their assets
      const deptAssets: Asset[] = [] // Department containers don't have direct assets

      // Always add group if it has assets or user groups
      // When filtering, only show if there's content
      // When not filtering, show all containers (even empty ones)
      // When "All Users" + container filter, show if there are user groups (even if they have 0 assets)
      // When filtering by a specific user, only show if this department contains that user (already checked above)
      const shouldShow = deptAssets.length > 0 || 
                        userGroups.length > 0 || 
                        (!filterByUser && !filterByContainer) ||
                        (!filterByUser && filterByContainer && deptUserContainers.length > 0) ||
                        (filterByUser && filterByUser !== 'unassigned' && deptUserContainers.length > 0)
      
      console.log(`Department ${deptContainer.name} shouldShow check:`, {
        deptAssets: deptAssets.length,
        userGroups: userGroups.length,
        noFilters: !filterByUser && !filterByContainer,
        allUsersWithContainer: !filterByUser && filterByContainer && deptUserContainers.length > 0,
        shouldShow
      })
      
      if (shouldShow) {
        console.log(`Adding department container: ${deptContainer.name} with ${deptAssets.length} direct assets and ${userGroups.length} user groups`)
        groups.push({
          container: deptContainer,
          assets: deptAssets,
          userGroups: userGroups.length > 0 ? userGroups : undefined
        })
      }
    })

    // STEP 5: Handle "Unassigned Assets" container - ONE TIME ONLY
    // Skip "Unassigned Assets" when filtering by a specific user
    if (primaryUnassignedId && !filterByUser) {
      const primaryContainer = filteredContainers.find(c => c.id === primaryUnassignedId)
      if (primaryContainer) {
        // Unassigned assets are those with assigned_to = null
        // Assets are only assigned to users, so unassigned means assigned_to is null
        // User containers should NOT be under "Unassigned Assets" - that's only for unassigned assets
        groups.push({
          container: primaryContainer,
          assets: unassignedAssets
        })
      }
    } else {
      // No "Unassigned Assets" container exists, show unassigned assets as separate group
      if (unassignedAssets.length > 0) {
        groups.push({
          container: null,
          assets: unassignedAssets
        })
      }
    }

    // STEP 6: Handle standalone user containers (user containers without a parent)
    // These are user containers that exist but aren't under any department container
    const standaloneUserContainers = userContainers.filter(uc => 
      !uc.parent_container_id && uc.user_id
    )
    
    if (standaloneUserContainers.length > 0) {
      console.log(`Found ${standaloneUserContainers.length} standalone user containers (no parent)`)
      
      standaloneUserContainers.forEach(userContainer => {
        if (!userContainer.user_id) return
        
        // If filtering by user, only include containers for that user
        // Use string comparison to handle UUID type mismatches
        if (filterByUser && filterByUser !== 'unassigned') {
          const containerUserId = String(userContainer.user_id)
          const filterUserId = String(filterByUser)
          if (containerUserId !== filterUserId && userContainer.user_id !== filterByUser) {
            return
          }
        }
        
        // Get assets assigned to this user
        const userAssets = assetsByUser.get(userContainer.user_id) || []
        
        // Show if user has assets, or if not filtering, or if filtering by this specific user
        const shouldShowStandalone = userAssets.length > 0 || 
                                     !filterByUser || 
                                     (filterByUser && String(userContainer.user_id) === String(filterByUser))
        
        if (shouldShowStandalone) {
          const user = companyUsers.find(u => u.id === userContainer.user_id)
          
          if (user) {
            console.log(`Adding standalone user container: ${userContainer.name} with ${userAssets.length} assets`)
            // Create a virtual container group for this standalone user container
            // We'll display it as a top-level group
            groups.push({
              container: {
                id: userContainer.id,
                name: `${user.display_name}'s Assets`,
                description: `Assets assigned to ${user.display_name}`,
                company_id: userContainer.company_id,
                created_at: userContainer.created_at,
                updated_at: userContainer.updated_at,
                created_by: userContainer.created_by,
                parent_container_id: null,
                user_id: null // This is a virtual container, not a real user container
              },
              assets: [], // Standalone user containers don't have direct assets, only user groups
              userGroups: [{
                user: {
                  id: user.id,
                  display_name: user.display_name,
                  email: user.email
                },
                assets: userAssets,
                userContainer: userContainer
              }]
            })
          }
        }
      })
    }

    // STEP 7: Add empty department containers (except unassigned)
    departmentContainers.forEach(deptContainer => {
      if (deptContainer.id === primaryUnassignedId) return // Skip unassigned
      
      const hasGroup = groups.some(g => g.container?.id === deptContainer.id)
      if (!hasGroup) {
        groups.push({
          container: deptContainer,
          assets: []
        })
      }
    })

    // STEP 8: Sort - "Unassigned Assets" first, then by container name
    const sortedGroups = groups.sort((a, b) => {
      const aIsUnassigned = a.container?.name.trim().toLowerCase() === 'unassigned assets'
      const bIsUnassigned = b.container?.name.trim().toLowerCase() === 'unassigned assets'
      
      if (aIsUnassigned && !bIsUnassigned) return -1
      if (!aIsUnassigned && bIsUnassigned) return 1
      if (!a.container && !b.container) return 0
      if (!a.container) return 1
      if (!b.container) return -1
      return a.container.name.localeCompare(b.container.name)
    })
    
    console.log('=== FINAL GROUPED CONTAINERS ===')
    console.log(`Total groups: ${sortedGroups.length}`)
    sortedGroups.forEach((group, idx) => {
      console.log(`Group ${idx + 1}:`, {
        container: group.container?.name || 'null',
        containerId: group.container?.id || 'null',
        directAssets: group.assets?.length || 0,
        userGroups: group.userGroups?.length || 0,
        userGroupDetails: group.userGroups?.map(ug => ({
          userName: ug.user.display_name,
          userId: ug.user.id,
          assetCount: ug.assets.length
        })) || []
      })
    })
    console.log('=== END GROUPING ===')
    
    return sortedGroups
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getDisplayName = () => {
    return getUserDisplayName(user)
  }

  const containerGroups = groupAssetsByContainer()
  const defaultContainerId = 'default-container'

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="block sm:hidden py-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AT</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    const { supabase: getSupabaseClient } = require('../../lib/supabaseClient')
                    const supabase = getSupabaseClient()
                    supabase.auth.signOut()
                    window.location.href = '/'
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs text-gray-700 truncate">Welcome, {getDisplayName()}</span>
              {userRoles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((role, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : role === 'owner'
                            ? 'bg-green-100 text-green-800'
                            : role.startsWith('manager')
                            ? 'bg-orange-100 text-orange-800'
                            : role === 'tech'
                            ? 'bg-blue-100 text-blue-800'
                            : role.startsWith('viewer')
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role.includes('-') 
                          ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : role.charAt(0).toUpperCase() + role.slice(1)
                        }
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden sm:flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">Welcome, {getDisplayName()}</span>
                {userRoles.length > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Role:</span>
                    <div className="flex space-x-1">
                      {userRoles.map((role, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : role === 'owner'
                              ? 'bg-green-100 text-green-800'
                              : role.startsWith('manager')
                              ? 'bg-orange-100 text-orange-800'
                              : role === 'tech'
                              ? 'bg-blue-100 text-blue-800'
                              : role.startsWith('viewer')
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role.includes('-') 
                            ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                            : role.charAt(0).toUpperCase() + role.slice(1)
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                onClick={() => {
                  const { supabase: getSupabaseClient } = require('../../lib/supabaseClient')
                  const supabase = getSupabaseClient()
                  supabase.auth.signOut()
                  window.location.href = '/'
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="fixed top-28 sm:top-24 left-0 right-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="sr-only">Dashboard</span>
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Asset Management</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-40 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Asset Management</h2>
                  <p className="mt-1 text-sm text-gray-600">Manage and organize your company assets</p>
                </div>
                {!isViewer && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowCreateContainer(!showCreateContainer)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      {showCreateContainer ? 'Cancel' : 'Create Container'}
                    </button>
                    <button
                      onClick={() => window.location.href = '/assets/create'}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Create Asset
                    </button>
                  </div>
                )}
              </div>
              
              {/* Filters */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Filter */}
                <div>
                  <label htmlFor="user-lookup" className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by User
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="user-lookup"
                      value={filterByUser}
                      onChange={async (e) => {
                        const newUserId = e.target.value
                        setFilterByUser(newUserId)
                        // Clear assets first to prevent showing stale data
                        setAssets([])
                        // Reload both containers and assets with filter
                        const tabId = getTabId()
                        const { session: validatedSession } = await validateAndRefreshSession(tabId)
                        if (validatedSession) {
                          await loadContainers(validatedSession.accessToken)
                          // Pass the new filter value directly instead of relying on state
                          await loadAssets(validatedSession.accessToken, newUserId, filterByContainer)
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Users ({companyUsers.length} total)</option>
                      {companyUsers.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.display_name} {user.email ? `(${user.email})` : ''} - {user.role}
                        </option>
                      ))}
                    </select>
                    {filterByUser && (
                      <button
                        onClick={async () => {
                          setFilterByUser('')
                          setAssets([])
                          const tabId = getTabId()
                          const { session: validatedSession } = await validateAndRefreshSession(tabId)
                          if (validatedSession) {
                            await loadContainers(validatedSession.accessToken)
                            // Pass empty string to clear the filter
                            await loadAssets(validatedSession.accessToken, '', filterByContainer)
                          }
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Container Filter */}
                <div>
                  <label htmlFor="container-lookup" className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Container
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="container-lookup"
                      value={filterByContainer}
                      onChange={async (e) => {
                        const newContainerId = e.target.value
                        setFilterByContainer(newContainerId)
                        // Clear assets first to prevent showing stale data
                        setAssets([])
                        // Reload both containers and assets with filter
                        const tabId = getTabId()
                        const { session: validatedSession } = await validateAndRefreshSession(tabId)
                        if (validatedSession) {
                          await loadContainers(validatedSession.accessToken)
                          // Pass the new filter value directly instead of relying on state
                          await loadAssets(validatedSession.accessToken, filterByUser, newContainerId)
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Containers ({containers.filter(c => !c.parent_container_id && !c.user_id).length} total)</option>
                      {containers
                        .filter(c => !c.parent_container_id && !c.user_id) // Only show department containers
                        .map((container: AssetContainer) => (
                          <option key={container.id} value={container.id}>
                            {container.name}
                          </option>
                        ))}
                    </select>
                    {filterByContainer && (
                      <button
                        onClick={async () => {
                          setFilterByContainer('')
                          setAssets([])
                          const tabId = getTabId()
                          const { session: validatedSession } = await validateAndRefreshSession(tabId)
                          if (validatedSession) {
                            await loadContainers(validatedSession.accessToken)
                            // Pass empty string to clear the filter
                            await loadAssets(validatedSession.accessToken, filterByUser, '')
                          }
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Filter Status Messages */}
              {(filterByUser || filterByContainer) && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    {filterByUser && (
                      <>Showing assets assigned to: <strong>{companyUsers.find((u: any) => u.id === filterByUser)?.display_name || 'Unknown User'}</strong></>
                    )}
                    {filterByContainer && (
                      <>{filterByUser ? ' in' : 'Showing assets in'} container: <strong>{containers.find(c => c.id === filterByContainer)?.name || 'Unknown'}</strong></>
                    )}
                  </p>
                </div>
              )}
              
              {companyUsers.length === 0 && (
                <p className="mt-2 text-sm text-yellow-600">
                  ⚠️ No users found. Check browser console for details.
                </p>
              )}
            </div>

            {/* Create Container Form */}
            {showCreateContainer && !isViewer && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Container</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Container Name *
                    </label>
                    <input
                      type="text"
                      value={newContainerName}
                      onChange={(e) => setNewContainerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., IT Department, New York Office"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={newContainerDescription}
                      onChange={(e) => setNewContainerDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Brief description of this container"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Container (Optional)
                    </label>
                    <select
                      value={newContainerParentId}
                      onChange={(e) => setNewContainerParentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Top-level (Department Container)</option>
                      {containers
                        .filter(c => !c.parent_container_id) // Only show top-level containers as parents
                        .map(container => (
                          <option key={container.id} value={container.id}>
                            {container.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Leave empty for department container, or select a parent to create a user container</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign User (Optional)
                    </label>
                    <select
                      value={newContainerUserId}
                      onChange={(e) => setNewContainerUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={!newContainerParentId}
                    >
                      <option value="">No user assigned</option>
                      {companyUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.display_name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Only available when creating a user container (with parent)</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={createContainer}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Create Container
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {containerGroups.length === 0 ? (
                <p className="text-gray-500">No assets found. Create containers to organize your assets.</p>
              ) : (
                <div className="space-y-4">
                  {containerGroups.map((group) => {
                    const containerId = group.container?.id || defaultContainerId
                    const containerName = group.container?.name || 'Unassigned Assets'
                    const isExpanded = expandedContainers.has(containerId)

                    return (
                      <div key={containerId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Container Header */}
                        <div className="bg-gray-50 px-6 py-4">
                          {editingContainer === containerId ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Container Name *
                                </label>
                                <input
                                  type="text"
                                  value={editContainerName}
                                  onChange={(e) => setEditContainerName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={editContainerDescription}
                                  onChange={(e) => setEditContainerDescription(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    saveContainer(group.container?.id || containerId)
                                  }}
                                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelEditContainer()
                                  }}
                                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div 
                              className="cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleContainer(containerId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-sm font-medium text-indigo-600">
                                      {containerName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-medium text-gray-900">
                                      {containerName}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {(() => {
                                        // Calculate total users in this container
                                        const totalUsers = group.userGroups?.length || 0
                                        
                                        // Calculate total assets: direct assets + assets from all user groups
                                        const directAssets = group.assets?.length || 0
                                        const userGroupAssets = group.userGroups?.reduce((sum, ug) => sum + (ug.assets?.length || 0), 0) || 0
                                        const totalAssets = directAssets + userGroupAssets
                                        
                                        // Build summary text - always show users and assets counts
                                        const parts = []
                                        // Always show user count (even if 0)
                                        parts.push(`${totalUsers} user${totalUsers !== 1 ? 's' : ''}`)
                                        // Always show asset count (even if 0)
                                        parts.push(`${totalAssets} asset${totalAssets !== 1 ? 's' : ''}`)
                                        // Add description if it exists
                                        if (group.container?.description) {
                                          parts.push(group.container.description)
                                        }
                                        
                                        return parts.join(' • ')
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {!isViewer && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          startEditContainer(group.container, containerId)
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                                        title="Rename container"
                                      >
                                        Edit
                                      </button>
                                      {group.container && group.container.name.trim().toLowerCase() !== 'unassigned assets' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteContainer(group.container!.id, group.container!.name)
                                          }}
                                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                                          title="Delete container"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    {isExpanded ? (
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    ) : (
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Nested Content - Users and Assets */}
                        {isExpanded && (
                          <div className="bg-white">
                            {/* User Groups (nested under container) */}
                            {group.userGroups && group.userGroups.length > 0 && (
                              <div className="space-y-2 pl-4 pr-4 pb-4">
                                {group.userGroups.map((userGroup) => {
                                  const isUserExpanded = expandedUsers.has(userGroup.user.id)
                                  return (
                                    <div key={userGroup.user.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                      {/* User Header */}
                                      <div className="bg-blue-50 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div 
                                            className="flex items-center flex-1 cursor-pointer hover:bg-blue-100 transition-colors -mx-4 px-4 py-2 rounded"
                                            onClick={() => toggleUser(userGroup.user.id)}
                                          >
                                            <div className="flex-shrink-0 h-6 w-6 bg-blue-200 rounded-full flex items-center justify-center mr-2">
                                              <span className="text-xs font-medium text-blue-700">
                                                {userGroup.user.display_name.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-medium text-gray-900">
                                                {userGroup.user.display_name}
                                              </h5>
                                              <p className="text-xs text-gray-600">
                                                {userGroup.assets.length} asset{userGroup.assets.length !== 1 ? 's' : ''}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            {!isViewer && (() => {
                                              const primaryUnassigned = containers.find(c => 
                                                c.name.trim().toLowerCase() === 'unassigned assets' && !c.parent_container_id && !c.user_id
                                              )
                                              const currentParentId = userGroup.userContainer?.parent_container_id
                                              // If parent_container_id is null or equals primaryUnassigned ID, show empty (unassigned)
                                              // User containers should not be under "Unassigned Assets" - only unassigned assets go there
                                              const displayValue = (!currentParentId || (primaryUnassigned && currentParentId === primaryUnassigned.id)) ? '' : currentParentId
                                              
                                              // Filter out "Unassigned Assets" from the dropdown - user containers should only be moved to department containers
                                              const availableContainers = containers.filter(c => 
                                                !c.user_id && 
                                                c.id !== primaryUnassigned?.id &&
                                                c.name.trim().toLowerCase() !== 'unassigned assets'
                                              )
                                              
                                              return (
                                                <div className="flex items-center space-x-2">
                                                  <label htmlFor={`move-to-${userGroup.user.id}`} className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                                    Move To:
                                                  </label>
                                                  <select
                                                    id={`move-to-${userGroup.user.id}`}
                                                    value={displayValue}
                                                    onChange={(e) => {
                                                      const newParentId = e.target.value === '' ? null : e.target.value
                                                      assignUserContainerToParent(userGroup.userContainer?.id, newParentId)
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    title="Move user container to a different group container"
                                                  >
                                                    <option value="">-- Select Container --</option>
                                                    {availableContainers.map(container => (
                                                      <option key={container.id} value={container.id}>{container.name}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              )
                                            })()}
                                            <button 
                                              className="text-gray-400 hover:text-gray-600 transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                toggleUser(userGroup.user.id)
                                              }}
                                            >
                                              {isUserExpanded ? (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                              ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* User Assets Table */}
                                      {isUserExpanded && userGroup.assets.length > 0 && (
                                        <div className="w-full">
                                          <table className="w-full table-auto divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Type</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Make</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Model</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Serial</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Cost</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                                                <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Assigned To</th>
                                                {!isViewer && (
                                                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
                                                )}
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {userGroup.assets.map((asset) => (
                                                <tr key={asset.id}>
                                                  <td className="px-2 sm:px-3 py-2 text-sm truncate max-w-[64px]">
                                                    {!isViewer ? (
                                                      <button
                                                        onClick={() => handleEditAsset(asset)}
                                                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                                        title={`Edit ${asset.type || 'asset'}`}
                                                      >
                                                        {asset.type || 'N/A'}
                                                      </button>
                                                    ) : (
                                                      <span className="text-gray-900" title={asset.type || 'N/A'}>{asset.type || 'N/A'}</span>
                                                    )}
                                                  </td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 truncate max-w-[80px]" title={asset.make || 'N/A'}>{asset.make || 'N/A'}</td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm">
                                                    <div className="font-medium text-gray-900 truncate max-w-[96px]" title={asset.model || 'N/A'}>{asset.model || 'N/A'}</div>
                                                    {asset.note && <div className="text-xs text-gray-500 mt-1 truncate max-w-[96px]" title={asset.note}>{asset.note}</div>}
                                                  </td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 truncate max-w-[112px]" title={asset.serial_number || 'N/A'}>{asset.serial_number || 'N/A'}</td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formatDate(asset.purchase_date)}</td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(asset.cost)}</td>
                                                  <td className="px-2 sm:px-3 py-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                      asset.status === 'active' ? 'bg-green-100 text-green-800' :
                                                      asset.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                      'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                      {asset.status || 'active'}
                                                    </span>
                                                  </td>
                                                  <td className="px-2 sm:px-3 py-2 text-sm">
                                                    {!isViewer ? (
                                                      <select
                                                        value={asset.assigned_to || ''}
                                                        onChange={(e) => assignAssetToUser(asset.id, e.target.value || null)}
                                                        className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                      >
                                                        <option value="">Unassigned</option>
                                                        {companyUsers.map(user => (
                                                          <option key={user.id} value={user.id}>{user.display_name}</option>
                                                        ))}
                                                      </select>
                                                    ) : (
                                                      <span className="text-gray-900 truncate block max-w-[128px]" title={asset.assigned_to ? companyUsers.find(u => u.id === asset.assigned_to)?.display_name || 'Unknown User' : 'Unassigned'}>
                                                        {asset.assigned_to ? companyUsers.find(u => u.id === asset.assigned_to)?.display_name || 'Unknown User' : 'Unassigned'}
                                                      </span>
                                                    )}
                                                  </td>
                                                  {!isViewer && (
                                                    <td className="px-2 sm:px-3 py-2 text-sm">
                                                      <button
                                                        onClick={() => handleDeleteAsset(asset)}
                                                        className="text-red-600 hover:text-red-800 font-medium transition-colors text-xs sm:text-sm"
                                                        title="Delete asset"
                                                      >
                                                        Delete
                                                      </button>
                                                    </td>
                                                  )}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                      {isUserExpanded && userGroup.assets.length === 0 && (
                                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                                          No assets assigned to this user
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            
                            {/* Direct Assets (assets directly assigned to container, not to users) */}
                            {group.assets.length > 0 && (
                              <div className="w-full">
                                <table className="w-full table-auto divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Type</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Make</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Model</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Serial</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Cost</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Status</th>
                                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Assigned To</th>
                                      {!isViewer && (
                                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {group.assets.map((asset) => (
                                      <tr key={asset.id}>
                                        <td className="px-2 sm:px-3 py-2 text-sm truncate max-w-[64px]">
                                          {!isViewer ? (
                                            <button
                                              onClick={() => handleEditAsset(asset)}
                                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                              title={`Edit ${asset.type || 'asset'}`}
                                            >
                                              {asset.type || 'N/A'}
                                            </button>
                                          ) : (
                                            <span className="text-gray-900" title={asset.type || 'N/A'}>{asset.type || 'N/A'}</span>
                                          )}
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 truncate max-w-[80px]" title={asset.make || 'N/A'}>{asset.make || 'N/A'}</td>
                                        <td className="px-2 sm:px-3 py-2 text-sm">
                                          <div className="font-medium text-gray-900 truncate max-w-[96px]" title={asset.model || 'N/A'}>{asset.model || 'N/A'}</div>
                                          {asset.note && <div className="text-xs text-gray-500 mt-1 truncate max-w-[96px]" title={asset.note}>{asset.note}</div>}
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 truncate max-w-[112px]" title={asset.serial_number || 'N/A'}>{asset.serial_number || 'N/A'}</td>
                                        <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formatDate(asset.purchase_date)}</td>
                                        <td className="px-2 sm:px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formatCurrency(asset.cost)}</td>
                                        <td className="px-2 sm:px-3 py-2">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            asset.status === 'active' ? 'bg-green-100 text-green-800' :
                                            asset.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                            'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {asset.status || 'active'}
                                          </span>
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 text-sm">
                                          {!isViewer ? (
                                            <select
                                              value={asset.assigned_to || ''}
                                              onChange={(e) => assignAssetToUser(asset.id, e.target.value || null)}
                                              className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                              <option value="">Unassigned</option>
                                              {companyUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.display_name}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <span className="text-gray-900 truncate block max-w-[128px]" title={asset.assigned_to ? companyUsers.find(u => u.id === asset.assigned_to)?.display_name || 'Unknown User' : 'Unassigned'}>
                                              {asset.assigned_to ? companyUsers.find(u => u.id === asset.assigned_to)?.display_name || 'Unknown User' : 'Unassigned'}
                                            </span>
                                          )}
                                        </td>
                                        {!isViewer && (
                                          <td className="px-2 sm:px-3 py-2 text-sm">
                                            <button
                                              onClick={() => handleDeleteAsset(asset)}
                                              className="text-red-600 hover:text-red-800 font-medium transition-colors text-xs sm:text-sm"
                                              title="Delete asset"
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {/* Empty state */}
                            {(!group.userGroups || group.userGroups.length === 0) && group.assets.length === 0 && (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No assets in this container
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Session Timeout Warning */}
      {/* Edit Asset Modal */}
      {showEditModal && editingAsset && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={cancelEditAsset}
        >
          <div 
            className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Asset
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editAssetForm.name}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <input
                      type="text"
                      value={editAssetForm.type}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editAssetForm.status}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make
                    </label>
                    <input
                      type="text"
                      value={editAssetForm.make}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, make: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={editAssetForm.model}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, model: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={editAssetForm.serial_number}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, serial_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={editAssetForm.purchase_date}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, purchase_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAssetForm.cost}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, cost: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depreciated Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAssetForm.depreciated_value}
                      onChange={(e) => setEditAssetForm({ ...editAssetForm, depreciated_value: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={editAssetForm.note}
                    onChange={(e) => setEditAssetForm({ ...editAssetForm, note: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={cancelEditAsset}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsset}
                  className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && assetToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Delete Asset
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 text-center mb-4">
                  Are you sure you want to delete this asset? This action cannot be undone.
                </p>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {assetToDelete.type || 'Asset'} - {assetToDelete.make || ''} {assetToDelete.model || ''}
                  </p>
                  {assetToDelete.serial_number && (
                    <p className="text-xs text-gray-500 mt-1">
                      Serial: {assetToDelete.serial_number}
                    </p>
                  )}
                </div>
                <p className="text-xs text-red-600 text-center font-medium mb-4">
                  ⚠️ Warning: This will permanently delete the asset and all associated data.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-3 px-4 py-3">
                <button
                  onClick={cancelDeleteAsset}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAsset}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SessionTimeoutWarning
        show={showWarning}
        timeRemaining={timeRemainingFormatted}
        onExtend={extendSession}
        onDismiss={dismissWarning}
      />
    </div>
  )
}

