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

    // Get user's company_id from company_users table
    console.log('Admin invitations API: Looking up company for user:', user.id)
    const { data: companyUser, error: companyUserError } = await supabaseClient
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    console.log('Admin invitations API: Company lookup result:', { companyUser, companyUserError })

    if (companyUserError || !companyUser?.company_id) {
      console.log('Admin invitations API: User not associated with a company')
      return res.status(400).json({ error: 'User not associated with a company' })
    }

    // Get all invitations for the user's company
    console.log('Admin invitations API: Fetching invitations for company:', companyUser.company_id)
    const { data: invitations, error: invitationsError } = await supabaseClient
      .from('invites')
      .select('*')
      .eq('company_id', companyUser.company_id)
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
