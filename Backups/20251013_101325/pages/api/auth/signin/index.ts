import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'







// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }


  try {
    // First check if user exists
    console.log('Signin API: Checking if user exists for email:', email)
    const { data: users, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {
      console.log('Signin API: Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to check user existence' })
    }

    console.log('Signin API: Found users:', users.users.length)
    console.log('Signin API: User emails:', users.users.map(u => u.email))
    const userExists = users.users.some(user => user.email === email)
    console.log('Signin API: User exists:', userExists)
    
    if (!userExists) {
      console.log('Signin API: No account exists for email:', email)
      
      // Check if this is an invitation-based user who hasn't logged in yet
      const { data: invitation, error: inviteError } = await supabaseAdmin()
        .from('invites')
        .select('status, admin_approved_at')
        .eq('invited_email', email)
        .single()

      if (!inviteError && invitation) {
        console.log('Signin API: Found invitation for non-existent user, status:', invitation.status)
        
        if (invitation.status === 'email_confirmed') {
          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'rejected') {
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'expired') {
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'admin_approved' || invitation.status === 'completed') {
          console.log('Signin API: Invitation approved/completed, but user not created yet - this should not happen')
          return res.status(400).json({ message: 'Account setup incomplete. Please contact your administrator.' })
        }
      }
      
      return res.status(400).json({ message: 'No account exists for this email address' })
    }

    // Check if user is approved by admin
    console.log('Signin API: Checking user approval status...')
    
    // First get the user ID
    const user = users.users.find(u => u.email === email)
    if (!user) {
      return res.status(400).json({ message: 'User not found' })
    }

    // First check if this is an admin user - admins always get access
    const { data: companyUser, error: companyUserError } = await supabaseAdmin()
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = !companyUserError && companyUser && companyUser.role === 'admin'
    
    if (isAdmin) {
      console.log('Signin API: User is admin, bypassing approval check')
    } else {
      // ALWAYS check invitation status first for any user
      const { data: invitation, error: inviteError } = await supabaseAdmin()
        .from('invites')
        .select('id, invited_email, status, admin_approved_at')
        .eq('invited_email', email)
        .in('status', ['pending', 'email_confirmed', 'admin_approved', 'completed', 'rejected', 'expired'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!inviteError && invitation) {
        console.log('Signin API: Found invitation, status:', invitation.status)
        console.log('Signin API: Invitation details:', {
          id: invitation.id,
          email: invitation.invited_email,
          status: invitation.status,
          admin_approved_at: invitation.admin_approved_at
        })
      } else {
        console.log('Signin API: No invitation found or error:', inviteError?.message)
        console.log('Signin API: Invitation data:', invitation)
      }

      if (!inviteError && invitation) {
        if (invitation.status === 'email_confirmed') {
          console.log('Signin API: User activated but not yet approved by admin')
          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'rejected') {
          console.log('Signin API: User account rejected by admin')
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'expired') {
          console.log('Signin API: User account rejected/expired by admin')
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'admin_approved' || invitation.status === 'completed') {
          console.log('Signin API: User is approved/completed, allowing login')
          // Allow login for approved or completed users
        } else {
          console.log('Signin API: Unknown invitation status:', invitation.status, 'allowing login')
          // Allow login for any other status
        }
      } else {
        console.log('Signin API: No invitation found, checking profile status')
        // No invitation found, check profile status
        const { data: profile, error: profileError } = await supabaseAdmin()
          .from('profiles')
          .select('is_approved')
          .eq('email', email)
          .single()

        if (profileError) {
          console.log('Signin API: No profile found, allowing login for existing account')
          // No profile and no invitation - this is an existing admin/owner account
        } else {
          console.log('Signin API: Profile found, is_approved:', profile.is_approved)
          console.log('Signin API: Profile details:', profile)
          if (profile.is_approved === false) {
            console.log('Signin API: Profile is_approved is false, blocking login')
            return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
          } else {
            console.log('Signin API: Profile is_approved is true or null, allowing login')
          }
        }
      }
    }

    // User exists and is approved, now try to sign in
    console.log('Signin API: User exists and is approved, attempting sign in...')
    console.log('Signin API: Attempting sign in for email:', email)
    
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log('Signin API: Supabase auth error:', error)
      console.log('Signin API: Error message:', error.message)
      console.log('Signin API: Error code:', error.status)
      console.log('Signin API: Full error object:', JSON.stringify(error, null, 2))

      // Check for specific error types
      if (error.message.includes('Email not confirmed')) {
        return res.status(400).json({ message: 'Account not activated. Please check your email and click the activation link to activate your account.' })
      }

      // If we get here, user exists but password is wrong
      return res.status(400).json({ message: 'Invalid password' })
    }

    console.log('Signin API: Supabase auth successful, data:', data)

    console.log('Signin API: Sign in successful')
    
    // Check if this is a first login for any invited user and update invitation status
    const { data: invitation, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('id, status, completed_at, company_name, role, created_by, company_id')
      .eq('invited_email', email)
      .in('status', ['email_confirmed', 'admin_approved'])
      .single()

    if (!inviteError && invitation && !invitation.completed_at) {
      console.log('Signin API: First login detected, invitation status:', invitation.status)
      
      // Only mark as completed if admin has already approved
      if (invitation.status === 'admin_approved') {
        console.log('Signin API: Admin approved user logging in for first time - marking as completed')
      
        // Log first login activity for admin-approved user - credit to admin who sent invitation
        try {
          // Get admin email who created the invitation
          const { data: adminProfile } = await supabaseAdmin()
            .from('profiles')
            .select('email')
            .eq('id', invitation.created_by)
            .single()
          
          const adminEmail = adminProfile?.email || 'unknown@admin.com'
          console.log('Signin API: Logging first login for admin-approved user - crediting admin:', adminEmail)
          
          const firstLoginResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: invitation.created_by, // Admin who sent invitation
              user_email: adminEmail, // Admin's email
              company_id: invitation.company_id, // Admin's company
              action: 'USER_FIRST_LOGIN',
              description: `User ${email} logged in successfully for the first time (${invitation.role})`,
              metadata: {
                invited_user_email: email,
                invited_user_id: data.user.id,
                invitation_id: invitation.id,
                company_name: invitation.company_name,
                user_role: invitation.role,
                admin_who_approved: adminEmail,
                admin_user_id: invitation.created_by
              }
            })
          })
        
        if (firstLoginResponse.ok) {
          console.log('Signin API: First login activity logged successfully')
        } else {
          console.error('Signin API: Failed to log first login activity:', firstLoginResponse.status, await firstLoginResponse.text())
        }

        // Record first login timestamp in profiles table
        const { error: profileUpdateError } = await supabaseAdmin()
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString()
          })
          .eq('user_id', data.user.id)

        if (profileUpdateError) {
          console.error('Signin API: Error updating profile with first login timestamp:', profileUpdateError)
        } else {
          console.log('Signin API: First login timestamp recorded in profile')
        }

        // Create company-user association if it doesn't exist
        // For admin_approved users, find their own company by email instead of using invitation.company_id
        let userCompanyId = invitation.company_id
        
        if (invitation.status === 'admin_approved') {
          console.log('Signin API: User is admin_approved, finding their own company by email:', email)
          const { data: userCompany, error: userCompanyError } = await supabaseAdmin()
            .from('companies')
            .select('id')
            .eq('email', email)
            .single()
          
          if (userCompanyError) {
            console.error('Signin API: Error finding user company:', userCompanyError)
          } else if (userCompany) {
            userCompanyId = userCompany.id
            console.log('Signin API: Found user company ID:', userCompanyId)
          }
        }
        
        if (userCompanyId) {
          console.log('Signin API: Creating company-user association for company:', userCompanyId)
          const { error: associationError } = await supabaseAdmin()
            .from('company_users')
            .upsert({
              user_id: data.user.id,
              company_id: userCompanyId,
              role: invitation.role || 'owner'
            })

          if (associationError) {
            console.error('Signin API: Error creating company-user association:', associationError)
          } else {
            console.log('Signin API: Company-user association created successfully')
          }
        }

        // Mark invitation as completed after first login (admin has already approved)
        console.log('Signin API: Marking invitation as completed after first login')
        
        const { error: completeError } = await supabaseAdmin()
          .from('invites')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', invitation.id)

        if (completeError) {
          console.error('Signin API: Error marking invitation as completed:', completeError)
        } else {
          console.log('Signin API: Invitation marked as completed successfully')
        }

      } catch (logError) {
        console.error('Signin API: Error logging activities:', logError)
      }
      } else if (invitation.status === 'email_confirmed') {
        console.log('Signin API: User activated but not yet approved by admin - logging first login but not marking as completed')
        
        // Log first login activity for email_confirmed users (but don't mark as completed)
        try {
          console.log('Signin API: Logging first login activity for email_confirmed user:', email)
          const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: data.user.id,
              user_email: email,
              action: 'USER_FIRST_LOGIN',
              description: `User ${email} logged in for the first time (awaiting admin approval)`,
              metadata: {
                invitation_id: invitation.id,
                company_name: invitation.company_name,
                user_role: invitation.role,
                status: 'awaiting_admin_approval'
              }
            })
          })
          
          if (activityResponse.ok) {
            console.log('Signin API: First login activity logged for email_confirmed user')
          } else {
            console.error('Signin API: Failed to log first login activity for email_confirmed user:', activityResponse.status, await activityResponse.text())
          }
        } catch (logError) {
          console.error('Signin API: Error logging first login activity for email_confirmed user:', logError)
        }
      }
    }
    
    // Fetch user's role information from the database
    const { data: companyUsers, error: roleError } = await supabaseAdmin()
      .from('company_users')
      .select('role, companies(*)')
      .eq('user_id', data.user.id)

    console.log('Signin API: Company users query result:', { companyUsers, roleError })
    console.log('Signin API: User ID:', data.user.id)

    if (roleError) {
      console.error('Signin API: Error fetching user roles:', roleError)
    }

    // Determine user roles
    const roles = companyUsers?.map(cu => cu.role) || []
    const userIsAdmin = roles.includes('admin')
    const isOwner = roles.includes('owner')
    const hasCompany = companyUsers && companyUsers.length > 0

    console.log('Signin API: Role analysis:', {
      userEmail: email,
      roles,
      userIsAdmin,
      isOwner,
      hasCompany,
      companyUsers
    })

    // Update user metadata with role information
    const { error: updateError } = await supabaseAdmin().auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        ...data.user.user_metadata,
        roles: roles,
        isAdmin: userIsAdmin,
        isOwner: isOwner,
        hasCompany: hasCompany
      }
    })

    if (updateError) {
      console.error('Signin API: Error updating user metadata:', updateError)
    }

    // Update last login timestamp for all logins (but don't log regular logins as activities)
    if (!invitation || invitation.completed_at) {
      console.log('Signin API: Updating last login timestamp for:', email)
      try {
        // Update last login timestamp in profiles table
        const { error: profileUpdateError } = await supabaseAdmin()
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString()
          })
          .eq('id', data.user.id)

        if (profileUpdateError) {
          console.error('Signin API: Error updating profile with login timestamp:', profileUpdateError)
        } else {
          console.log('Signin API: Login timestamp recorded in profile')
        }
      } catch (logError) {
        console.error('Signin API: Error updating login timestamp:', logError)
      }
    }

    // Set the session in the response headers so the client can use it
    if (data.session) {
      res.setHeader('Set-Cookie', [
        `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax`
      ])
    }

    return res.status(200).json({ 
      user: data.user, 
      session: data.session,
      userRoles: roles,
      isAdmin: userIsAdmin,
      isOwner,
      hasCompany
    })
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
}
