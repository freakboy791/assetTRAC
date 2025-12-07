import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { error } = await supabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth?reset=true`,
    })

    if (error) {
      return res.status(400).json({ message: error.message })
    }

    return res.status(200).json({ message: 'Password reset email sent' })
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}
