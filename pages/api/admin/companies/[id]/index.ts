import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, validateJWTToken } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  // Get the authorization token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.substring(7)

  // Validate the JWT token and get user data
  const { user, error: userError } = await validateJWTToken(token)
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check if user is admin
  const { data: companyUsers, error: companyUsersError } = await supabaseAdmin()
    .from('company_users')
    .select('role, company_id')
    .eq('user_id', user.id)
    .eq('role', 'admin')

  if (companyUsersError || !companyUsers || companyUsers.length === 0) {
    return res.status(403).json({ error: 'Access denied. Admin role required.' })
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const {
        name,
        address,
        city,
        state,
        zip,
        phone,
        email,
        description,
        depreciation_rate
      } = req.body

      // Build update data object with only provided fields
      const updateData: any = {}
      
      if (name !== undefined) {
        const trimmedName = name?.trim()
        if (!trimmedName) {
          return res.status(400).json({ error: 'Company name is required' })
        }
        updateData.name = trimmedName
      }

      if (address !== undefined) updateData.street = address?.trim() || null
      if (city !== undefined) updateData.city = city?.trim() || null
      if (state !== undefined) updateData.state = state?.trim() || null
      if (zip !== undefined) updateData.zip = zip?.trim() || null
      if (phone !== undefined) updateData.phone = phone?.trim() || null
      if (email !== undefined) updateData.email = email?.trim() || null
      if (description !== undefined) updateData.note = description?.trim() || null
      if (depreciation_rate !== undefined) {
        const rate = parseFloat(depreciation_rate)
        if (isNaN(rate) || rate < 0 || rate > 100) {
          return res.status(400).json({ error: 'Depreciation rate must be a number between 0 and 100' })
        }
        updateData.depreciation_rate = rate
      }

      // Update the company
      const { data, error } = await supabaseAdmin()
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating company:', error)
        return res.status(500).json({ error: 'Failed to update company', details: error.message })
      }

      if (!data) {
        return res.status(404).json({ error: 'Company not found' })
      }

      return res.status(200).json({ 
        success: true, 
        company: {
          id: data.id,
          name: data.name,
          address: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          email: data.email,
          description: data.note,
          depreciation_rate: data.depreciation_rate,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
      })
    } catch (error: any) {
      console.error('Error in update company API:', error)
      return res.status(500).json({ error: 'Internal server error', details: error?.message })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
