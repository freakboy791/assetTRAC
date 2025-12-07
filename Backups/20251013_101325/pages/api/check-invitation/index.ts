import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'







// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { data: invitations, error } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      // Return empty invitation if table doesn't exist or other error
      return res.status(200).json({ invitation: null })
    }

    const invitation = invitations && invitations.length > 0 ? invitations[0] : null

    return res.status(200).json({ invitation })
  } catch (error) {
    console.error('API error:', error)
    return res.status(200).json({ invitation: null })
  }
}
