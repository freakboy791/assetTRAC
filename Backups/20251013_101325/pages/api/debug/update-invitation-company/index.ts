import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { invitationId, companyId } = req.body

  if (!invitationId || !companyId) {
    return res.status(400).json({ message: 'Invitation ID and Company ID are required' })
  }

  try {
    console.log('Update Invitation Company API: Updating invitation company for ID:', invitationId, 'to company:', companyId)

    const { data: updatedInvite, error } = await supabaseAdmin()
      .from('invites')
      .update({
        company_id: companyId
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      console.error('Update Invitation Company API: Error updating invitation:', error)
      return res.status(500).json({ error: 'Failed to update invitation company', details: error.message })
    }

    if (!updatedInvite) {
      return res.status(404).json({ message: 'Invitation not found' })
    }

    res.status(200).json({
      success: true,
      message: 'Invitation company updated successfully',
      invitation: {
        id: updatedInvite.id,
        email: updatedInvite.invited_email,
        company_id: updatedInvite.company_id,
        status: updatedInvite.status
      }
    })

  } catch (error: any) {
    console.error('Update Invitation Company API: Unexpected error:', error)
    res.status(500).json({ error: 'An unexpected error occurred', details: error.message })
  }
}
