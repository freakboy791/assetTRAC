import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Get the current user's session using the token
    const supabaseClient = supabase()
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user's company_id from company_users table
    const { data: companyUser, error: companyUserError } = await supabaseClient
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser?.company_id) {
      return res.status(400).json({ error: 'User not associated with a company' })
    }

    // Get all invitations for the user's company
    const { data: invitations, error: invitationsError } = await supabaseClient
      .from('invitations')
      .select('*')
      .eq('company_id', companyUser.company_id)
      .order('created_at', { ascending: false })

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
