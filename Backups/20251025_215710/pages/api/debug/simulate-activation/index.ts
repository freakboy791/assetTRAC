import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Simulate Activation API: Simulating user activation...')
    
    // Get the test invitation
    const { data: invitations, error: fetchError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', 'test@example.com')
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !invitations || invitations.length === 0) {
      console.error('Simulate Activation API: Error fetching invitation:', fetchError)
      return res.status(404).json({ 
        error: 'Test invitation not found', 
        details: fetchError?.message 
      })
    }

    const invitation = invitations[0]
    console.log('Simulate Activation API: Found invitation:', invitation.id)

    // Update invitation status to 'email_confirmed' (simulating user activation)
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin()
      .from('invites')
      .update({ 
        status: 'email_confirmed',
        email_confirmed_at: new Date().toISOString()
      })
      .eq('id', invitation.id)
      .select()
      .single()

    if (updateError) {
      console.error('Simulate Activation API: Error updating invitation:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update invitation status', 
        details: updateError.message 
      })
    }

    console.log('Simulate Activation API: Invitation status updated to email_confirmed')

    return res.status(200).json({
      success: true,
      message: 'User activation simulated successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.invited_email,
        status: updatedInvitation.status,
        email_confirmed_at: updatedInvitation.email_confirmed_at,
        admin_approved_at: updatedInvitation.admin_approved_at
      }
    })

  } catch (error) {
    console.error('Simulate Activation API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
