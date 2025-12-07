import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'






export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Validate the token with Supabase
    const { data: { user }, error } = await supabase().auth.getUser(token)
    
    if (error || !user) {
      console.log('Token validation failed:', error)
      return res.status(401).json({ error: 'Invalid token' })
    }

    console.log('Token validation successful for user:', user.email)
    return res.status(200).json({ 
      valid: true, 
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Error validating token:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
