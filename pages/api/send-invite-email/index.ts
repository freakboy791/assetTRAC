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

    console.log('Send invite API: Starting invitation process for:', email)

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return res.status(500).json({ message: 'Failed to check existing users' })
    }

    const userExists = existingUsers.users.some(user => user.email === email)
    
    if (userExists) {
      console.log('User already exists, checking for existing invitation...')
      
      // Check if there's already an invitation for this user
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from('invites')
        .select('*')
        .eq('invited_email', email)
        .single()

      if (existingInvite) {
        return res.status(200).json({
          success: true,
          message: `User with email ${email} already exists and has a pending invitation.`,
          invitationLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/invite/accept/${existingInvite.token}`,
          userExists: true
        })
      }
    }

    // Generate unique invitation token
    const invitationToken = uuidv4()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/invitation/${invitationToken}`
    
    console.log('Generated invitation token:', invitationToken)
    console.log('Generated invitation link:', invitationLink)
    console.log('Base URL used:', baseUrl)

    // Create invitation record in database
    const { data: inviteRecord, error: inviteError } = await supabase
      .from('invites')
      .insert({
        invited_email: email, // Use invited_email instead of email
        token: invitationToken,
        company_name: companyName,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_at: new Date().toISOString(),
        message: message || null, // Use message instead of custom_message
        role: role || 'user', // Use provided role or default to 'user'
        used: false, // Add used flag
        created_by: null // Set to null for now since we don't have admin user ID
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation record:', inviteError)
      return res.status(500).json({ 
        message: `Failed to create invitation record: ${inviteError.message}` 
      })
    }

    console.log('Invitation record created:', inviteRecord)

    // Call custom email function
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          companyName,
          invitationLink,
          message: message || null,
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

    res.status(200).json({
      success: true,
      message: `Invitation created successfully for ${email}`,
      invitationLink,
      token: invitationToken
    })

  } catch (error: any) {
    console.error('Send invite API error:', error)
    res.status(500).json({ message: `Failed to process invitation: ${error.message}` })
  }
}
