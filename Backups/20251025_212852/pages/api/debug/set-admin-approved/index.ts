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
    console.log('Set Admin Approved API: Setting status to admin_approved for invitation ID:', invitationId)

    const { data: updatedInvite, error } = await supabaseAdmin()
      .from('invites')
      .update({
        status: 'admin_approved',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: '33667d79-6127-4907-b262-bf88833cb10b', // Admin user ID
        completed_at: null
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      console.error('Set Admin Approved API: Error updating invitation:', error)
      return res.status(500).json({ error: 'Failed to set admin approved', details: error.message })
    }

    if (!updatedInvite) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Invitation set to admin_approved successfully',
      invitation: {
        id: updatedInvite.id,
        email: updatedInvite.invited_email,
        status: updatedInvite.status,
        admin_approved_at: updatedInvite.admin_approved_at,
        email_confirmed_at: updatedInvite.email_confirmed_at
      }
    })

  } catch (error: any) {
    console.error('Set Admin Approved API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
