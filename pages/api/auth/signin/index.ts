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

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }


  try {
    // First check if user exists
    console.log('Signin API: Checking if user exists for email:', email)
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
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
      const { data: invitation, error: inviteError } = await supabase
        .from('invites')
        .select('status, admin_approved_at')
        .eq('invited_email', email)
        .single()

      if (!inviteError && invitation) {
        console.log('Signin API: Found invitation for non-existent user, status:', invitation.status)
        
        if (invitation.status === 'email_confirmed') {
          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
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
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = !companyUserError && companyUser && companyUser.role === 'admin'
    
    if (isAdmin) {
      console.log('Signin API: User is admin, bypassing approval check')
    } else {
      // ALWAYS check invitation status first for any user
      const { data: invitation, error: inviteError } = await supabase
        .from('invites')
        .select('id, invited_email, status, admin_approved_at')
        .eq('invited_email', email)
        .single()

      if (!inviteError && invitation) {
        console.log('Signin API: Found invitation, status:', invitation.status)
        console.log('Signin API: Invitation details:', {
          id: invitation.id,
          email: invitation.invited_email,
          status: invitation.status,
          admin_approved_at: invitation.admin_approved_at
        })
        
        if (invitation.status === 'email_confirmed') {
          console.log('Signin API: User not yet approved, blocking login')
          return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('email', email)
          .single()

        if (profileError) {
          console.log('Signin API: No profile found, allowing login for existing account')
          // No profile and no invitation - this is an existing admin/owner account
        } else {
          console.log('Signin API: Profile found, is_approved:', profile.is_approved)
          if (profile.is_approved === false) {
            return res.status(400).json({ message: 'Your account is waiting for admin approval. Please contact your administrator for assistance.' })
          }
        }
      }
    }

    // User exists and is approved, now try to sign in
    console.log('Signin API: User exists and is approved, attempting sign in...')
    console.log('Signin API: Attempting sign in for email:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
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
    
    // Check if this is a first login for an approved user and update invitation status
    const { data: invitation, error: inviteError } = await supabase
      .from('invites')
      .select('id, status')
      .eq('invited_email', email)
      .eq('status', 'admin_approved')
      .single()

    if (!inviteError && invitation) {
      console.log('Signin API: First login detected, marking invitation as completed')
      // Update invitation status to completed
      await supabase
        .from('invites')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', invitation.id)
    }
    
    // Fetch user's role information from the database
    const { data: companyUsers, error: roleError } = await supabase
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
    const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
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
