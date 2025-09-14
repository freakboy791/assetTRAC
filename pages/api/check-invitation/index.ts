import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
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
