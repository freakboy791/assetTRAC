import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { invitationId } = req.body

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' })
    }

    console.log('Test Approve: Approving invitation:', invitationId)

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      console.log('Test Approve: Invitation not found:', { inviteError, invitation })
      return res.status(404).json({ error: 'Invitation not found' })
    }

    console.log('Test Approve: Found invitation:', { 
      id: invitation.id, 
      email: invitation.invited_email, 
      status: invitation.status 
    })

    // Update invitation status to admin_approved
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'admin_approved',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: '33667d79-6127-4907-b262-bf88833cb10b' // Admin user ID
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Test Approve: Error updating invitation:', updateError)
      return res.status(500).json({ error: 'Failed to approve invitation' })
    } else {
      console.log('Test Approve: Invitation status updated to admin_approved')
    }

    // Create user profile to mark as approved
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        email: invitation.invited_email,
        is_approved: true,
        approved_by: '33667d79-6127-4907-b262-bf88833cb10b',
        approved_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Test Approve: Error creating user profile:', profileError)
      // Don't fail the whole process if this fails
    } else {
      console.log('Test Approve: Profile created successfully for:', invitation.invited_email)
    }

    console.log('Test Approve: User approved successfully:', invitation.invited_email)

    res.status(200).json({
      success: true,
      message: 'User approved successfully'
    })

  } catch (error) {
    console.error('Test Approve: Error in test approve API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
