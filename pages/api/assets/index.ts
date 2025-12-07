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

    if (req.method === 'GET') {
      // List all assets for the company, optionally filtered by container or assigned user
      const { container_id, assigned_to } = req.query
      
      let query = supabaseAdmin()
        .from('assets')
        .select('*')
        .eq('company_id', companyId)

      if (container_id) {
        if (container_id === 'null' || container_id === '') {
          // Assets with no container - these should have assigned_to = null
          query = query.is('container_id', null).is('assigned_to', null)
        } else {
          // Check if this is the "Unassigned Assets" container
          const { data: container, error: containerError } = await supabaseAdmin()
            .from('asset_containers')
            .select('id, name, user_id')
            .eq('id', container_id)
            .single()
          
          if (containerError || !container) {
            return res.status(404).json({ error: 'Container not found' })
          }
          
          const isUnassignedContainer = container.name.trim().toLowerCase() === 'unassigned assets'
          
          if (isUnassignedContainer) {
            // For "Unassigned Assets": Show assets where assigned_to is null
            // Assets are only assigned to users, so unassigned assets have assigned_to = null
            // This is the primary relationship - assets with no user assignment
            // Also check container_id as a fallback (in case container_id is set)
            const unassignedContainerId = container.id
            
            console.log('Filtering by Unassigned Assets container:', unassignedContainerId)
            console.log('Company ID:', companyId)
            
            // Get assets where assigned_to is null or empty (primary check)
            // Check for both null and empty string
            const { data: assetsByAssignedToNull, error: error1a } = await supabaseAdmin()
              .from('assets')
              .select('*')
              .eq('company_id', companyId)
              .is('assigned_to', null)
            
            const { data: assetsByAssignedToEmpty, error: error1b } = await supabaseAdmin()
              .from('assets')
              .select('*')
              .eq('company_id', companyId)
              .eq('assigned_to', '')
            
            const assetsByAssignedTo = [...(assetsByAssignedToNull || []), ...(assetsByAssignedToEmpty || [])]
            const error1 = error1a || error1b
            
            console.log('Assets with assigned_to = null:', assetsByAssignedToNull?.length || 0)
            console.log('Assets with assigned_to = "":', assetsByAssignedToEmpty?.length || 0)
            console.log('Total assets with assigned_to null/empty:', assetsByAssignedTo.length)
            if (error1) {
              console.error('Error fetching assets by assigned_to:', error1)
            }
            
            // Also get assets where container_id matches (fallback check)
            const { data: assetsByContainer, error: error2 } = await supabaseAdmin()
              .from('assets')
              .select('*')
              .eq('company_id', companyId)
              .eq('container_id', unassignedContainerId)
            
            console.log('Assets with container_id = unassignedContainerId:', assetsByContainer?.length || 0)
            if (error2) {
              console.error('Error fetching assets by container_id:', error2)
            }
            
            // Get ALL assets for the company to see what we have
            const { data: allAssetsDebug, error: error3 } = await supabaseAdmin()
              .from('assets')
              .select('id, name, assigned_to, container_id')
              .eq('company_id', companyId)
            
            console.log('All assets for company:', allAssetsDebug?.length || 0)
            if (allAssetsDebug && allAssetsDebug.length > 0) {
              console.log('Asset details:', allAssetsDebug.map(a => ({
                id: a.id,
                name: a.name,
                assigned_to: a.assigned_to,
                container_id: a.container_id
              })))
            }
            
            // Combine results and remove duplicates
            const allAssets = [...assetsByAssignedTo, ...(assetsByContainer || [])]
            const uniqueAssets = allAssets.filter((asset, index, self) => 
              index === self.findIndex(a => a.id === asset.id)
            )
            
            console.log('Final unique assets count:', uniqueAssets.length)
            console.log('Final assets:', uniqueAssets.map(a => ({ id: a.id, name: a.name, assigned_to: a.assigned_to })))
            
            return res.status(200).json({ assets: uniqueAssets })
          } else if (container.user_id) {
            // This is a user container - show assets assigned to that user
            query = query.eq('assigned_to', container.user_id)
          } else {
            // This is a department container - find all user containers under it
            // Then show assets assigned to those users
            const { data: userContainers, error: userContainersError } = await supabaseAdmin()
              .from('asset_containers')
              .select('user_id')
              .eq('parent_container_id', container_id)
              .eq('company_id', companyId)
              .not('user_id', 'is', null)
            
            console.log(`[API] Filtering by department container ${container_id}`)
            console.log(`[API] Found ${userContainers?.length || 0} user containers`)
            
            if (userContainersError) {
              console.error('[API] Error fetching user containers:', userContainersError)
              return res.status(500).json({ error: 'Failed to fetch user containers', details: userContainersError.message })
            }
            
            if (!userContainers || userContainers.length === 0) {
              // No user containers under this department - return empty result
              console.log('[API] No user containers found under department, returning empty array')
              return res.status(200).json({ assets: [] })
            }
            
            // Get user IDs from user containers
            const userIds = userContainers.map((uc: { user_id: string }) => uc.user_id)
            console.log(`[API] User IDs in department:`, userIds)
            
            // Show assets assigned to any of these users
            // IMPORTANT: If assigned_to filter is also set, it will override this
            // So we need to handle the case where both are set
            if (assigned_to && assigned_to !== 'null' && assigned_to !== '') {
              // Both container and user filter - user filter takes precedence but verify user is in container
              if (userIds.includes(assigned_to)) {
                query = query.eq('assigned_to', assigned_to)
                console.log(`[API] Both filters set - using assigned_to filter (user is in container)`)
              } else {
                // User is not in this container - return empty
                console.log(`[API] User ${assigned_to} is not in container ${container_id}, returning empty`)
                return res.status(200).json({ assets: [] })
              }
            } else {
              // Only container filter - show assets for all users in container
              // Ensure userIds array is not empty and contains valid UUIDs
              if (userIds.length === 0) {
                console.log(`[API] No user IDs found, returning empty array`)
                return res.status(200).json({ assets: [] })
              }
              
              // Filter out any null/undefined values
              const validUserIds = userIds.filter((id: string | null) => id !== null && id !== undefined && id !== '')
              if (validUserIds.length === 0) {
                console.log(`[API] No valid user IDs after filtering, returning empty array`)
                return res.status(200).json({ assets: [] })
              }
              
              console.log(`[API] Valid user IDs:`, validUserIds)
              query = query.in('assigned_to', validUserIds)
              console.log(`[API] Query will filter by assigned_to IN (${validUserIds.length} users)`)
            }
          }
        }
      }

      if (assigned_to && (!container_id || container_id === 'null' || container_id === '')) {
        // Only assigned_to filter (no container filter) - apply it here
        if (assigned_to === 'null' || assigned_to === '') {
          query = query.is('assigned_to', null)
        } else {
          query = query.eq('assigned_to', assigned_to)
        }
        console.log(`[API] Applied assigned_to filter: ${assigned_to}`)
      }

      console.log(`[API] Executing query with filters - container_id: ${container_id || 'none'}, assigned_to: ${assigned_to || 'none'}`)
      
      // Debug: Log the query structure before execution
      try {
        const { data: assets, error } = await query.order('name', { ascending: true })

        console.log(`[API] Query executed, returned ${assets?.length || 0} assets`)
        if (error) {
          console.error('[API] Query error:', error)
          console.error('[API] Error details:', JSON.stringify(error, null, 2))
          return res.status(500).json({ error: 'Failed to fetch assets', details: error.message })
        }

        // If we got 0 assets but were filtering by a department container, double-check
        if (assets && assets.length === 0 && container_id && !assigned_to) {
          // Verify the container exists and has user containers
          const { data: verifyContainer } = await supabaseAdmin()
            .from('asset_containers')
            .select('id, name, user_id, parent_container_id')
            .eq('id', container_id)
            .single()
          
          if (verifyContainer && !verifyContainer.user_id) {
            // It's a department container - check for user containers
            const { data: userContainers } = await supabaseAdmin()
              .from('asset_containers')
              .select('user_id')
              .eq('parent_container_id', container_id)
              .not('user_id', 'is', null)
            
            console.log(`[API] Verification: Found ${userContainers?.length || 0} user containers under department`)
            if (userContainers && userContainers.length > 0) {
              const userIds = userContainers.map((uc: { user_id: string }) => uc.user_id)
              // Try a direct query to see if assets exist
              const { data: directAssets } = await supabaseAdmin()
                .from('assets')
                .select('*')
                .eq('company_id', companyId)
                .in('assigned_to', userIds)
              
              console.log(`[API] Direct query found ${directAssets?.length || 0} assets`)
            }
          }
        }

        console.log(`[API] Returning ${assets?.length || 0} assets`)
        return res.status(200).json({ assets: assets || [] })
      } catch (queryError: any) {
        console.error('[API] Query execution error:', queryError)
        return res.status(500).json({ error: 'Failed to execute query', details: queryError?.message || 'Unknown error' })
      }
    }

    if (req.method === 'POST') {
      // Create a new asset
      // NOTE: container_id is ignored - assets are only assigned to users, containers are determined by user assignment
      const { name, type, make, model, serial_number, purchase_date, cost, depreciated_value, note, status, assigned_to } = req.body

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Asset name is required' })
      }

      // Build insert object
      const insertData: any = {
        company_id: companyId,
        name: name.trim(),
        type: type?.trim() || null,
        serial_number: serial_number?.trim() || null,
        purchase_date: purchase_date || null,
        cost: cost || null,
        depreciated_value: depreciated_value || null,
        note: note?.trim() || null,
        status: status || 'active'
      }

      // Add make and model if provided
      if (make !== undefined && make !== null && make.trim() !== '') {
        insertData.make = make.trim()
      }
      if (model !== undefined && model !== null && model.trim() !== '') {
        insertData.model = model.trim()
      }
      
      // Handle assigned_to: determine container based on user assignment
      if (assigned_to && assigned_to !== '' && assigned_to !== 'null') {
        // Verify user belongs to the same company
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
        // First, check if user container exists (may be under different parent)
        // Use .maybeSingle() to avoid errors if multiple exist - we'll use the first one
        const { data: existingUserContainers, error: findError } = await supabaseAdmin()
          .from('asset_containers')
          .select('id')
          .eq('user_id', assigned_to)
          .eq('company_id', companyId)
          .limit(1)

        if (!findError && existingUserContainers && existingUserContainers.length > 0) {
          // Use the first existing user container to avoid duplicates
          insertData.container_id = existingUserContainers[0].id
          insertData.assigned_to = assigned_to
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

          insertData.container_id = newUserContainer.id
          insertData.assigned_to = assigned_to
        }
      } else {
        // No user assignment - assign to "Unassigned Assets" container
        let { data: unassignedContainers, error: containerError } = await supabaseAdmin()
          .from('asset_containers')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', 'Unassigned Assets')
          .is('parent_container_id', null)
          .limit(1)
        
        let unassignedContainer = unassignedContainers && unassignedContainers.length > 0 
          ? unassignedContainers[0] 
          : null
        
        if (containerError || !unassignedContainer) {
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
          insertData.container_id = unassignedContainer.id
        }
        insertData.assigned_to = null
      }

      const { data: asset, error } = await supabaseAdmin()
        .from('assets')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating asset:', error)
        return res.status(500).json({ 
          error: 'Failed to create asset',
          details: error.message || 'Unknown error',
          code: error.code || 'unknown'
        })
      }

      return res.status(201).json({ asset })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in assets API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

