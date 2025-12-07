import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Disable SSL certificate verification for development
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  try {
    const { email, companyName, invitationLink, message } = req.body

    if (!email || !companyName || !invitationLink) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, companyName, invitationLink' 
      })
    }

    // Use shared Supabase client

    // Create admin client
    



    // Check if invitation exists
    const { data: existingInvite, error: inviteCheckError } = await supabase()
      .from('invites')
      .select('*')
      .eq('invited_email', email)
      .single()

    if (inviteCheckError || !existingInvite) {
      console.error('Invitation not found:', inviteCheckError)
      return res.status(404).json({ 
        message: 'No invitation found for this email address' 
      })
    }



    // Send the email using the existing invitation token
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          companyName,
          invitationLink,
          message: message || null,
          token: existingInvite.token
        })
      })

      const emailResult = await emailResponse.json()
      
      if (!emailResponse.ok) {
        console.error('Email function error:', emailResult)
        return res.status(500).json({ 
          message: `Failed to send email: ${emailResult.error || 'Unknown error'}` 
        })
      } else {

      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError)
      return res.status(500).json({ 
        message: `Failed to send email: ${emailError}` 
      })
    }

    // Log the resend activity
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
          action: 'INVITATION_RESENT',
          description: `Invitation resent to ${email}`,
          metadata: {
            invited_email: email,
            company_name: companyName,
            invitation_id: existingInvite.id
          }
        })
      })
    } catch (logError) {
      console.error('Error logging resend activity:', logError)
    }

    res.status(200).json({
      success: true,
      message: `Invitation resent successfully to ${email}`,
      invitationLink
    })

  } catch (error: any) {
    console.error('Resend invite API error:', error)
    res.status(500).json({ message: `Failed to resend invitation: ${error.message}` })
  }
}
