import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, validateJWTToken } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Validate the JWT token and get user data
    const { user, error: userError } = await validateJWTToken(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user's company_id
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser?.company_id) {
      return res.status(403).json({ error: 'User is not associated with a company' })
    }

    const companyId = companyUser.company_id
    const assetId = req.query.id as string

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update asset
      // NOTE: container_id is ignored - assets are only assigned to users, containers are determined by user assignment
      const { name, type, make, model, serial_number, purchase_date, cost, depreciated_value, note, status, assigned_to } = req.body

      // First verify the asset belongs to the user's company
      const { data: existingAsset, error: fetchError } = await supabaseAdmin()
        .from('assets')
        .select('company_id')
        .eq('id', assetId)
        .single()

      if (fetchError || !existingAsset || existingAsset.company_id !== companyId) {
        return res.status(404).json({ error: 'Asset not found' })
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (name !== undefined) updateData.name = name.trim()
      if (type !== undefined) updateData.type = type?.trim() || null
      if (make !== undefined) updateData.make = make?.trim() || null
      if (model !== undefined) updateData.model = model?.trim() || null
      if (serial_number !== undefined) updateData.serial_number = serial_number?.trim() || null
      if (purchase_date !== undefined) updateData.purchase_date = purchase_date || null
      if (cost !== undefined) updateData.cost = cost || null
      if (depreciated_value !== undefined) updateData.depreciated_value = depreciated_value || null
      if (note !== undefined) updateData.note = note?.trim() || null
      if (status !== undefined) updateData.status = status
      // container_id is NOT set here - it will be determined by assigned_to logic below
      
      // Handle assigned_to: validate user belongs to the same company and manage user containers
      let isUnassigning = false
      let currentContainerId: string | null = null
      let userContainerIdToCheck: string | null = null // Store user container ID to check after update
      
      if (assigned_to !== undefined) {
        // Get the current asset to know its container
        const { data: currentAsset, error: currentAssetError } = await supabaseAdmin()
          .from('assets')
          .select('container_id, assigned_to')
          .eq('id', assetId)
          .single()

        if (currentAssetError || !currentAsset) {
          return res.status(404).json({ error: 'Asset not found' })
        }

        currentContainerId = currentAsset.container_id
        isUnassigning = assigned_to === null || assigned_to === ''

        if (isUnassigning) {
          // Unassigning: Always set assigned_to to null
          updateData.assigned_to = null

          if (currentContainerId) {
            // Check if current container is a user container
            const { data: currentContainer, error: containerError } = await supabaseAdmin()
              .from('asset_containers')
              .select('id, parent_container_id, user_id, name')
              .eq('id', currentContainerId)
              .single()

            if (!containerError && currentContainer) {
              if (currentContainer.user_id) {
                // This is a user container - store its ID to check after update
                userContainerIdToCheck = currentContainer.id
                // Move asset to parent container
                let parentContainerId = currentContainer.parent_container_id
                
                // If parent container is null, find or create "Unassigned Assets" container
                if (!parentContainerId) {
                  // Find or create "Unassigned Assets" container for this company
                  const { data: unassignedContainers, error: unassignedError } = await supabaseAdmin()
                    .from('asset_containers')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('name', 'Unassigned Assets')
                    .is('parent_container_id', null)
                    .limit(1)
                  
                  let unassignedContainer = unassignedContainers && unassignedContainers.length > 0 
                    ? unassignedContainers[0] 
                    : null
                  
                  if (!unassignedError && !unassignedContainer) {
                    // Create "Unassigned Assets" container if it doesn't exist
                    const { data: newContainer, error: createError } = await supabaseAdmin()
                      .from('asset_containers')
                      .insert({
                        company_id: companyId,
                        name: 'Unassigned Assets',
                        description: 'Default container for assets without a specific user',
                        created_by: user.id
                      })
                      .select('id')
                      .single()
                    
                    if (!createError && newContainer) {
                      unassignedContainer = newContainer
                    }
                  }
                  
                  if (unassignedContainer) {
                    parentContainerId = unassignedContainer.id
                  }
                }
                
                updateData.container_id = parentContainerId
              } else {
                // Asset is in a non-user container (like "Unassigned Assets" or a department container)
                // but still has assigned_to set - ensure it's in "Unassigned Assets"
                // Check if current container is "Unassigned Assets"
                const isUnassignedContainer = currentContainer.name.trim().toLowerCase() === 'unassigned assets'
                
                if (!isUnassignedContainer) {
                  // Asset is in a department container but being unassigned - move to "Unassigned Assets"
                  const { data: unassignedContainers, error: unassignedError } = await supabaseAdmin()
                    .from('asset_containers')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('name', 'Unassigned Assets')
                    .is('parent_container_id', null)
                    .limit(1)
                  
                  let unassignedContainer = unassignedContainers && unassignedContainers.length > 0 
                    ? unassignedContainers[0] 
                    : null
                  
                  if (!unassignedError && !unassignedContainer) {
                    // Create "Unassigned Assets" container if it doesn't exist
                    const { data: newContainer, error: createError } = await supabaseAdmin()
                      .from('asset_containers')
                      .insert({
                        company_id: companyId,
                        name: 'Unassigned Assets',
                        description: 'Default container for assets without a specific user',
                        created_by: user.id
                      })
                      .select('id')
                      .single()
                    
                    if (!createError && newContainer) {
                      unassignedContainer = newContainer
                    }
                  }
                  
                  if (unassignedContainer) {
                    updateData.container_id = unassignedContainer.id
                  }
                }
                // If already in "Unassigned Assets", container_id doesn't need to change
                // but assigned_to will be set to null above
              }
            }
          } else {
            // Asset has no container_id - find or create "Unassigned Assets" container
            const { data: unassignedContainers, error: unassignedError } = await supabaseAdmin()
              .from('asset_containers')
              .select('id')
              .eq('company_id', companyId)
              .eq('name', 'Unassigned Assets')
              .is('parent_container_id', null)
              .limit(1)
            
            let unassignedContainer = unassignedContainers && unassignedContainers.length > 0 
              ? unassignedContainers[0] 
              : null
            
            if (!unassignedError && !unassignedContainer) {
              // Create "Unassigned Assets" container if it doesn't exist
              const { data: newContainer, error: createError } = await supabaseAdmin()
                .from('asset_containers')
                .insert({
                  company_id: companyId,
                  name: 'Unassigned Assets',
                  description: 'Default container for assets without a specific user',
                  created_by: user.id
                })
                .select('id')
                .single()
              
              if (!createError && newContainer) {
                unassignedContainer = newContainer
              }
            }
            
            if (unassignedContainer) {
              updateData.container_id = unassignedContainer.id
            }
          }
        } else {
          // Assigning to a user: Verify user belongs to the same company
          const { data: assignedUser, error: assignedUserError } = await supabaseAdmin()
            .from('company_users')
            .select('user_id')
            .eq('user_id', assigned_to)
            .eq('company_id', companyId)
            .single()

          if (assignedUserError || !assignedUser) {
            return res.status(400).json({ 
              error: 'Invalid user assignment', 
              details: 'User does not belong to your company' 
            })
          }

          // Get user's display name for container name
          const { data: userProfile, error: profileError } = await supabaseAdmin()
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', assigned_to)
            .single()

          let userDisplayName = 'Unknown User'
          if (!profileError && userProfile) {
            if (userProfile.first_name && userProfile.last_name) {
              userDisplayName = `${userProfile.first_name} ${userProfile.last_name}`
            } else if (userProfile.first_name) {
              userDisplayName = userProfile.first_name
            } else if (userProfile.last_name) {
              userDisplayName = userProfile.last_name
            } else if (userProfile.email) {
              userDisplayName = userProfile.email
            }
          }

          // Find or create user container for this user
          // First, check if user container already exists (regardless of parent)
          // Use .maybeSingle() to avoid errors if multiple exist - we'll use the first one
          const { data: existingUserContainers, error: findError } = await supabaseAdmin()
            .from('asset_containers')
            .select('id')
            .eq('user_id', assigned_to)
            .eq('company_id', companyId)
            .limit(1)

          let userContainerId: string | null = null

          if (!findError && existingUserContainers && existingUserContainers.length > 0) {
            // User container already exists - use the first one to avoid duplicates
            userContainerId = existingUserContainers[0].id
          } else {
            // Create new user container with no parent (user can move it to a department container later)
            // User containers should NOT be under "Unassigned Assets" - that's only for unassigned assets
            const { data: newUserContainer, error: createError } = await supabaseAdmin()
              .from('asset_containers')
              .insert({
                name: userDisplayName,
                description: `Assets assigned to ${userDisplayName}`,
                company_id: companyId,
                parent_container_id: null, // User containers start with no parent - user can move them to department containers
                user_id: assigned_to,
                created_by: user.id
              })
              .select('id')
              .single()

            if (createError || !newUserContainer) {
              console.error('Error creating user container:', createError)
              return res.status(500).json({ 
                error: 'Failed to create user container',
                details: createError?.message || 'Unknown error'
              })
            }

            userContainerId = newUserContainer.id
          }

          updateData.assigned_to = assigned_to
          updateData.container_id = userContainerId
        }
      }

      const { data: asset, error } = await supabaseAdmin()
        .from('assets')
        .update(updateData)
        .eq('id', assetId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating asset:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return res.status(500).json({ 
          error: 'Failed to update asset', 
          details: error.message || 'Unknown error',
          code: error.code || 'unknown',
          hint: error.hint || null
        })
      }

      // If we unassigned an asset, check if the user container is now empty and delete it
      if (isUnassigning && userContainerIdToCheck) {
        // Check if the user container is now empty (after the asset was moved out)
        const { data: remainingAssets, error: assetsError } = await supabaseAdmin()
          .from('assets')
          .select('id')
          .eq('container_id', userContainerIdToCheck)
          .limit(1)

        if (!assetsError && (!remainingAssets || remainingAssets.length === 0)) {
          // User container is empty, delete it
          const { error: deleteError } = await supabaseAdmin()
            .from('asset_containers')
            .delete()
            .eq('id', userContainerIdToCheck)

          if (deleteError) {
            console.error('Error deleting empty user container:', deleteError)
          } else {
            console.log('Deleted empty user container:', userContainerIdToCheck)
          }
        } else if (assetsError) {
          console.error('Error checking remaining assets in user container:', assetsError)
        }
      }

      return res.status(200).json({ asset })
    }

    if (req.method === 'DELETE') {
      // Delete asset
      // First verify the asset belongs to the user's company
      const { data: existingAsset, error: fetchError } = await supabaseAdmin()
        .from('assets')
        .select('company_id')
        .eq('id', assetId)
        .single()

      if (fetchError || !existingAsset || existingAsset.company_id !== companyId) {
        return res.status(404).json({ error: 'Asset not found' })
      }

      const { error } = await supabaseAdmin()
        .from('assets')
        .delete()
        .eq('id', assetId)

      if (error) {
        console.error('Supabase error deleting asset:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return res.status(500).json({ 
          error: 'Failed to delete asset',
          details: error.message || 'Unknown error',
          code: error.code || 'unknown',
          hint: error.hint || null
        })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Error in asset API:', error)
    console.error('Error stack:', error?.stack)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    })
  }
}

