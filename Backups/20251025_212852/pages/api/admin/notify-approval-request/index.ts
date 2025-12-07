import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '@/lib/supabaseClient'




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { userEmail, userName, companyName } = req.body

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' })
    }

    

    // If userName not provided, try to get it from the user's profile
    let displayName = userName
    if (!displayName) {
      try {
        const { data: profile, error: profileError } = await supabase()
          .from('profiles')
          .select('first_name, last_name')
          .eq('email', userEmail)
          .single()
        
        if (!profileError && profile) {
          displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || userEmail
        } else {
          displayName = userEmail
        }
      } catch (error) {

        displayName = userEmail
      }
    }

    // Get all admin users from company_users table
    let adminUsers: { email: string }[] = []
    

    
    const { data: companyAdmins, error: companyError } = await supabase()
      .from('company_users')
      .select('user_id, role')
      .eq('role', 'admin')
    
    if (companyError) {
      console.error('Error fetching admin users from company_users:', companyError)
      return res.status(500).json({ message: 'Failed to fetch admin users' })
    }
    
    if (companyAdmins && companyAdmins.length > 0) {
      // Get email addresses for the admin user IDs
      const adminUserIds = companyAdmins.map((admin: any) => admin.user_id)
      const { data: adminUserData, error: adminUserError } = await supabase().auth.admin.listUsers()
      
      if (!adminUserError && adminUserData && adminUserData.users) {
        adminUsers = adminUserData.users
          .filter((user: any) => adminUserIds.includes(user.id))
          .map((user: any) => ({ email: user.email }))
      }
    }

    if (!adminUsers || adminUsers.length === 0) {

      
      // For testing purposes, use a fallback admin email
      // In production, you would want to ensure there's always at least one admin
      const fallbackAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'

      adminUsers = [{ email: fallbackAdminEmail }]
    }

    // Get the base URL for the admin dashboard link - go to dashboard where pending invitations are displayed
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const adminDashboardUrl = `${baseUrl}/admin/dashboard`

    // Send notification to all admins
    const adminEmails = adminUsers.map(admin => admin.email).filter(Boolean)
    




    // Call the Supabase Edge Function to send emails
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmails,
          userEmail,
          userName: displayName,
          companyName,
          adminDashboardUrl
        })
      })

      const emailResult = await emailResponse.json()
      
      if (!emailResponse.ok) {
        console.error('Email function error:', emailResult)
        // Don't fail the whole process if email fails, just log it

      } else {

      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError)
      // Don't fail the whole process if email fails

    }

    res.status(200).json({
      success: true,
      message: 'Admin notification sent successfully',
      adminEmails: adminEmails,
      adminDashboardUrl
    })

  } catch (error) {
    console.error('Admin notification API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
