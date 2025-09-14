import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the current user's session
    const supabaseClient = supabase()
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
    
    if (sessionError || !session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user's company_id from their profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return res.status(400).json({ error: 'User not associated with a company' })
    }

    // Get all invitations for the user's company
    const { data: invitations, error: invitationsError } = await supabaseClient
      .from('invitations')
      .select('*')
      .eq('company_id', profile.company_id)
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
