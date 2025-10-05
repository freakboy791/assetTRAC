import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { invitationId } = req.body

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' })
    }

    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Create a client for token validation using anon key
    const { createClient } = await import('@supabase/supabase-js')
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        }
      }
    )
    
    // Get the current user's session using the token
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    // Use admin client for database operations
    const supabaseClient = supabase()

    // Get user's company_id and role from company_users table
    const { data: companyUser, error: companyUserError } = await supabaseClient
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser?.company_id) {
      return res.status(400).json({ error: 'User not associated with a company' })
    }

    // Check if user has permission to reject invitations (admin, owner, or manager)
    const userRole = companyUser.role
    const canRejectInvitations = userRole === 'admin' || userRole === 'owner' || userRole.startsWith('manager')

    if (!canRejectInvitations) {
      console.log('User does not have permission to reject invitations:', { userRole })
      return res.status(403).json({ error: 'Insufficient permissions to reject invitations' })
    }

    // Verify the invitation belongs to the user's company
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invites')
      .select('*')
      .eq('id', invitationId)
      .eq('company_id', companyUser.company_id)
      .single()

    if (invitationError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Update the invitation with rejection status
    const { error: updateError } = await supabaseClient
      .from('invites')
      .update({ 
        status: 'rejected',
        admin_rejected_at: new Date().toISOString(),
        admin_rejected_by: user.id
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error rejecting invitation:', updateError)
      return res.status(500).json({ error: 'Failed to reject invitation' })
    }

    // Log the rejection activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email || 'unknown',
          action: 'USER_REJECTED',
          description: `Rejected user invitation for ${invitation.invited_email} (${invitation.role})`,
          metadata: {
            rejected_user_email: invitation.invited_email,
            rejected_user_role: invitation.role,
            invitation_id: invitation.id
          }
        })
      })
    } catch (logError) {
      console.error('Error logging rejection activity:', logError)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in reject-invitation API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
