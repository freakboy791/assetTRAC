import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Token is required' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Validate invite API: Looking for token:', token)

    // Find the invitation by token
    const { data: invitation, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      console.log('Validate invite API: Invitation not found:', error)
      return res.status(404).json({ message: 'Invitation not found or expired' })
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      console.log('Validate invite API: Invitation expired')
      return res.status(400).json({ message: 'Invitation has expired' })
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {
      console.log('Validate invite API: Invitation already used, status:', invitation.status)
      return res.status(400).json({ message: 'Invitation has already been used' })
    }

    console.log('Validate invite API: Invitation found and valid:', invitation.invited_email)

    // Return the invitation data
    res.status(200).json({
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        invited_email: invitation.invited_email,
        company_name: invitation.company_name,
        status: invitation.status,
        message: invitation.message,
        created_by: invitation.created_by || 'Admin',
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      }
    })

  } catch (error) {
    console.error('Validate invite API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
