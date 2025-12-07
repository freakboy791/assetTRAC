import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const adminEmail = 'phillycigarguy@gmail.com'

    // Check for any invitations for the admin user
    const { data: invitations, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', adminEmail)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError)
      return res.status(500).json({ error: 'Failed to fetch invitations' })
    }

    return res.status(200).json({
      success: true,
      message: 'Admin invitation check completed',
      data: {
        adminEmail,
        invitations: invitations || [],
        invitationCount: invitations?.length || 0
      }
    })

  } catch (error) {
    console.error('Unexpected error in check-admin-invitation API:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
