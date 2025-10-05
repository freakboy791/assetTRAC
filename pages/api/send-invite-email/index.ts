import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Disable SSL certificate verification for development
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  try {
    const { email, companyName, message, role } = req.body

    // Trim all string fields
    const trimmedData = {
      email: email?.trim(),
      companyName: companyName?.trim(),
      message: message?.trim(),
      role: role?.trim()
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        message: 'Missing Supabase configuration',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the requesting user's information for role validation
    let requestingUser: any = null
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '')
      console.log('Send invite API: Token received, length:', token.length)
      console.log('Send invite API: Token preview:', token.substring(0, 50) + '...')
      
      // Create a client for token validation using service role key
      const { createClient } = await import('@supabase/supabase-js')
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: { user }, error: userError } = await serviceClient.auth.getUser(token)
      console.log('Send invite API: User lookup result:', { user: !!user, error: userError?.message })
      
      if (userError || !user) {
        console.error('Send invite API: Token validation error:', userError)
        return res.status(401).json({ message: 'Invalid authorization token' })
      }
      requestingUser = user
      console.log('Send invite API: User authenticated:', user.email)
    }

    // Validate role permissions
    if (requestingUser) {
      const userRoles = requestingUser.user_metadata?.roles || []
      const isAdmin = userRoles.includes('admin')
      const isOwner = userRoles.includes('owner')
      const isManager = userRoles.some(role => role.startsWith('manager'))

      // Check if user can send invitations
      if (!isAdmin && !isOwner && !isManager) {
        return res.status(403).json({ message: 'You do not have permission to send invitations' })
      }

      // Validate role hierarchy
      if (role === 'admin') {
        return res.status(403).json({ message: 'Cannot invite admin users' })
      }

      if (role === 'owner' && !isAdmin) {
        return res.status(403).json({ message: 'Only admins can invite owner users' })
      }

      if (role.startsWith('manager') && !isAdmin && !isOwner) {
        return res.status(403).json({ message: 'Only admins and owners can invite manager users' })
      }
    }

    // Get the admin's company_id
    let adminCompanyId = null
    if (requestingUser) {
      const { data: companyUser, error: companyUserError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', requestingUser.id)
        .single()

      if (companyUserError || !companyUser) {
        console.error('Error getting admin company:', companyUserError)
        return res.status(400).json({ message: 'Admin not associated with a company' })
      }

      adminCompanyId = companyUser.company_id
      console.log('Admin company ID:', adminCompanyId)
    }

    console.log('Send invite API: Starting invitation process for:', trimmedData.email)

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to check existing users' })
    }

    const userExists = existingUsers.users.some(user => user.email === trimmedData.email)
    
    if (userExists) {
      console.log('User already exists, checking for existing invitation...')
      
      // Check if there's already an invitation for this user
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from('invites')
        .select('*')
        .eq('invited_email', trimmedData.email)
        .single()

      if (existingInvite) {
        return res.status(200).json({
          success: true,
          message: `User with email ${trimmedData.email} already exists and has a pending invitation.`,
          invitationLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/accept/${existingInvite.token}`,
          userExists: true
        })
      }
    } else {
      // Create user account immediately when invitation is sent
      console.log('Send invite API: Creating user account for:', trimmedData.email)
      
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: trimmedData.email,
        email_confirm: false, // User needs to confirm via invitation link
        user_metadata: {
          company_name: trimmedData.companyName,
          role: trimmedData.role,
          invited: true,
          invitation_pending: true
        }
      })

      if (userError) {
        console.error('Send invite API: Error creating user account:', userError)
        return res.status(500).json({ 
          message: `Failed to create user account: ${userError.message}` 
        })
      }

      console.log('Send invite API: User account created successfully:', newUser.user?.email)
    }

    // Generate unique invitation token
    const invitationToken = uuidv4()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/join/${invitationToken}`
    
    console.log('Generated invitation token:', invitationToken)
    console.log('Generated invitation link:', invitationLink)
    console.log('Base URL used:', baseUrl)

    // Create invitation record in database
    const { data: inviteRecord, error: inviteError } = await supabase
      .from('invites')
      .insert({
        invited_email: trimmedData.email, // Use invited_email instead of email
        token: invitationToken,
        company_name: trimmedData.companyName,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_at: new Date().toISOString(),
        message: trimmedData.message || null, // Use message instead of custom_message
        role: trimmedData.role || 'owner', // Use provided role or default to 'owner' for admin invites
        used: false, // Add used flag
        created_by: requestingUser?.id || null, // Use requesting user ID if available
        company_id: adminCompanyId // Associate invitation with admin's company
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Send invite API: Error creating invitation record:', inviteError)
      return res.status(500).json({ 
        message: `Failed to create invitation record: ${inviteError.message}` 
      })
    }

    console.log('Send invite API: Invitation record created successfully:', inviteRecord.id)
    console.log('Send invite API: Invitation details:', {
      id: inviteRecord.id,
      email: inviteRecord.invited_email,
      company: inviteRecord.company_name,
      role: inviteRecord.role,
      status: inviteRecord.status
    })

    // Call custom email function
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedData.email,
          companyName: trimmedData.companyName,
          invitationLink,
          message: trimmedData.message || null,
          token: invitationToken
        })
      })

      const emailResult = await emailResponse.json()
      
      if (!emailResponse.ok) {
        console.error('Email function error:', emailResult)
        // Don't fail the whole process if email fails, just log it
        console.log('Email sending failed, but invitation record was created')
      } else {
        console.log('Email sent successfully:', emailResult)
      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError)
      // Don't fail the whole process if email fails
      console.log('Email sending failed, but invitation record was created')
    }

    // Log the invitation activity
    try {
      // Get the admin user's email from the authorization token
      let adminEmail = 'system'
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '')
        const { data: { user: adminUser } } = await supabase.auth.getUser(token)
        if (adminUser?.email) {
          adminEmail = adminUser.email
        }
      }
      
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: adminEmail,
          action: 'INVITATION_SENT',
          description: `Invitation sent to ${trimmedData.email} for ${trimmedData.role} role`,
          metadata: {
            invited_email: trimmedData.email,
            role: trimmedData.role,
            company_name: trimmedData.companyName,
            invitation_id: inviteRecord.id
          }
        })
      })
    } catch (logError) {
      console.error('Error logging invitation activity:', logError)
    }

    res.status(200).json({
      success: true,
      message: `Invitation created successfully for ${trimmedData.email}`,
      invitationLink,
      token: invitationToken
    })

  } catch (error: any) {
    console.error('Send invite API error:', error)
    res.status(500).json({ message: `Failed to process invitation: ${error.message}` })
  }
}
