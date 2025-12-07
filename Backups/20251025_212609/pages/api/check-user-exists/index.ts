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
    // Check if user exists in Supabase auth
    const { data: users, error } = await supabaseAdmin().auth.admin.listUsers()
    
    if (error) {
      return res.status(500).json({ error: 'Failed to check user existence' })
    }

    const userExists = users.users.some(user => user.email === email)
    
    return res.status(200).json({ exists: userExists })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
