import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Test Admin Token API: Testing admin token validation')

    // Test with a dummy token to see what happens
    const dummyToken = 'dummy-token'
    
    const { data: { user }, error: userError } = await supabaseAdmin().auth.getUser(dummyToken)
    
    console.log('Test Admin Token API: Token validation result:', { user, userError })

    res.status(200).json({
      success: true,
      message: 'Admin token test completed',
      user: user,
      userError: userError?.message || null,
      hasUser: !!user
    })

  } catch (error: any) {
    console.error('Test Admin Token API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
