import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { invitationId } = req.body

  if (!invitationId) {
    return res.status(400).json({ message: 'Invitation ID is required' })
  }

  try {
    console.log('Reset Invitation Status API: Resetting invitation ID:', invitationId)

    const { data: updatedInvite, error } = await supabaseAdmin()
      .from('invites')
      .update({
        status: 'email_confirmed',
        admin_approved_at: null,
        admin_approved_by: null
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      console.error('Reset Invitation Status API: Error resetting invitation:', error)
      return res.status(500).json({ error: 'Failed to reset invitation', details: error.message })
    }

    if (!updatedInvite) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Invitation status reset successfully',
      invitation: {
        id: updatedInvite.id,
        email: updatedInvite.invited_email,
        status: updatedInvite.status,
        admin_approved_at: updatedInvite.admin_approved_at
      }
    })

  } catch (error: any) {
    console.error('Reset Invitation Status API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
