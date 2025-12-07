import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Check Users API: Checking existing users...')
    
    // Get all users from auth.users
    const { data: users, error } = await supabaseAdmin()
      .from('auth.users')
      .select('*')
      .limit(10)

    if (error) {
      console.error('Check Users API: Error fetching users:', error)
      // Try profiles table instead
      const { data: profiles, error: profileError } = await supabaseAdmin()
        .from('profiles')
        .select('*')
        .limit(10)

      if (profileError) {
        return res.status(500).json({ 
          error: 'Failed to fetch users', 
          details: profileError.message 
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Profiles fetched successfully',
        userCount: profiles?.length || 0,
        users: profiles?.map(profile => ({
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at
        }))
      })
    }

    console.log('Check Users API: Found users:', users?.length || 0)

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      userCount: users?.length || 0,
      users: users?.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }))
    })

  } catch (error) {
    console.error('Check Users API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
