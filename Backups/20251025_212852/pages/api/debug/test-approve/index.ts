import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Test Approve API: Testing approve functionality...')
    
    // Get the test invitation
    const { data: invitations, error: fetchError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('invited_email', 'test@example.com')
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !invitations || invitations.length === 0) {
      console.error('Test Approve API: Error fetching invitation:', fetchError)
      return res.status(404).json({ 
        error: 'Test invitation not found', 
        details: fetchError?.message 
      })
    }

    const invitation = invitations[0]
    console.log('Test Approve API: Found invitation:', invitation.id)

    // Test the approve logic by updating the invitation status
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin()
      .from('invites')
      .update({ 
        status: 'admin_approved',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: '33667d79-6127-4907-b262-bf88833cb10b' // Admin user ID
      })
      .eq('id', invitation.id)
      .select()
      .single()

    if (updateError) {
      console.error('Test Approve API: Error updating invitation:', updateError)
      return res.status(500).json({ 
        error: 'Failed to update invitation status', 
        details: updateError.message 
      })
    }

    console.log('Test Approve API: Invitation approved successfully')

    return res.status(200).json({
      success: true,
      message: 'Invitation approved successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.invited_email,
        status: updatedInvitation.status,
        admin_approved_at: updatedInvitation.admin_approved_at,
        admin_approved_by: updatedInvitation.admin_approved_by
      }
    })

  } catch (error) {
    console.error('Test Approve API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
