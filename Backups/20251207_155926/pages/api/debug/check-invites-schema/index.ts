import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Get a sample invitation to see the schema
    const { data: invitations, error, count } = await supabaseAdmin()
      .from('invites')
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Debug Check Invites Schema API: Error fetching invitations:', error)
      return res.status(500).json({ error: 'Failed to fetch invitations', details: error.message })
    }

    res.status(200).json({
      success: true,
      message: 'Invites schema check completed',
      invitationCount: count,
      sampleInvitation: invitations?.[0] || null,
      allColumns: invitations?.[0] ? Object.keys(invitations[0]) : []
    })

  } catch (error: any) {
    console.error('Debug Check Invites Schema API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
