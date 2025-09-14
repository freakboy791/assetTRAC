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

    // Verify the invitation belongs to the user's company
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('company_id', companyUser.company_id)
      .single()

    if (invitationError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Update the invitation with rejection status
    const { error: updateError } = await supabaseClient
      .from('invitations')
      .update({ 
        status: 'expired',
        admin_rejected_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error rejecting invitation:', updateError)
      return res.status(500).json({ error: 'Failed to reject invitation' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in reject-invitation API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
