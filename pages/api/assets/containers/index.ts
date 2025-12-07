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
      // List all containers for the company
      const { data: containers, error } = await supabaseAdmin()
        .from('asset_containers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch containers' })
      }

      return res.status(200).json({ containers: containers || [] })
    }

    if (req.method === 'POST') {
      // Create a new container
      const { name, description, parent_container_id, user_id } = req.body

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Container name is required' })
      }

      // Validate parent_container_id if provided
      if (parent_container_id) {
        const { data: parentContainer, error: parentError } = await supabaseAdmin()
          .from('asset_containers')
          .select('company_id')
          .eq('id', parent_container_id)
          .single()

        if (parentError || !parentContainer || parentContainer.company_id !== companyId) {
          return res.status(400).json({ error: 'Invalid parent container' })
        }
      }

      // Validate user_id if provided
      if (user_id) {
        const { data: userCompany, error: userError } = await supabaseAdmin()
          .from('company_users')
          .select('company_id')
          .eq('user_id', user_id)
          .eq('company_id', companyId)
          .single()

        if (userError || !userCompany) {
          return res.status(400).json({ error: 'Invalid user or user does not belong to your company' })
        }
      }

      const { data: container, error } = await supabaseAdmin()
        .from('asset_containers')
        .insert({
          company_id: companyId,
          name: name.trim(),
          description: description?.trim() || null,
          parent_container_id: parent_container_id || null,
          user_id: user_id || null,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating container:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return res.status(500).json({ 
          error: 'Failed to create container', 
          details: error.message || 'Unknown error',
          code: error.code || 'unknown',
          hint: error.hint || null
        })
      }

      return res.status(201).json({ container })
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update a container
      const { id, name, description, parent_container_id, user_id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Container ID is required' })
      }

      // Name is only required if it's being updated (provided in request)
      // If name is provided, it must not be empty
      if (name !== undefined && (!name || name.trim() === '')) {
        return res.status(400).json({ error: 'Container name is required' })
      }

      // Handle special case: "default" or "unassigned" container
      // Check if this is a request to create/update the default container
      if (id === 'default' || id === 'unassigned' || id === 'default-container') {
        // Check if default container already exists
        const { data: existingDefault, error: checkError } = await supabaseAdmin()
          .from('asset_containers')
          .select('*')
          .eq('company_id', companyId)
          .eq('name', 'Unassigned Assets')
          .single()

        if (existingDefault) {
          // Update existing default container
          const { data: container, error } = await supabaseAdmin()
            .from('asset_containers')
            .update({
              name: name.trim(),
              description: description?.trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDefault.id)
            .select()
            .single()

          if (error) {
            console.error('Supabase error updating default container:', error)
            return res.status(500).json({ error: 'Failed to update container', details: error.message })
          }

          return res.status(200).json({ container })
        } else {
          // Create default container if it doesn't exist
          const { data: container, error } = await supabaseAdmin()
            .from('asset_containers')
            .insert({
              company_id: companyId,
              name: name.trim(),
              description: description?.trim() || null,
              created_by: user.id
            })
            .select()
            .single()

          if (error) {
            console.error('Supabase error creating default container:', error)
            return res.status(500).json({ error: 'Failed to create container', details: error.message })
          }

          return res.status(200).json({ container })
        }
      }

      // Regular container update
      // Verify the container belongs to the user's company
      const { data: existingContainer, error: fetchError } = await supabaseAdmin()
        .from('asset_containers')
        .select('company_id')
        .eq('id', id)
        .single()

      if (fetchError || !existingContainer || existingContainer.company_id !== companyId) {
        return res.status(404).json({ error: 'Container not found' })
      }

      // Validate parent_container_id if provided
      if (parent_container_id !== undefined) {
        if (parent_container_id) {
          const { data: parentContainer, error: parentError } = await supabaseAdmin()
            .from('asset_containers')
            .select('company_id')
            .eq('id', parent_container_id)
            .single()

          if (parentError || !parentContainer || parentContainer.company_id !== companyId) {
            return res.status(400).json({ error: 'Invalid parent container' })
          }
        }
      }

      // Validate user_id if provided
      if (user_id !== undefined) {
        if (user_id) {
          const { data: userCompany, error: userError } = await supabaseAdmin()
            .from('company_users')
            .select('company_id')
            .eq('user_id', user_id)
            .eq('company_id', companyId)
            .single()

          if (userError || !userCompany) {
            return res.status(400).json({ error: 'Invalid user or user does not belong to your company' })
          }
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Only update fields that are provided
      if (name !== undefined) {
        updateData.name = name.trim()
      }
      if (description !== undefined) {
        updateData.description = description?.trim() || null
      }
      if (parent_container_id !== undefined) {
        updateData.parent_container_id = parent_container_id || null
      }
      if (user_id !== undefined) {
        updateData.user_id = user_id || null
      }

      const { data: container, error } = await supabaseAdmin()
        .from('asset_containers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating container:', error)
        return res.status(500).json({ error: 'Failed to update container', details: error.message })
      }

      return res.status(200).json({ container })
    }

    if (req.method === 'DELETE') {
      // Delete a container
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Container ID is required' })
      }

      // Verify the container belongs to the user's company
      const { data: existingContainer, error: fetchError } = await supabaseAdmin()
        .from('asset_containers')
        .select('company_id')
        .eq('id', id)
        .single()

      if (fetchError || !existingContainer || existingContainer.company_id !== companyId) {
        return res.status(404).json({ error: 'Container not found' })
      }

      // Check if container has assets
      const { data: assets, error: assetsError } = await supabaseAdmin()
        .from('assets')
        .select('id')
        .eq('container_id', id)
        .limit(1)

      if (assetsError) {
        console.error('Error checking container assets:', assetsError)
        return res.status(500).json({ error: 'Failed to check container assets' })
      }

      if (assets && assets.length > 0) {
        // Move assets to null (unassigned) before deleting container
        const { error: moveError } = await supabaseAdmin()
          .from('assets')
          .update({ container_id: null })
          .eq('container_id', id)

        if (moveError) {
          console.error('Error moving assets:', moveError)
          return res.status(500).json({ error: 'Failed to move assets from container' })
        }
      }

      // Delete the container
      const { error } = await supabaseAdmin()
        .from('asset_containers')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase error deleting container:', error)
        return res.status(500).json({ error: 'Failed to delete container', details: error.message })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in containers API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

