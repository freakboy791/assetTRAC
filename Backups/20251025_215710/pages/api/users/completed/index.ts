import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin, supabaseServer, validateJWTToken } from '@/lib/supabaseClient'






// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validate the JWT token and get user data
    const { user, error: userError } = await validateJWTToken(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user has permission to view completed users
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser) {
      return res.status(403).json({ error: 'User not found in company' })
    }

    const userRole = companyUser.role
    const canManageUsers = ['admin', 'owner'].includes(userRole) || userRole.startsWith('manager')

    if (!canManageUsers) {
      return res.status(403).json({ error: 'Insufficient permissions to view completed users' })
    }

    // Get completed users (users with completed invitations)
    const { data: completedUsers, error: usersError } = await supabaseAdmin()
      .from('invites')
      .select(`
        id,
        invited_email,
        role,
        company_id,
        completed_at,
        admin_approved_at,
        admin_approved_by
      `)
      .in('status', ['completed', 'admin_approved'])
      .order('admin_approved_at', { ascending: false })

    if (usersError) {
      console.error('Completed Users API: Error fetching users:', usersError)
      return res.status(500).json({ error: 'Failed to fetch completed users' })
    }

    // Get profile data and current company name for each completed user
    const usersWithProfiles = await Promise.all(
      completedUsers.map(async (invite) => {
        // Get profile data
        const { data: profile, error: profileError } = await supabaseAdmin()
          .from('profiles')
          .select('first_name, last_name, last_login_at')
          .eq('email', invite.invited_email)
          .single()

        // Get current company name from companies table
        const { data: company, error: companyError } = await supabaseAdmin()
          .from('companies')
          .select('name')
          .eq('id', invite.company_id)
          .single()

        return {
          ...invite,
          profile: profileError ? null : profile,
          company_name: companyError ? 'Unknown Company' : company.name
        }
      })
    )

    // Format the response
    const formattedUsers = usersWithProfiles.map(invite => ({
      id: invite.id,
      email: invite.invited_email,
      role: invite.role,
      company_name: invite.company_name,
      company_id: invite.company_id,
      first_name: invite.profile?.first_name || null,
      last_name: invite.profile?.last_name || null,
      display_name: invite.profile?.last_name && invite.profile?.first_name 
        ? `${invite.profile.last_name}, ${invite.profile.first_name}`
        : invite.profile?.first_name || invite.profile?.last_name || 'No name set',
      completed_at: invite.completed_at,
      last_login_at: invite.profile?.last_login_at || null,
      approved_at: invite.admin_approved_at,
      approved_by: invite.admin_approved_by
    }))

    res.status(200).json({ users: formattedUsers })

  } catch (error) {
    console.error('Completed Users API: Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
