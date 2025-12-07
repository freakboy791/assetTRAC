import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, status, completed_at } = req.body

    if (!email || !status) {
      return res.status(400).json({ error: 'Email and status are required' })
    }



    // First check if the invitation already has a completed_at timestamp
    const { data: existingInvite, error: checkError } = await supabaseAdmin()
      .from('invites')
      .select('completed_at')
      .eq('invited_email', email)
      .single()

    if (checkError) {
      console.error('Update Status API: Error checking existing invitation:', checkError)
      return res.status(500).json({ error: 'Failed to check existing invitation' })
    }

    // Only set completed_at if it's not already set and we're setting status to completed
    const updateData: any = { status: status }
    if (status === 'completed' && !existingInvite.completed_at) {
      updateData.completed_at = completed_at || new Date().toISOString()

    } else if (status === 'completed' && existingInvite.completed_at) {

    }

    // Update invitation status
    const { error: updateError } = await supabaseAdmin()
      .from('invites')
      .update(updateData)
      .eq('invited_email', email)

    if (updateError) {
      console.error('Update Status API: Error updating invitation:', updateError)
      return res.status(500).json({ error: 'Failed to update invitation status' })
    }



    // Also update the user's last login timestamp in profiles table
    const { error: profileError } = await supabaseAdmin()
      .from('profiles')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('email', email)

    if (profileError) {
      console.error('Update Status API: Error updating profile login timestamp:', profileError)
      // Don't fail the request if profile update fails
    } else {

    }

    res.status(200).json({ 
      success: true, 
      message: 'Invitation status updated successfully' 
    })

  } catch (error) {
    console.error('Update Status API: Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
