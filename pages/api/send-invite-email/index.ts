import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Disable SSL certificate verification for development
  // WARNING: Only use this in development, never in production
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  try {
    const { email, companyName, invitationLink, message } = req.body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      supabaseServiceKey: supabaseServiceKey ? 'Set' : 'Missing'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      })
      return res.status(500).json({ message: 'Missing Supabase configuration' })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Skip user existence check for now - let Supabase handle it during invitation

    // Send invitation email using Supabase admin functions
    
    // Use custom redirect URL to ensure it goes to localhost:3000
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        company_name: companyName,
        invitation_link: invitationLink,
        custom_message: message || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      },
      redirectTo: invitationLink // This should force the redirect to your custom link
    })

    if (inviteError) {
        message: inviteError.message,
        status: inviteError.status,
        code: inviteError.code
      })
      
      // If user already exists, provide a helpful message
      if (inviteError.message?.includes('already') || inviteError.message?.includes('exists')) {
        return res.status(200).json({
          success: true,
          message: `User with email ${email} already exists. Please send them this invitation link manually: ${invitationLink}`,
          invitationLink,
          userExists: true
        })
      }
      
      return res.status(500).json({ 
        message: `Failed to send invitation email: ${inviteError.message}` 
      })
    }


    res.status(200).json({
      success: true,
      message: `Invitation email sent successfully to ${email}`,
      invitationLink
    })

  } catch (error: any) {
    res.status(500).json({ message: `Failed to process invitation email: ${error.message}` })
  }
}
