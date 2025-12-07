import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'
import { triggerUserRefresh } from '@/lib/adminRefresh'







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

    const { data: users, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {

      return res.status(500).json({ message: 'Failed to check user existence' })
    }



    const userExists = users.users.some(user => user.email === email)

    
    if (!userExists) {

      
      // Check if this is an invitation-based user who hasn't logged in yet
      const { data: invitation, error: inviteError } = await supabaseAdmin()
        .from('invites')
        .select('status, admin_approved_at')
        .eq('invited_email', email)
        .single()

      if (!inviteError && invitation) {

        
        if (invitation.status === 'email_confirmed') {
          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'rejected') {
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'expired') {
          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'admin_approved' || invitation.status === 'completed') {

          return res.status(400).json({ message: 'Account setup incomplete. Please contact your administrator.' })
        }
      }
      
      return res.status(400).json({ message: 'No account exists for this email address' })
    }

    // Check if user is approved by admin

    
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

        console.log('Signin API: Invitation details:', {
          id: invitation.id,
          email: invitation.invited_email,
          status: invitation.status,
          admin_approved_at: invitation.admin_approved_at
        })
      } else {


      }

      if (!inviteError && invitation) {
        if (invitation.status === 'email_confirmed') {

          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'rejected') {

          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'expired') {

          return res.status(400).json({ message: 'Your account has been rejected by the administrator. Please contact your administrator for assistance.' })
        } else if (invitation.status === 'admin_approved' || invitation.status === 'completed') {

          // Allow login for approved or completed users
        } else {

          // Allow login for any other status
        }
      } else {

        // No invitation found, check profile status
        const { data: profile, error: profileError } = await supabaseAdmin()
          .from('profiles')
          .select('is_approved')
          .eq('email', email)
          .single()

        if (profileError) {

          // No profile and no invitation - this is an existing admin/owner account
        } else {


          if (profile.is_approved === false) {

            return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
          } else {

          }
        }
      }
    }

    // User exists and is approved, now try to sign in


    
    const { data, error } = await supabase().auth.signInWithPassword({
      email,
      password,
    })

    if (error) {





      // Check for specific error types
      if (error.message.includes('Email not confirmed')) {
        return res.status(400).json({ message: 'Account not activated. Please check your email and click the activation link to activate your account.' })
      }

      // If we get here, user exists but password is wrong
      return res.status(400).json({ message: 'Invalid password' })
    }




    
    // Check if this is a first login for any invited user and update invitation status
    const { data: invitation, error: inviteError } = await supabaseAdmin()
      .from('invites')
      .select('id, status, completed_at, company_name, role, created_by, company_id')
      .eq('invited_email', email)
      .in('status', ['email_confirmed', 'admin_approved'])
      .single()

    if (!inviteError && invitation && !invitation.completed_at) {

      
      // Only mark as completed if admin has already approved
      if (invitation.status === 'admin_approved') {

      
        // Log first login activity for admin-approved user - credit to admin who sent invitation
        try {
          // Get admin email who created the invitation
          const { data: adminProfile } = await supabaseAdmin()
            .from('profiles')
            .select('email')
            .eq('id', invitation.created_by)
            .single()
          
          const adminEmail = adminProfile?.email || 'unknown@admin.com'

          
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

          
          // Trigger admin dashboard refresh for first login
          try {
            triggerUserRefresh.firstLogin()

          } catch (refreshError) {
            console.error('Signin API: Error triggering admin refresh:', refreshError)
          }
        } else {
          console.error('Signin API: Failed to log first login activity:', firstLoginResponse.status, await firstLoginResponse.text())
        }

        // Record first login timestamp in profiles table
        const { error: profileUpdateError } = await supabaseAdmin()
          .from('profiles')
          .update({ 
            last_login_at: new Date().toISOString()
          })
          .eq('id', data.user.id)

        if (profileUpdateError) {
          console.error('Signin API: Error updating profile with first login timestamp:', profileUpdateError)
        } else {

        }

        // Create company-user association if it doesn't exist
        // For admin_approved users, find their own company by email instead of using invitation.company_id
        let userCompanyId = invitation.company_id
        
        if (invitation.status === 'admin_approved') {

          const { data: userCompany, error: userCompanyError } = await supabaseAdmin()
            .from('companies')
            .select('id')
            .eq('email', email)
            .single()
          
          if (userCompanyError) {
            console.error('Signin API: Error finding user company:', userCompanyError)
          } else if (userCompany) {
            userCompanyId = userCompany.id

          }
        }
        
        if (userCompanyId) {

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

          }
        }

        // Mark invitation as completed after first login (admin has already approved)

        
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

        }

      } catch (logError) {
        console.error('Signin API: Error logging activities:', logError)
      }
      } else if (invitation.status === 'email_confirmed') {

        
        // Log first login activity for email_confirmed users (but don't mark as completed)
        try {

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

            
            // Trigger admin dashboard refresh for email_confirmed user login
            try {
              triggerUserRefresh.firstLogin()

            } catch (refreshError) {
              console.error('Signin API: Error triggering admin refresh for email_confirmed user:', refreshError)
            }
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

    // Update last login timestamp for ALL logins

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

      }
    } catch (logError) {
      console.error('Signin API: Error updating login timestamp:', logError)
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
