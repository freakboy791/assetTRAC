import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { invitationId } = req.body

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' })
    }

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

    // Verify the invitation belongs to the user's company
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('company_id', profile.company_id)
      .single()

    if (invitationError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Update the invitation with admin approval
    const { error: updateError } = await supabaseClient
      .from('invitations')
      .update({ 
        admin_approved_at: new Date().toISOString(),
        status: 'admin_approved'
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error approving invitation:', updateError)
      return res.status(500).json({ error: 'Failed to approve invitation' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in approve-invitation API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
