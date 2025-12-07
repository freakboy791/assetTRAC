import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Token is required' })
  }

  try {
    console.log('Validate invite API: Validating token:', token)

    // Find the invitation by token
    const { data: invitation, error } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()

    console.log('Validate invite API: Database query result:', { invitation, error })

    if (error || !invitation) {
      console.log('Validate invite API: Invitation not found or error:', error)
      return res.status(404).json({ message: 'Invitation not found or expired' })
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    console.log('Validate invite API: Expiration check:', {
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: now > expiresAt
    })
    
    if (now > expiresAt) {
      console.log('Validate invite API: Invitation expired')
      return res.status(400).json({ message: 'Invitation has expired' })
    }

    // Check if invitation is already used
    console.log('Validate invite API: Status check:', {
      status: invitation.status,
      isPending: invitation.status === 'pending'
    })
    
    if (invitation.status !== 'pending') {
      console.log('Validate invite API: Invitation already used, status:', invitation.status)
      return res.status(400).json({ message: 'Invitation has already been used' })
    }

    // Return the invitation data
    const responseData = {
      invitation: {
        id: invitation.id,
        email: invitation.invited_email,
        invited_email: invitation.invited_email,
        company_name: invitation.company_name,
        status: invitation.status,
        message: invitation.message,
        role: invitation.role,
        created_by: invitation.created_by || 'Admin',
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      }
    }
    
    res.status(200).json(responseData)

  } catch (error) {
    console.error('Validate invite API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
