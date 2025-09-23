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

    // Check if user has permission to approve users (admin, owner, or manager)
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (companyUserError || !companyUser) {
      console.log('User role check failed:', { companyUserError, companyUser })
      return res.status(403).json({ error: 'User not found in company' })
    }

    const userRole = companyUser.role
    const canApproveUsers = userRole === 'admin' || userRole === 'owner' || userRole.startsWith('manager')

    if (!canApproveUsers) {
      console.log('User does not have permission to approve users:', { userRole })
      return res.status(403).json({ error: 'Insufficient permissions to approve users' })
    }

    const { invitationId } = req.body

    console.log('Approve User API: Request body:', req.body)
    console.log('Approve User API: Invitation ID:', invitationId)
    console.log('Approve User API: Admin user ID:', user.id)
    console.log('Approve User API: Admin email:', user.email)

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
      console.log('Approve User API: Invitation not found:', { inviteError, invitation })
      return res.status(404).json({ error: 'Invitation not found' })
    }

    console.log('Approve User API: Found invitation:', { 
      id: invitation.id, 
      email: invitation.invited_email, 
      status: invitation.status 
    })

    if (invitation.status !== 'email_confirmed') {
      console.log('Approve User API: Invitation not in correct status:', invitation.status)
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
      console.error('Approve User API: Error updating invitation:', updateError)
      return res.status(500).json({ error: 'Failed to approve invitation' })
    } else {
      console.log('Approve User API: Invitation status updated to admin_approved')
    }

    // Update user profile to mark as approved
    console.log('Approve User API: Updating profile for email:', invitation.invited_email)
    
    // First try to update existing profile
    const { data: updateData, error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('email', invitation.invited_email)
      .select()

    if (profileUpdateError) {
      console.error('Approve User API: Error updating profile:', profileUpdateError)
      
      // If update fails, try to create new profile
      console.log('Approve User API: Update failed, trying to create new profile')
      const { data: createData, error: createError } = await supabase
        .from('profiles')
        .insert({
          email: invitation.invited_email,
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .select()

      if (createError) {
        console.error('Approve User API: Error creating profile:', createError)
        console.error('Approve User API: Profile error details:', JSON.stringify(createError, null, 2))
        // Don't fail the whole process if this fails
      } else {
        console.log('Approve User API: Profile created successfully:', createData)
      }
    } else {
      console.log('Approve User API: Profile updated successfully:', updateData)
    }

    console.log('User approved successfully:', invitation.invited_email)

    // Log the approval activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email || 'unknown',
          action: 'USER_APPROVED',
          description: `Approved user invitation for ${invitation.invited_email} (${invitation.role})`,
          metadata: {
            approved_user_email: invitation.invited_email,
            approved_user_role: invitation.role,
            invitation_id: invitation.id
          }
        })
      })
    } catch (logError) {
      console.error('Error logging approval activity:', logError)
    }

    res.status(200).json({
      success: true,
      message: 'User approved successfully'
    })

  } catch (error) {
    console.error('Error in approve user API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
