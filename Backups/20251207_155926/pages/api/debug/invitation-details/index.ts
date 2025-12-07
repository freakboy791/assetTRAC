import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { data: invitations, error } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Debug Invitation Details API: Error fetching invitations:', error)
      return res.status(500).json({ error: 'Failed to fetch invitations', details: error.message })
    }

    res.status(200).json({
      success: true,
      message: 'Invitation details fetched successfully',
      count: invitations.length,
      invitations: invitations
    })

  } catch (error: any) {
    console.error('Debug Invitation Details API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
