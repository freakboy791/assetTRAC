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
    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    
    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is admin by looking up their role in company_users table
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser || companyUser.role !== 'admin') {
      console.log('Admin check failed:', { companyUserError, companyUser })
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { invitationId } = req.body

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' })
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    if (invitation.status !== 'email_confirmed') {
      return res.status(400).json({ error: 'Invitation is not in the correct status for approval' })
    }

    // Update invitation status to admin_approved
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'admin_approved',
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: user.id
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return res.status(500).json({ error: 'Failed to approve invitation' })
    }

    // Update user profile to mark as approved
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('email', invitation.invited_email)

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Don't fail the whole process if this fails
    }

    console.log('User approved successfully:', invitation.invited_email)

    res.status(200).json({
      success: true,
      message: 'User approved successfully'
    })

  } catch (error) {
    console.error('Error in approve user API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
