import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Admin invitations API: Starting request')
    
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Admin invitations API: Missing or invalid authorization header')
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('Admin invitations API: Token received, length:', token.length)
    
    // Get the current user's session using the token
    const supabaseClient = supabase()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.log('Admin invitations API: Invalid token or user error:', userError)
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('Admin invitations API: User authenticated:', user.email)

    // Check if user has permission to view invitations (admin, owner, or manager)
    const { data: companyUser, error: companyUserError } = await supabaseClient
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser) {
      console.log('User role check failed:', { companyUserError, companyUser })
      return res.status(403).json({ error: 'User not found in company' })
    }

    const userRole = companyUser.role
    const canViewInvitations = userRole === 'admin' || userRole === 'owner' || userRole.startsWith('manager')

    if (!canViewInvitations) {
      console.log('User does not have permission to view invitations:', { userRole })
      return res.status(403).json({ error: 'Insufficient permissions to view invitations' })
    }

    // For now, let's try to get the first company (similar to other APIs)
    // This is a temporary solution until we have proper user-company associations
    console.log('Admin invitations API: Getting first company (temporary solution)')
    const { data: companies, error: companiesError } = await supabaseClient
      .from('companies')
      .select('id')
      .limit(1)

    console.log('Admin invitations API: Companies lookup result:', { companies, companiesError })

    if (companiesError || !companies || companies.length === 0) {
      console.log('Admin invitations API: No companies found')
      return res.status(400).json({ error: 'No companies found' })
    }

    const companyId = companies[0].id
    console.log('Admin invitations API: Using company ID:', companyId)

    // Get all invitations (temporarily without company filter to test)
    console.log('Admin invitations API: Fetching all invitations (no company filter)')
    const { data: invitations, error: invitationsError } = await supabaseClient
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('Admin invitations API: Invitations query result:', { invitations, invitationsError })

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return res.status(500).json({ error: 'Failed to fetch invitations' })
    }

    return res.status(200).json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Error in invitations API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
