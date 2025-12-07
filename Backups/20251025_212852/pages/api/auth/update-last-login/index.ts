import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, validateJWTToken } from '@/lib/supabaseClient'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7)

    // Validate the JWT token and get user data
    const { user, error: userError } = await validateJWTToken(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }



    // Update last login timestamp in profiles table
    const { error: profileUpdateError } = await supabaseAdmin()
      .from('profiles')
      .update({ 
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileUpdateError) {
      console.error('Update Last Login API: Error updating profile with login timestamp:', profileUpdateError)
      return res.status(500).json({ error: 'Failed to update last login timestamp' })
    }



    return res.status(200).json({ 
      success: true,
      message: 'Last login timestamp updated successfully',
      last_login_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Update Last Login API: Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
