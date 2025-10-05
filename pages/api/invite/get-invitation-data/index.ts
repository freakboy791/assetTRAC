import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the user from the authorization token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    console.log('Get invitation data API: User:', user.email)

    // Find the most recent invitation for this user
    const { data: invitation, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('invited_email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (inviteError || !invitation) {
      console.log('Get invitation data API: No invitation found for user:', user.email)
      return res.status(404).json({ message: 'No invitation found for this user' })
    }

    console.log('Get invitation data API: Found invitation:', invitation)

    res.status(200).json({
      company_name: invitation.company_name,
      invited_email: invitation.invited_email,
      role: invitation.role,
      company_id: invitation.company_id,
      status: invitation.status
    })

  } catch (error: any) {
    console.error('Get invitation data API error:', error)
    res.status(500).json({ message: `Failed to get invitation data: ${error.message}` })
  }
}
