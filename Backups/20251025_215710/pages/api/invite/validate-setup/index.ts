import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { token } = req.body

  if (!token) {
    return res.status(400).json({ message: 'Token is required' })
  }

  try {
    



    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {

      return res.status(404).json({ message: 'Invitation not found' })
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {

      return res.status(400).json({ message: 'Invitation has expired' })
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {

      return res.status(400).json({ message: 'Invitation has already been used' })
    }



    // Return invitation data for setup process
    return res.status(200).json({ 
      invitation: {
        id: invitation.id,
        invited_email: invitation.invited_email,
        company_name: invitation.company_name,
        role: invitation.role,
        company_id: invitation.company_id,
        message: invitation.message
      },
      isOwner: invitation.role === 'owner',
      setupStep: 'company' // Next step is company setup
    })

  } catch (error) {
    console.error('Error in validate setup API:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
