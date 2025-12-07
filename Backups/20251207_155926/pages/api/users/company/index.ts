import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, validateJWTToken } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

    // Get all users in the same company (query company_users first)
    const { data: companyUsers, error: usersError } = await supabaseAdmin()
      .from('company_users')
      .select('user_id, role')
      .eq('company_id', companyId)

    if (usersError) {
      console.error('Error fetching company users:', usersError)
      console.error('Error details:', JSON.stringify(usersError, null, 2))
      return res.status(500).json({ error: 'Failed to fetch company users', details: usersError.message })
    }

    if (!companyUsers || companyUsers.length === 0) {
      console.log('No company users found for company_id:', companyId)
      return res.status(200).json({ users: [] })
    }

    console.log('Found company users:', companyUsers.length)

    // Get user IDs
    const userIds = companyUsers.map((cu: any) => cu.user_id).filter(Boolean)
    
    if (userIds.length === 0) {
      console.log('No valid user IDs found')
      return res.status(200).json({ users: [] })
    }

    // Get profiles for all users separately (LEFT JOIN equivalent)
    const { data: profiles, error: profilesError } = await supabaseAdmin()
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds)

    // Create a map of profiles by user ID
    const profileMap = new Map()
    if (profiles && !profilesError) {
      profiles.forEach((profile: any) => {
        profileMap.set(profile.id, profile)
      })
    } else if (profilesError) {
      console.warn('Error fetching profiles (non-fatal):', profilesError)
      // Continue without profiles - users will still be returned
    }

    // Format the response - combine company_users with profiles
    const formattedUsers = companyUsers
      .filter((cu: any) => cu.user_id) // Only include entries with user_id
      .map((cu: any) => {
        const profile = profileMap.get(cu.user_id)
        
        const email = profile?.email || ''
        const first_name = profile?.first_name || null
        const last_name = profile?.last_name || null

        // Build display name - prioritize first_name + last_name
        let display_name = 'Unknown User'
        if (first_name && last_name) {
          display_name = `${first_name} ${last_name}`
        } else if (first_name) {
          display_name = first_name
        } else if (last_name) {
          display_name = last_name
        } else if (email) {
          display_name = email
        }

        return {
          id: cu.user_id,
          email: email,
          first_name: first_name,
          last_name: last_name,
          role: cu.role,
          display_name: display_name
        }
      })
      .sort((a, b) => {
        // Sort by last name, then first name
        if (a.last_name && b.last_name) {
          return a.last_name.localeCompare(b.last_name)
        }
        if (a.first_name && b.first_name) {
          return a.first_name.localeCompare(b.first_name)
        }
        return a.display_name.localeCompare(b.display_name)
      })

    console.log('Formatted users:', formattedUsers.length, formattedUsers.map((u: any) => u.display_name))

    return res.status(200).json({ users: formattedUsers })
  } catch (error) {
    console.error('Error in company users API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

