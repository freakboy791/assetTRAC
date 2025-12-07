import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    

    // Get the user from the authorization token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase().auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }



    // Find the most recent invitation for this user
    const { data: invitation, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (inviteError || !invitation) {

      return res.status(404).json({ message: 'No invitation found for this user' })
    }



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
