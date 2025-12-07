import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

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

    // Use shared Supabase client

    // Create admin client
    

    // Get the requesting user's information for role validation
    let requestingUser: any = null
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '')


      
      // Create a client for token validation using service role key
      
      
      
      const { data: { user }, error: userError } = await supabase().auth.getUser(token)

      
      if (userError || !user) {
        console.error('Send invite API: Token validation error:', userError)
        return res.status(401).json({ message: 'Invalid authorization token' })
      }
      requestingUser = user

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
      const { data: companyUser, error: companyUserError } = await supabaseAdmin()
        .from('company_users')
        .select('company_id')
        .eq('user_id', requestingUser.id)
        .single()

      if (companyUserError || !companyUser) {
        console.error('Error getting admin company:', companyUserError)
        return res.status(400).json({ message: 'Admin not associated with a company' })
      }

      adminCompanyId = companyUser.company_id

    }



    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin().auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to check existing users' })
    }

    const userExists = existingUsers.users.some(user => user.email === trimmedData.email)
    
    if (userExists) {

      
      // Check if there's already an invitation for this user
      const { data: existingInvite, error: inviteCheckError } = await supabaseAdmin()
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

      
      const { data: newUser, error: userError } = await supabaseAdmin().auth.admin.createUser({
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


    }

    // Generate unique invitation token
    const invitationToken = uuidv4()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/join/${invitationToken}`
    




    // Create invitation record in database
    const { data: inviteRecord, error: inviteError } = await supabaseAdmin()
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


    console.log('Send invite API: Invitation details:', {
      id: inviteRecord.id,
      email: inviteRecord.invited_email,
      company: inviteRecord.company_name,
      role: inviteRecord.role,
      status: inviteRecord.status
    })

    // Call Supabase Edge Function to send email




    
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
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
        console.error('Send invite API: Email function error:', emailResult)
        // Don't fail the whole process if email fails, just log it

      } else {

      }
    } catch (emailError) {
      console.error('Send invite API: Error calling email function:', emailError)
      // Don't fail the whole process if email fails

    }

    // Log the invitation activity
    try {
      // Get the admin user's email from the authorization token
      let adminEmail = 'system'
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '')
        const { data: { user: adminUser } } = await supabase().auth.getUser(token)
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
