import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return res.status(200).json({ user: null })
    }

    return res.status(200).json({ user })
  } catch (error) {
    return res.status(200).json({ user: null })
  }
}
