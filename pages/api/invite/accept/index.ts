import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Accept invite API: Processing invitation for token:', token)

    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      console.log('Accept invite API: Invitation not found:', inviteError)
      return res.status(404).json({ message: 'Invitation not found' })
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      console.log('Accept invite API: Invitation expired')
      return res.status(400).json({ message: 'Invitation has expired' })
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {
      console.log('Accept invite API: Invitation already used, status:', invitation.status)
      return res.status(400).json({ message: 'Invitation has already been used' })
    }

    console.log('Accept invite API: Invitation found, processing for:', invitation.invited_email)

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Accept invite API: Error checking existing users:', listError)
      return res.status(500).json({ message: 'Failed to check existing users' })
    }

    const existingUser = existingUsers.users.find(user => user.email === invitation.invited_email)
    
    let userData;
    if (existingUser) {
      console.log('Accept invite API: User already exists, updating password and metadata')
      
      // Update existing user's password and metadata
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        user_metadata: {
          ...existingUser.user_metadata,
          invited_email: invitation.invited_email,
          company_name: invitation.company_name,
          invited_via: 'admin_invitation',
          invitation_role: invitation.role,
          invitation_company_id: invitation.company_id
        }
      })

      if (updateError) {
        console.error('Accept invite API: Error updating existing user:', updateError)
        return res.status(500).json({ 
          message: `Failed to update existing user: ${updateError.message}` 
        })
      }

      userData = { user: updateData.user }
      console.log('Accept invite API: Existing user updated successfully')
    } else {
      console.log('Accept invite API: Creating new user account')
      
      // Create new user account using Supabase Admin
      const { data: newUserData, error: userError } = await supabase.auth.admin.createUser({
        email: invitation.invited_email,
        password: password,
        email_confirm: true, // Auto-confirm email since they're accepting an invitation
        user_metadata: {
          invited_email: invitation.invited_email,
          company_name: invitation.company_name,
          invited_via: 'admin_invitation',
          invitation_role: invitation.role,
          invitation_company_id: invitation.company_id
        }
      })

      if (userError) {
        console.error('Accept invite API: Error creating user:', userError)
        return res.status(500).json({ 
          message: `Failed to create user account: ${userError.message}` 
        })
      }

      userData = newUserData
      console.log('Accept invite API: New user created successfully:', userData.user?.email)
    }

    console.log('Accept invite API: User created successfully:', userData.user?.email)

    // Update invitation status to 'email_confirmed' (awaiting admin approval)
    const { error: updateError } = await supabase
      .from('invites')
      .update({ 
        status: 'email_confirmed',
        email_confirmed_at: new Date().toISOString()
      })
      .eq('token', token)

    if (updateError) {
      console.error('Accept invite API: Error updating invitation:', updateError)
      // Don't fail the whole process if this fails
    }

    console.log('Accept invite API: Invitation status updated to accepted')

    // Create or update user profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.user?.id,
        email: invitation.invited_email,
        email_verified: true,
        is_approved: false // User is not approved by admin yet
      })

    if (profileError) {
      console.error('Accept invite API: Error creating/updating profile:', profileError)
      // Don't fail the whole process if this fails
    } else {
      console.log('Accept invite API: Profile created/updated successfully')
    }

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.invited_email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
      }
    })

    if (sessionError) {
      console.error('Accept invite API: Error generating session link:', sessionError)
      // Continue without session - user will need to log in manually
    } else {
      console.log('Accept invite API: Session link generated successfully')
    }

    // Determine user roles and company status for session
    const roles = [invitation.role || 'user']
    const isAdmin = roles.includes('admin')
    const isOwner = roles.includes('owner')
    const hasCompany = invitation.company_id ? true : false

    res.status(200).json({
      success: true,
      message: 'Account created successfully! You can now log in.',
      user: userData.user,
      userRoles: roles,
      isAdmin,
      isOwner,
      hasCompany,
      sessionLink: sessionData?.properties?.action_link
    })

  } catch (error) {
    console.error('Accept invite API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
