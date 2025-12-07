import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Get all invitations
    const { data: invitations, error } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Debug API: Error fetching invitations:', error)
      return res.status(500).json({ error: 'Failed to fetch invitations', details: error.message })
    }

    console.log('Debug API: Found invitations:', invitations?.length || 0)
    
    // Log each invitation
    invitations?.forEach((inv, index) => {
      console.log(`Debug API: Invitation ${index}:`, {
        id: inv.id,
        email: inv.invited_email,
        status: inv.status,
        email_confirmed_at: inv.email_confirmed_at,
        admin_approved_at: inv.admin_approved_at,
        created_at: inv.created_at,
        token: inv.token?.substring(0, 10) + '...'
      })
    })

    return res.status(200).json({
      count: invitations?.length || 0,
      invitations: invitations?.map(inv => ({
        id: inv.id,
        email: inv.invited_email,
        status: inv.status,
        email_confirmed_at: inv.email_confirmed_at,
        admin_approved_at: inv.admin_approved_at,
        created_at: inv.created_at,
        token_preview: inv.token?.substring(0, 10) + '...'
      }))
    })

  } catch (error) {
    console.error('Debug API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
