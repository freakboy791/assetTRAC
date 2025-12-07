import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' })
  }

  try {
    



    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('*')
      .eq('token', token)
      .single()



    if (inviteError) {
      console.error('Accept invite API: Error looking up invitation:', inviteError)
      return res.status(500).json({ message: 'Error looking up invitation' })
    }

    if (!invitation) {

      return res.status(404).json({ message: 'Invitation not found' })
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {

      return res.status(400).json({ message: 'Invitation has expired' })
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {

      return res.status(400).json({ message: 'Invitation has already been used' })
    }



    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {
      console.error('Accept invite API: Error checking existing users:', listError)
      return res.status(500).json({ message: 'Failed to check existing users' })
    }

    const existingUser = existingUsers.users.find(user => user.email === invitation.invited_email)
    
    let userData;
    if (existingUser) {

      
      // Update existing user's password and metadata
      const { data: updateData, error: updateError } = await supabaseAdmin().auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true, // Ensure email is confirmed
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

    } else {

      
      // First check if user already exists
      const { data: usersData, error: checkError } = await supabaseAdmin().auth.admin.listUsers()
      const existingUser = usersData?.users?.find((user: any) => user.email === invitation.invited_email)
      
      if (existingUser && !checkError) {

        
        // Update existing user's password and confirm email
        const { data: updateData, error: updateError } = await supabaseAdmin().auth.admin.updateUserById(existingUser.id, {
          password: password,
          email_confirm: true,
          user_metadata: {
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

      } else {
        // Create new user account using Supabase Admin
        const { data: newUserData, error: userError } = await supabaseAdmin().auth.admin.createUser({
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

      if (!newUserData || !newUserData.user) {
        console.error('Accept invite API: User creation returned no user data')
        return res.status(500).json({ 
          message: 'User creation failed - no user data returned' 
        })
      }

      userData = newUserData

      }
    }



    // Update invitation status to 'pending' - will be changed to 'email_confirmed' after company creation

    const { error: updateError } = await supabaseAdmin()
      .from('invites')
      .update({ 
        status: 'pending', // Keep as pending until company is created
        accepted: true,
        company_id: invitation.company_id
      })
      .eq('token', token)



    if (updateError) {
      console.error('Accept invite API: Error updating invitation:', updateError)
      return res.status(500).json({ 
        message: `Failed to update invitation status: ${updateError.message}` 
      })
    } else {

      
      // Verify the update worked
      const { data: verifyInvite, error: verifyError } = await supabaseAdmin()
        .from('invites')
        .select('id, status, email_confirmed_at, admin_approved_at')
        .eq('token', token)
        .single()
      
      console.log('Accept invite API: Verification of invitation update:', {
        verifyInvite,
        verifyError
      })
    }

    // Create or update user profile record
    const { error: profileError } = await supabaseAdmin()
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

    }

    // DO NOT create company-user association during invitation acceptance
    // The user will be associated with their own company when they create it
    // This prevents the user from being associated with the admin's company


    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.invited_email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/company/create`
      }
    })

    if (sessionError) {
      console.error('Accept invite API: Error generating session link:', sessionError)
      // Continue without session - user will need to log in manually
    } else {

    }

    // Log the invitation acceptance activity - credit to admin who sent invitation
    try {
      // Get admin email who created the invitation
      const { data: adminProfile } = await supabaseAdmin()
        .from('profiles')
        .select('email')
        .eq('id', invitation.created_by)
        .single()
      
      const adminEmail = adminProfile?.email || 'unknown@admin.com'
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: invitation.created_by, // Admin's user ID
          user_email: adminEmail, // Admin's email
          company_id: invitation.company_id,
          action: 'INVITATION_ACCEPTED',
          description: `User ${invitation.invited_email} accepted invitation for ${invitation.role} role`,
          metadata: {
            invited_email: invitation.invited_email,
            invited_user_id: userData.user.id,
            role: invitation.role,
            company_name: invitation.company_name,
            company_id: invitation.company_id,
            invitation_id: invitation.id
          }
        })
      })
    } catch (logError) {
      console.error('Error logging invitation acceptance activity:', logError)
      // Don't fail the request if logging fails
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
