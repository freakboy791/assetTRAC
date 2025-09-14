import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('getUser API: Session error:', sessionError)
      return res.status(200).json({ user: null })
    }

    if (!session) {
      console.log('getUser API: No session found')
      return res.status(200).json({ user: null })
    }

    console.log('getUser API: Session found, user:', session.user?.email)
    return res.status(200).json({ user: session.user })
  } catch (error) {
    console.log('getUser API: Error:', error)
    return res.status(200).json({ user: null })
  }
}
